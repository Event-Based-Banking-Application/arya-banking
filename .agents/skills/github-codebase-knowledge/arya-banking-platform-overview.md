# Arya Banking Platform — Complete Architecture Overview

> **Organization:** `Event-Based-Banking-Application`  
> **Stack:** Spring Boot 3.5.4 · Spring Cloud 2025.0.0 · Java 17 · MongoDB · Kafka · Keycloak · HashiCorp Vault · Eureka

---

## Table of Contents

1. [Platform Summary](#1-platform-summary)
2. [Repository Map](#2-repository-map)
3. [System Architecture Diagram](#3-system-architecture-diagram)
4. [Service Port Reference](#4-service-port-reference)
5. [How the Repos Fit Together](#5-how-the-repos-fit-together)
6. [Request Lifecycle — End to End](#6-request-lifecycle--end-to-end)
7. [Secrets & Configuration Flow](#7-secrets--configuration-flow)
8. [Authentication & Authorization Model](#8-authentication--authorization-model)
9. [Event-Driven Flow (Kafka)](#9-event-driven-flow-kafka)
10. [Inter-Service Communication (Feign + OAuth2)](#10-inter-service-communication-feign--oauth2)
11. [Infrastructure Stack](#11-infrastructure-stack)
12. [User Registration Flow (Multi-Step)](#12-user-registration-flow-multi-step)
13. [Common Library Role](#13-common-library-role)
14. [Dependency Version Matrix](#14-dependency-version-matrix)
15. [CI/CD Pipeline Overview](#15-cicd-pipeline-overview)
16. [Platform-Wide Observations & Gaps](#16-platform-wide-observations--gaps)

---

## 1. Platform Summary

**Arya Banking** is an event-driven microservices platform modelling the core backend of a digital banking application. It is built around a service mesh of independently deployable Spring Boot services coordinated through Spring Cloud infrastructure (Eureka + Config Server), secured via Keycloak OAuth2/JWT, secrets-managed through HashiCorp Vault, and event-driven via Apache Kafka with Avro schemas.

The platform currently has **9 repositories**, each with a distinct responsibility:

| Repository | Role |
|---|---|
| `arya-banking-common` | Shared library: domain models, exceptions, Kafka config, Avro, utilities |
| `arya-banking-admin-service` | Infrastructure admin: Vault CRUD, Keycloak roles/clients, HCL policies |
| `arya-banking-auth-service` | Authentication: Keycloak user lifecycle, login, JWT issuance |
| `arya-banking-user-service` | User domain: registration, profile, security details |
| `arya-banking-api-gateway` | Single entry point: routing, JWT validation, public/private path rules |
| `arya-banking-service-registry` | Eureka server: service discovery |
| `arya-banking-config-server` | Spring Cloud Config Server: centralized properties from Git |
| `arya-banking-configs` | Git-backed config files consumed by Config Server |
| `arya-banking-infra` | Docker Compose infrastructure: Kafka, Keycloak, Vault, Platform |

---

## 2. Repository Map

```
Event-Based-Banking-Application/
│
├── arya-banking-infra/                  ← Docker Compose infra (run first)
│   ├── compose/
│   │   ├── kafka.yml                    ← Kafka KRaft + Schema Registry + Connect
│   │   ├── keycloak.yml                 ← Keycloak 26 + PostgreSQL 15
│   │   ├── platform.yml                 ← Eureka (service-registry) + Config Server
│   │   └── vault.yml                    ← HashiCorp Vault 1.21
│   └── Makefile                         ← make up / make kafka / make keycloak etc.
│
├── arya-banking-configs/                ← Git config repo (read by config-server)
│   └── application.yml                  ← Shared: Eureka URL, Kafka, MongoDB URI, Gateway routes
│
├── arya-banking-service-registry/       ← Eureka Server (port 8761)
├── arya-banking-config-server/          ← Spring Cloud Config Server (port 8090)
│
├── arya-banking-api-gateway/            ← Spring Cloud Gateway (port 8085)
│
├── arya-banking-auth-service/           ← Auth service (port 8087)
├── arya-banking-user-service/           ← User service (port 8086)
├── arya-banking-admin-service/          ← Admin service (port 8089)
│
└── arya-banking-common/                 ← Shared library (GitHub Packages, v1.1.9)
```

---

## 3. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CLIENT (Browser / Mobile / Postman)            │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │  HTTP
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    arya-banking-api-gateway  :8085                      │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Spring Cloud Gateway (WebFlux / Reactive)                       │   │
│  │  SecurityWebFilterChain: JWT validation via Keycloak JWK Set     │   │
│  │  Permitted: /api/users/register, /api/auth/authenticate          │   │
│  │  Protected: everything else (requires valid JWT)                 │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└──────┬────────────────────┬──────────────────────┬──────────────────────┘
       │                    │                       │
       ▼                    ▼                       ▼
┌────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ user-      │    │ auth-service     │    │ admin-service    │
│ service    │    │ :8087            │    │ :8089            │
│ :8086      │    │                  │    │                  │
│            │    │ • Keycloak user  │    │ • Vault CRUD     │
│ • Register │    │   registration   │    │ • Keycloak       │
│ • Get user │    │ • Authenticate   │    │   roles/clients  │
│ • Update   │◄───┤ • Internal       │    │ • HCL policies   │
│ • Security │    │   /register/     │    │                  │
│   details  │    │   users (Feign)  │    │                  │
└─────┬──────┘    └──────────────────┘    └──────────────────┘
      │
      │ Kafka (user.create.event / audit.event)
      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Apache Kafka  :9092 (KRaft)                          │
│                    Schema Registry  :8081                               │
└─────────────────────────────────────────────────────────────────────────┘

──────────── Infrastructure (All services consume these) ────────────────

┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐
│ service-registry │  │ config-server    │  │ HashiCorp Vault  :8091   │
│ Eureka  :8761    │  │ :8090            │  │ KV v2 secrets            │
│                  │  │ Git-backed:      │  │ AppRole auth             │
│ Service          │  │ arya-banking-    │  │                          │
│ discovery for    │  │ configs repo     │  │                          │
│ all services     │  │                  │  │                          │
└──────────────────┘  └──────────────────┘  └──────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  Keycloak  :5433  (backed by PostgreSQL  :5432)                      │
│  Realm: event-based-banking-application                              │
│  Clients: admin-service-client, auth-service-client,                │
│           user-service-client, banking-service-client (gateway)     │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  MongoDB Atlas  (cloud)                                               │
│  Databases: user-service, auth, admin-service                        │
│  Collections: user, registration_progress, security_details,         │
│               user_credentials, role, audit, tableMetaData           │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 4. Service Port Reference

| Service | Port | Protocol | Notes |
|---|---|---|---|
| `arya-banking-api-gateway` | **8085** | HTTP (Reactive/WebFlux) | Single entry point for all clients |
| `arya-banking-user-service` | **8086** | HTTP (Servlet/MVC) | |
| `arya-banking-auth-service` | **8087** | HTTP (Servlet/MVC) | |
| `arya-banking-admin-service` | **8089** | HTTP (Servlet/MVC) | |
| `arya-banking-config-server` | **8090** | HTTP | Config Server |
| `arya-banking-service-registry` | **8761** | HTTP | Eureka Dashboard |
| HashiCorp Vault | **8091** | HTTP (→ 8200 inside Docker) | TLS disabled (dev mode) |
| Kafka | **9092** | PLAINTEXT | External; 29092 internal Docker |
| Schema Registry | **8081** | HTTP | Avro schema management |
| Kafka Connect | **8082** | HTTP | Connector REST API |
| Keycloak | **5433** | HTTP (→ 8080 inside Docker) | Admin console + token endpoint |
| PostgreSQL (Keycloak DB) | **5432** | TCP | |

---

## 5. How the Repos Fit Together

### Startup Order

```
1. arya-banking-infra  (make up)
   ├── Kafka + Schema Registry
   ├── Keycloak + PostgreSQL
   ├── HashiCorp Vault       ← unseal manually after first boot
   └── service-registry + config-server

2. arya-banking-admin-service  (first microservice up)
   └── Used to provision Vault secrets + AppRoles + Keycloak clients

3. arya-banking-auth-service
4. arya-banking-user-service
5. arya-banking-api-gateway
```

### Config Resolution Chain

```
Any microservice startup
        │
        ├─► 1. bootstrap.yml  ──► Vault AppRole auth
        │                         └── Loads secret/arya-banking/{service}/dev
        │                              e.g. MONGO.PASSWORD, *.CLIENT.SECRET
        │
        └─► 2. application.yaml ──► import configserver:http://localhost:8090
                                      │
                                      └── Config Server fetches from:
                                           https://github.com/.../arya-banking-configs
                                                └── application.yml
                                                     (Eureka URL, Kafka, MongoDB URI, Gateway routes)
```

### Shared Library Chain

```
arya-banking-common (GitHub Packages)
        │
        ├── Used by: admin-service, auth-service, user-service
        │
        ├── Provides:
        │    ├── Domain models (User, SecurityDetails, RegistrationProgress, ...)
        │    ├── Exception hierarchy (GlobalException + all subtypes)
        │    ├── GlobalExceptionHandler (@RestControllerAdvice)
        │    ├── Kafka configuration (KafkaConfiguration)
        │    ├── Feign configuration (FeignConfiguration + FeignClientErrorDecoder)
        │    ├── OAuth2 client config (OAuth2ClientConfig)
        │    ├── MongoDB converters (LocalDateTime ↔ Date)
        │    ├── Avro schemas (UserCreateEvent, AuditEvent)
        │    └── Utilities (CommonUtils, MetaDataUtils)
        │
        └── NOT used by: api-gateway, service-registry, config-server
```

---

## 6. Request Lifecycle — End to End

### Example: User Login

```
1. Client → POST /api/auth/authenticate?username=X&password=Y
           (Gateway: path matches /api/auth/**, permitted without JWT)

2. Gateway → routes to auth-service:8087/api/auth/authenticate

3. auth-service:
   a. Builds form-data POST with client_id, client_secret, grant_type=password
   b. Calls Keycloak token endpoint: http://localhost:5433/realms/.../token
   c. On 401: calls user-service via Feign (OAuth2 bearer token injected)
              → PUT /internal/api/security-details/{username}?loginFailed=true
              → SecurityDetailsService increments loginFailedAttempts
              → If ≥5 attempts: disables Keycloak user + sets BLOCKED in MongoDB
   d. Returns JWT access_token to client

4. Client stores JWT and uses it for all subsequent requests
```

### Example: Get User by ID (authenticated)

```
1. Client → GET /api/users/{userId}  + Bearer <JWT>

2. Gateway:
   a. Validates JWT signature via Keycloak JWK Set URI
   b. Routes to user-service:8086/api/users/{userId}

3. user-service:
   a. Security filter validates JWT again (resource server)
   b. UserController → UserService.getUserById(userId)
   c. UserRepository.findByUserId(userId) → MongoDB
   d. Returns User document
```

---

## 7. Secrets & Configuration Flow

### Vault Secret Paths

| Service | Vault Path | What's stored |
|---|---|---|
| `admin-service` | `secret/arya-banking/admin-service/dev` | `keycloak.client-secret`, etc. |
| `auth-service` | `secret/arya-banking/auth-service/dev` | `AUTH.SERVICE.CLIENT.SECRET`, `ARYA.BANKING.AUTH.CLIENT.SECRET` |
| `user-service` | `secret/arya-banking/user-service/dev` | `MONGO.PASSWORD`, `USER.SERVICE.CLIENT.SECRET` |

### AppRole Credentials (per service)

Each service has its own Vault AppRole. The `role-id` and `secret-id` are currently stored directly in `bootstrap.yml` — a dev-time convenience that needs to be externalized for production.

| Service | Vault KV App Name |
|---|---|
| admin-service | `arya-banking/admin-service` |
| auth-service | `arya-banking/auth-service` |
| user-service | `arya-banking/user-service` |

### How `MONGO.PASSWORD` reaches MongoDB

```
Vault secret (secret/arya-banking/user-service/dev)
    key: MONGO.PASSWORD → value: <actual password>
            │
            ▼ (Spring Cloud Vault KV source)
spring.application.mongo-password = <password>
            │
            ▼ (application.yaml)
spring.data.mongodb.uri = mongodb+srv://admin:${spring.application.mongo-password}
                          @bankingcluster.../user-service?...
```

---

## 8. Authentication & Authorization Model

### Keycloak Realm

**Realm:** `event-based-banking-application`

| Client | Grant Type | Used By | Purpose |
|---|---|---|---|
| `banking-service-client` | `authorization_code` | API Gateway | Browser-facing login flow |
| `auth-service-client` | `client_credentials` | auth-service | Feign inter-service calls |
| `user-service-client` | `client_credentials` | user-service | Feign inter-service calls |
| `admin-service-client` | `client_credentials` | admin-service | Keycloak Admin API |
| `arya-banking-auth-client` | `password` (ROPC) | auth-service | Direct username/password login |
| `INTERNAL_SERVICE` | _(Keycloak role)_ | All services | Service-to-service auth |

### JWT Role Extraction

All services share the same converter pattern — extract `realm_access.roles` from Keycloak JWT and prefix with `ROLE_`:

```java
// Present in: admin-service, auth-service, user-service, api-gateway
Map<String, Object> realmAccess = jwt.getClaim("realm_access");
roles.stream().map(role -> "ROLE_" + role)
```

### Security Rules by Service

| Service | Public Paths | Internal Paths | Admin-only |
|---|---|---|---|
| `api-gateway` | `/api/users/register`, `/api/auth/authenticate` | `/internal/**` → ROLE_INTERNAL_SERVICE | — |
| `auth-service` | `/api/auth/authenticate` | `/internal/**` → ROLE_INTERNAL_SERVICE | — |
| `user-service` | `/api/**` (currently all permitted!) | `/internal/**` → ROLE_INTERNAL_SERVICE | — |
| `admin-service` | — | `/internal/**` → ROLE_INTERNAL_SERVICE | All `/api/admin/**` → ROLE_ADMIN |

> ⚠️ **user-service** has `.requestMatchers("/api/**").permitAll()` — all user APIs are unauthenticated. This appears to be intentional during development (APIs validated before security is layered on) but needs hardening.

---

## 9. Event-Driven Flow (Kafka)

### Topics

| Topic | Producer | Consumer (planned) | Avro Schema |
|---|---|---|---|
| `user.create.event` | user-service (`UserCreateProducer`) | TBD (notification, audit) | `UserCreateEvent` |
| `audit.event` | TBD | TBD | `AuditEvent` |

### `UserCreateEvent` Schema

```json
{ "type": "record", "name": "UserCreateEvent",
  "fields": [
    { "name": "userId",            "type": "string" },
    { "name": "status",            "type": "string" },
    { "name": "isEmailVerified",   "type": "boolean", "default": false },
    { "name": "isContactVerified", "type": "boolean", "default": false }
  ]
}
```

### When Events Are Published (user-service)

| Trigger | Status in Event |
|---|---|
| Step 1 complete (basic details) | `BASIC_DETAILS_ADDITION_COMPLETED` |
| Step 2 complete (address added) | `ADDRESS_ADDED` |
| Step 3 complete (security questions) | `SECURITY_CREDENTIALS_ADDED` |
| User blocked (5 failed logins) | `BLOCKED` |
| Any user update | Current `user.status` |

---

## 10. Inter-Service Communication (Feign + OAuth2)

### Service → Service Calls

```
user-service ──(Feign)──► auth-service
  Interface: org.arya.banking.user.external.KeyCloakService
  Endpoint:  POST /internal/api/auth/register/users
  Used when: User registers → needs Keycloak user created
  Auth:      OAuth2 client_credentials (user-service-client)

auth-service ──(Feign)──► user-service
  Interface: org.arya.banking.auth.external.UserService
  Endpoint:  PUT /internal/api/security-details/{userId}?loginFailed=true
  Used when: Login fails → increment failed attempt counter
  Auth:      OAuth2 client_credentials (auth-service-client)
```

### OAuth2 Feign Interceptor Pattern (both services use same pattern)

```java
// OAuth2FeignConfig (both auth-service and user-service)
@Bean
public RequestInterceptor oauth2RequestInterceptor() {
    return requestTemplate -> {
        OAuth2AuthorizeRequest request = OAuth2AuthorizeRequest
            .withClientRegistrationId(clientRegistrationId)
            .principal(clientRegistrationId).build();
        OAuth2AuthorizedClient client = authorizedClientManager.authorize(request);
        requestTemplate.header(AUTHORIZATION, "Bearer " + client.getAccessToken().getTokenValue());
    };
}
```

The outgoing Feign request carries a machine-to-machine JWT, accepted at the target service via `ROLE_INTERNAL_SERVICE` check (the `INTERNAL_SERVICE` Keycloak realm role is assigned to service account users).

---

## 11. Infrastructure Stack

### `arya-banking-infra` — Compose Files

All compose files share the external network `arya-banking-net`. The `Makefile` is the primary operator interface.

#### `compose/kafka.yml`
- Kafka (KRaft mode, single broker+controller, Cluster ID `383d9e96-...`)
- Schema Registry (backward compatibility)
- Kafka Connect (REST API on 8082)
- Network: `arya-banking-net`

#### `compose/keycloak.yml`
- PostgreSQL 15 (Keycloak persistence, port 5432)
- Keycloak 26.0.2 — `start-dev` mode, Argon2id password hashing (64MB memory, 3 iterations)
- Port mapping: `5433 → 8080`
- Data persisted to `./keycloak-data` (gitignored)

#### `compose/platform.yml`
- `karthikulkarni/arya-banking-service-registry:latest` (port 8761)
- `karthikulkarni/arya-banking-config-server:latest` (port 8090)
- Both on `arya-banking-net`

#### `compose/vault.yml`
- HashiCorp Vault 1.21
- Port mapping: `8091 → 8200`
- File storage backend at `/vault/data`
- Config: `vault/config/vault.hcl` (UI enabled, TLS disabled)

#### `Makefile` Targets

| Target | Action |
|---|---|
| `make up` | Create network + start all stacks |
| `make down` | Stop all stacks |
| `make kafka` | Start Kafka stack only |
| `make keycloak` | Start Keycloak stack only |
| `make platform` | Start Eureka + Config Server only |
| `make vault` | Start Vault only |
| `make clean` | Down + remove volumes + orphans |

---

## 12. User Registration Flow (Multi-Step)

The user-service implements a 3-step registration tracked via `RegistrationProgress` in MongoDB.

```
Step 1: POST /api/users/register (via gateway)
  ├── Validate no duplicate email/phone
  ├── Create User document in MongoDB
  ├── Call auth-service (Feign): POST /internal/api/auth/register/users
  │     └── Keycloak user created with username = generated userId
  ├── Save RegistrationProgress { status: REGISTRATION_IN_PROGRESS,
  │                               subStatus: BASIC_DETAILS_ADDITION_COMPLETED,
  │                               nextStep: ADD_SECURITY_DETAILS }
  ├── Save SecurityDetails { loginFailedAttempts: 0, twoFactorEnabled: false }
  └── Publish UserCreateEvent { status: BASIC_DETAILS_ADDITION_COMPLETED }

Step 2: PUT /api/users/{userId} (with updateAddressDto)
  ├── Add address to user document
  ├── UserValidator detects registration level 2
  ├── Save RegistrationProgress { subStatus: ADDRESS_ADDED,
  │                               nextStep: ADD_SECURITY_CREDENTIALS }
  └── Publish UserCreateEvent { status: ADDRESS_ADDED }

Step 3: PUT /api/security-details/{userId} (with securityQuestions)
  ├── Update SecurityDetails.securityQuestions
  ├── UserValidator detects security questions are set → level 3
  ├── Save RegistrationProgress { status: REGISTRATION_COMPLETE,
  │                               subStatus: SECURITY_CREDENTIALS_ADDED }
  └── Publish UserCreateEvent { status: SECURITY_CREDENTIALS_ADDED }
```

**userId Generation:**
```java
"ARYA" + SHA256(firstName + lastName + System.currentTimeMillis()).substring(0, 6).toUpperCase()
// e.g. ARYA3F9A12
```

---

## 13. Common Library Role

`arya-banking-common` is the **single source of truth** for everything shared across services. It is published to GitHub Packages and versioned independently.

```
arya-banking-common v1.1.9
│
├── Domain Models → used directly in service MongoDB repositories
│   └── User, SecurityDetails, RegistrationProgress, Role, Audit, ...
│
├── Exception Hierarchy → GlobalExceptionHandler is scanned by
│   all services via @ComponentScan("org.arya.banking.common")
│
├── Kafka Config → KafkaConfiguration bean (conditional on
│   spring.kafka.bootstrap-servers being present)
│
├── OAuth2ClientConfig → provides OAuth2AuthorizedClientManager
│   bean for inter-service Feign interceptors
│
├── FeignConfiguration → error decoder wired into all Feign clients
│
├── Avro Classes → generated from .avsc schemas at compile time;
│   UserCreateEvent used directly in UserCreateProducer
│
└── Utilities → CommonUtils (isEmpty, SHA256), MetaDataUtils (versioning)
```

**Version note:** auth-service and user-service use `arya-banking-common:1.1.7`, while admin-service uses `1.1.9`. There may be missing constants or types in the older version.

---

## 14. Dependency Version Matrix

| Component | Version | Notes |
|---|---|---|
| Spring Boot | `3.5.4` | All services |
| Spring Cloud | `2025.0.0` | All services |
| Java | `17` | All services |
| `arya-banking-common` | `1.1.9` (admin), `1.1.7` (auth, user) | Version drift |
| Keycloak Admin Client | `26.0.4` | admin-service, auth-service |
| Keycloak (Docker) | `26.0.2` | infra/keycloak.yml |
| HashiCorp Vault (Docker) | `1.21` | infra/vault.yml |
| MapStruct | `1.5.5.Final` | admin-service, user-service |
| Lombok | `1.18.36` | All services |
| Avro | `1.11.4` | common, admin-service, user-service |
| SpringDoc OpenAPI | `2.8.9` | admin-service, user-service |
| JaCoCo | `0.8.13` | All services |
| SpotBugs | `4.8.6.1` | Most services |
| Apache HttpClient5 | (default) | auth-service RestTemplate pool |
| PostgreSQL (Docker) | `15` | infra/keycloak.yml |
| Confluent Kafka | `latest` | infra/kafka.yml |

---

## 15. CI/CD Pipeline Overview

All microservice repos share the same 3-workflow structure, delegating to shared workflows in `arya-banking-workflows`.

### Per-Repository Workflows

```
.github/workflows/
├── deploy.yml               ← Push to master → build + deploy to GitHub Packages + git tag
├── sonar-report.yml         ← Push/PR → SonarCloud analysis
└── auto-create-issues.yaml  ← Manual → create GitHub Issues from issues.json
```

### `deploy.yml` Flow (all services)

```
push to master
    │
    ├─► Setup Java 17 (Temurin)
    ├─► Cache ~/.m2
    ├─► mvn clean deploy -s settings.xml  (GH_PAT for GitHub Packages)
    ├─► Extract version from pom.xml
    └─► git tag  v{version}  + push tag
```

### Required Secrets (per repo)

| Secret | Purpose |
|---|---|
| `GH_PAT` | Read `arya-banking-common` from GitHub Packages + push tags |
| `SONAR_TOKEN` | SonarCloud authentication |
| `SONAR_PROJECT_KEY` | SonarCloud project identifier |
| `SONAR_ORG` | SonarCloud organization key |
| `ORG_ISSUE_TOKEN` | Auto-create GitHub Issues |

### `user-service` additionally has:

- `delete-all-issues.yaml` — bulk deletes all issues + milestones via GitHub API (Python script, requires confirmation input `DELETE-ALL-ISSUES`)

---

## 16. Platform-Wide Observations & Gaps

### Security

| Gap | Location | Severity |
|---|---|---|
| `DELETE /api/admin/vault-secrets` missing `@PreAuthorize` | admin-service | High |
| All `/api/**` in user-service are `permitAll()` | user-service SecurityConfig | High |
| AppRole credentials hardcoded in `bootstrap.yml` | admin, auth, user service | Medium |
| `banking-service-client` secret hardcoded in gateway `application.yaml` | api-gateway | Medium |
| `user-service` uses `arya-banking-common:1.1.7` not `1.1.9` | user-service pom.xml | Low |

### Missing Implementations

| Feature | Status | Notes |
|---|---|---|
| Kafka consumers | Not implemented | Producers exist in user-service; no consumers defined anywhere |
| Spring Batch jobs | Declared, not used | Dependency in admin, user, auth service pom.xml |
| Unit / integration tests | Stub only | All test files are empty context-load stubs |
| Audit event publishing | Schema defined | `AuditEvent.avsc` exists but nothing publishes to `audit.event` |
| Admin user management APIs | Planned | In `issues.json`: list users, block/unblock, stats |

### Config Server

- `application.yaml` in `arya-banking-config-server` has a typo: `localhosat:8761` in Eureka URL — config server won't register with Eureka correctly.

### Architectural Strengths

- Clean separation of concerns across all 9 repos
- Consistent patterns: same security config, same OAuth2 Feign interceptor, same Vault bootstrap in every service
- `arya-banking-common` significantly reduces code duplication
- Operation-based RBAC (admin-service) makes role changes a config-only update
- Vault HCL policies as classpath resources — policy-as-code, version-controlled
- `Makefile` for infra is clean and ergonomic
