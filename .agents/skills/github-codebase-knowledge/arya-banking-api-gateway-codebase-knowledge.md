# Arya Banking API Gateway
## Codebase Knowledge Document

| Field | Value |
|---|---|
| Repository | `arya-banking-api-gateway` |
| Artifact ID | `arya-banking-api-gateway` |
| Group ID | `org.arya.banking` |
| Version | `1.0.0` |
| Java | 17 |
| Spring Boot | `3.5.4` |
| Spring Cloud | `2025.0.0` |
| Port | `8085` |
| License | Apache 2.0 |
| Developer | Karthik Kulkarni |

---

## 1. Overview

`arya-banking-api-gateway` is the **single entry point** for all external and internal HTTP traffic in the Arya Banking platform. Built on Spring Cloud Gateway (WebFlux/reactive), it performs three core functions:

| Function | Mechanism |
|---|---|
| **Request routing** | Path-predicate-based routing to downstream microservices |
| **JWT authentication** | OAuth2 Resource Server validating JWTs issued by Keycloak |
| **Access control** | Route-level authorization — public, authenticated, and internal-only paths |

It also registers with Eureka and participates in OAuth2 client flows, meaning it can both *validate* tokens (resource server) and *initiate* OAuth2 authorization code flows (OAuth2 client).

---

## 2. Repository Structure

```
arya-banking-api-gateway/
├── src/
│   ├── main/
│   │   ├── java/org/arya/banking/api/gateway/
│   │   │   ├── AryaBankingApiGatewayApplication.java   ← Entry point
│   │   │   └── config/
│   │   │       └── SecurityConfig.java                 ← WebFlux security + JWT config
│   │   └── resources/
│   │       └── application.yaml                        ← Routes, OAuth2, Eureka config
│   └── test/
│       └── AryaBankingApiGatewayApplicationTests.java  ← Context test (disabled)
├── .github/
│   ├── issues.json                                     ← Empty (auto-issue template)
│   └── workflows/
│       ├── auto-create-issues.yaml                     ← Delegates to shared workflow
│       └── sonar-report.yml                            ← SonarCloud via shared workflow
├── docker-compose.yaml                                 ← Legacy Kafka dev stack (GHCR images)
├── pom.xml
├── settings.xml                                        ← GitHub Packages auth
├── add-secrets.sh                                      ← Helper to set repo secrets via gh CLI
└── .gitignore
```

---

## 3. Source File Deep-Dives

### 3.1 AryaBankingApiGatewayApplication.java

```java
@SpringBootApplication
@EnableDiscoveryClient
public class AryaBankingApiGatewayApplication {
    public static void main(String[] args) {
        SpringApplication.run(AryaBankingApiGatewayApplication.class, args);
    }
}
```

| Annotation | Effect |
|---|---|
| `@SpringBootApplication` | Bootstraps Spring context with auto-configuration and component scanning |
| `@EnableDiscoveryClient` | Registers the gateway with Eureka so other services can discover it, and enables Eureka-based load-balanced routing (e.g., `lb://service-name` URIs) |

> **Design Note:** The gateway currently uses hardcoded `http://localhost:{port}` URIs in routes rather than Eureka service names (`lb://arya-banking-user-service`). Adding `@EnableDiscoveryClient` lays the groundwork for migrating to load-balanced service discovery routing — a recommended next step.

---

### 3.2 SecurityConfig.java

```java
@Configuration
@EnableWebFluxSecurity
public class SecurityConfig {

    @Bean
    public SecurityWebFilterChain securityFilterChain(ServerHttpSecurity serverHttpSecurity) {

        serverHttpSecurity
            .authorizeExchange(authorize -> authorize
                .pathMatchers("/api/users/register", "/api/auth/authenticate").permitAll()
                .pathMatchers("/internal/**").hasAuthority("ROLE_INTERNAL_SERVICE")
                .anyExchange().authenticated())
            .csrf(ServerHttpSecurity.CsrfSpec::disable)
            .oauth2ResourceServer(oauth -> oauth.jwt(Customizer.withDefaults()));

        return serverHttpSecurity.build();
    }
}
```

**`@EnableWebFluxSecurity`** — critical distinction from `@EnableWebSecurity`. Spring Cloud Gateway is **reactive** (built on Spring WebFlux / Netty). Standard servlet-based `@EnableWebSecurity` does not work here. All security config must use `ServerHttpSecurity`, not `HttpSecurity`.

#### Authorization Rules

| Pattern | Rule | Who Can Access |
|---|---|---|
| `/api/users/register` | `permitAll()` | Anyone — new user registration is public |
| `/api/auth/authenticate` | `permitAll()` | Anyone — login endpoint is public |
| `/internal/**` | `hasAuthority("ROLE_INTERNAL_SERVICE")` | Only tokens with `ROLE_INTERNAL_SERVICE` authority (service-to-service calls) |
| `anyExchange()` | `authenticated()` | Any valid JWT — all other routes require authentication |

#### CSRF

Disabled with `csrf(ServerHttpSecurity.CsrfSpec::disable)`. This is appropriate for a stateless API gateway that validates JWTs rather than managing session cookies. CSRF protection is only relevant for session-based auth.

#### JWT Validation

```java
.oauth2ResourceServer(oauth -> oauth.jwt(Customizer.withDefaults()))
```

`Customizer.withDefaults()` tells Spring Security to auto-configure JWT decoding using the `jwk-set-uri` defined in `application.yaml`. The gateway fetches Keycloak's public keys from:
```
http://localhost:5433/realms/event-based-banking-application/protocol/openid-connect/certs
```
and validates all incoming JWT signatures against them. **No shared secret** — this uses asymmetric RS256/EC key validation.

---

### 3.3 application.yaml

```yaml
server:
  port: 8085

app:
  config:
    keycloak:
      url: http://localhost:5433/
      realm: event-based-banking-application

eureka:
  client:
    service-url:
      defaultZone: http://localhost:8761/eureka

spring:
  application:
    name: arya-banking-api-gateway

  security:
    oauth2:
      client:
        provider:
          keycloak:
            token-uri: ...
            authorization-uri: ...
            jwk-set-uri: ...
            user-info-uri: ...
            user-name-attribute: preferred_username
        registration:
          banking-service-client:
            provider: keycloak
            client-id: banking-service-client
            client-secret: FMrBssX0Lk92Uwep4zQitLIRChUfffGs
            authorization-grant-type: authorization_code
            redirect-uri: ...
            scope: openid

      resourceserver:
        jwt:
          jwk-set-uri: ...

  cloud:
    gateway:
      routes:
        - id: user-service     ...
        - id: auth-service-external ...
        - id: auth-service-internal ...
        - id: admin-service    ...
```

---

## 4. Configuration Deep-Dive

### 4.1 Keycloak Properties

```yaml
app:
  config:
    keycloak:
      url: http://localhost:5433/
      realm: event-based-banking-application
```

These two base properties are used to compose all OAuth2 endpoints via Spring's `${...}` placeholder chaining — changing `url` or `realm` propagates to all derived URIs automatically.

| Derived Property | Full URL |
|---|---|
| `token-uri` | `http://localhost:5433/realms/event-based-banking-application/protocol/openid-connect/token` |
| `authorization-uri` | `http://localhost:5433/realms/event-based-banking-application/protocol/openid-connect/auth` |
| `user-info-uri` | `http://localhost:5433/realms/event-based-banking-application/protocol/openid-connect/userinfo` |
| `jwk-set-uri` | `http://localhost:5433/realms/event-based-banking-application/protocol/openid-connect/certs` |

> ⚠️ **Port `5433`:** Keycloak runs on `5433` on the host (mapped from internal `8080`) as defined in `arya-banking-infra/compose/keycloak.yml`. This is the non-standard port to avoid conflicting with local PostgreSQL (5432).

### 4.2 OAuth2 Client Registration

```yaml
registration:
  banking-service-client:
    provider: keycloak
    client-id: banking-service-client
    client-secret: FMrBssX0Lk92Uwep4zQitLIRChUfffGs
    authorization-grant-type: authorization_code
    redirect-uri: ${app.config.keycloak.url}/login/oauth2/code/keycloak
    scope: openid
```

| Field | Value | Notes |
|---|---|---|
| `client-id` | `banking-service-client` | Must match the client ID configured in Keycloak realm |
| `client-secret` | `FMrBssX0Lk92Uwep4zQitLIRChUfffGs` | ⚠️ **Hardcoded plaintext secret** — must be moved to Vault/env var |
| `authorization-grant-type` | `authorization_code` | Standard browser-redirect OAuth2 flow |
| `redirect-uri` | `${keycloak.url}/login/oauth2/code/keycloak` | Callback URL — must be registered in Keycloak client settings |
| `scope` | `openid` | Requests an ID token in addition to the access token |

> **Dual OAuth2 role:** The gateway acts as both an **OAuth2 Client** (initiates authorization code flows for browser-based login) and an **OAuth2 Resource Server** (validates incoming JWTs on every API request). These are two separate Spring Security configurations that coexist via `spring.security.oauth2.client.*` and `spring.security.oauth2.resourceserver.*`.

### 4.3 Gateway Routes

Routes are currently defined in `application.yaml`. In production these are overridden by `arya-banking-configs/application.yml` via the Config Server (which has the same route definitions under the `spring.cloud.gateway.server.webflux.routes` key).

> ⚠️ **Key mismatch:** The local `application.yaml` uses `spring.cloud.gateway.routes` (old key), while `arya-banking-configs/application.yml` uses `spring.cloud.gateway.server.webflux.routes` (new Spring Cloud 2025.x key). When loaded from the config server, the new key takes precedence. For local dev without config server, the old key applies. Both currently work but this inconsistency should be resolved.

| Route ID | URI | Path Predicates | Auth Required |
|---|---|---|---|
| `user-service` | `http://localhost:8086` | `/api/users/**`, `/api/security-details/**` | Yes (except `/api/users/register`) |
| `auth-service-external` | `http://localhost:8087` | `/api/auth/**` | Yes (except `/api/auth/authenticate`) |
| `auth-service-internal` | `http://localhost:8087` | `/internal/api/auth/**` | `ROLE_INTERNAL_SERVICE` only |
| `admin-service` | `http://localhost:8089` | `/api/admin/**` | Yes (any authenticated JWT) |

> **`/internal/**` path:** These routes are for service-to-service calls only. The `hasAuthority("ROLE_INTERNAL_SERVICE")` check in `SecurityConfig` means the calling service must present a JWT containing the `ROLE_INTERNAL_SERVICE` authority — this role must be configured in Keycloak and included in the service account's token.

### 4.4 Eureka Registration

```yaml
eureka:
  client:
    service-url:
      defaultZone: http://localhost:8761/eureka
```

The gateway registers itself as `arya-banking-api-gateway` in Eureka. Other microservices can use this name as a reference, but the gateway's primary role is as a client of downstream services (which it currently addresses via hardcoded URIs rather than Eureka service names).

---

## 5. Maven Build (pom.xml)

### 5.1 Coordinates

| POM Field | Value |
|---|---|
| `groupId` | `org.arya.banking` |
| `artifactId` | `arya-banking-api-gateway` |
| `version` | `1.0.0` |
| Parent | `spring-boot-starter-parent : 3.5.4` |
| Spring Cloud BOM | `spring-cloud-dependencies : 2025.0.0` |

### 5.2 Dependency Table

| Dependency | Scope | Purpose |
|---|---|---|
| `spring-cloud-starter-gateway` | compile | Core Spring Cloud Gateway (WebFlux-based reactive proxy) |
| `spring-boot-starter-oauth2-client` | compile | OAuth2 authorization code client for browser-based login flows |
| `spring-boot-starter-oauth2-resource-server` | compile | JWT validation for incoming requests |
| `spring-cloud-starter-netflix-eureka-client` | compile | Service discovery registration and client-side load balancing |
| `spring-boot-starter-actuator` | compile | Health, metrics, and info endpoints |
| `spring-boot-devtools` | runtime/optional | Hot reload in local dev |
| `spring-boot-starter-test` | test | JUnit 5 + Spring Test |

> **Notable absence:** `arya-banking-common` is **not** a dependency of the gateway. The gateway does not directly use domain models (`User`, `Role`, etc.) or the shared Kafka config. It is purely a routing/security layer. This is the correct design.

> **`spring-cloud-starter-gateway` vs `spring-cloud-starter-gateway-mvc`:** The gateway uses the reactive WebFlux version (not the newer MVC version introduced in Spring Cloud 2023.x). This means all security config must use `ServerHttpSecurity` and `SecurityWebFilterChain` — standard `HttpSecurity` will not work.

### 5.3 Build Plugins

| Plugin | Version | Purpose |
|---|---|---|
| `jacoco-maven-plugin` | `0.8.13` | Code coverage for SonarCloud (`target/site/jacoco/jacoco.xml`) |
| `spring-boot-maven-plugin` | from parent | Fat JAR + Paketo buildpack image support |
| `maven-compiler-plugin` | `3.10.1` | Java 17, Lombok annotation processor (`1.18.36`) pre-wired |
| `spotbugs-maven-plugin` | `4.8.6.1` | Static bug analysis |

> **Lombok in compiler plugin but not in dependencies:** The annotation processor path for Lombok is configured, but Lombok is not declared as a `<dependency>`. This will cause compilation failures if any class tries to use `@Data`, `@Builder`, etc. Add `lombok` as a `provided` dependency if Lombok annotations are needed.

### 5.4 SonarCloud Coverage Exclusions

```
**/config/**, **/dto/**, **/constants/**, **/mapper/**,
**/repository/**, **/model/**, **/metadata/**, **/exception/**,
**/*Application.java
```

Currently only `SecurityConfig.java` and `AryaBankingApiGatewayApplication.java` exist — both are excluded. The gateway has **zero code under coverage measurement** at this time.

---

## 6. CI/CD Workflows

### 6.1 sonar-report.yml — SonarCloud via Shared Workflow

Unlike `arya-banking-common` which has its own inline SonarCloud steps, the gateway **delegates to a reusable workflow** in `arya-banking-workflows`:

```yaml
jobs:
  check-secrets:         # Validates SONAR_TOKEN, SONAR_PROJECT_KEY, SONAR_ORG exist first
  sonarcloud:
    needs: check-secrets
    uses: Event-Based-Banking-Application/arya-banking-workflows/.github/workflows/sonar-report.yml@main
    secrets:
      SONAR_TOKEN: ...
      SONAR_PROJECT_KEY: ...
      SONAR_ORG: ...
      GH_PAT: ...        # Needed to pull arya-banking-common from GitHub Packages
```

**Improvement over `arya-banking-common`'s workflow:**
- Explicit secret validation step before running analysis (fail-fast with clear error messages)
- Delegates to centralised shared workflow — changes to the analysis process only need to be made in one place
- Passes `GH_PAT` — needed because the gateway's `pom.xml` depends on `arya-banking-common` from GitHub Packages

**Trigger:** All branch pushes and pull requests.

### 6.2 auto-create-issues.yaml — Automated Issue Creation

```yaml
on:
  workflow_dispatch:

jobs:
  create-issues:
    uses: Event-Based-Banking-Application/arya-banking-workflows/.github/workflows/issue-creation.yaml@main
    secrets:
      gh_token: ${{ secrets.ORG_ISSUE_TOKEN }}

  show-results:
    needs: create-issues
    steps:
      - name: Display Results
        run: |
          echo "Services Processed: ${{ needs.create-issues.outputs.services_count }}"
          echo "Issues Created: ${{ needs.create-issues.outputs.issues_created }}"
          echo "Milestones Created: ${{ needs.create-issues.outputs.milestones_created }}"
```

A manual-trigger workflow that calls the `arya-banking-workflows` shared issue creation workflow. It auto-detects services and creates GitHub issues + milestones for the project board. The `issues.json` file (currently empty) is likely the input manifest for issue templates.

**Required secret:** `ORG_ISSUE_TOKEN` — a GitHub token with `issues:write` scope across the org.

---

## 7. add-secrets.sh

```bash
# Usage
./add-secrets.sh <repo-name>

# Sets three secrets on the target repo:
gh secret set SONAR_TOKEN       --repo "Event-Based-Banking-Application/<repo>" --body "$SONAR_TOKEN"
gh secret set SONAR_PROJECT_KEY --repo "Event-Based-Banking-Application/<repo>" --body "$SONAR_PROJECT_KEY"
gh secret set SONAR_ORG         --repo "Event-Based-Banking-Application/<repo>" --body "$SONAR_ORG"
```

A developer utility script for bootstrapping SonarCloud secrets on a new repo. Requires the `gh` CLI to be authenticated. The script contains placeholder values (`{ sonar-token }`) that must be replaced before running.

> The script is in `.gitignore` (`add-secrets.sh`) — it should never be committed with real secret values. ✅

---

## 8. docker-compose.yaml (Legacy)

```yaml
services:
  kafka:
    image: ghcr.io/event-based-banking-application/arya-banking-kafka:latest
    ports:
      - "9092:9092"
  schema-registry:
    image: ghcr.io/event-based-banking-application/arya-banking-schema-registry:latest
    ports:
      - "8081:8081"
```

This is an **older, standalone dev Compose file** that uses custom-built images from GitHub Container Registry (GHCR) rather than the official Confluent images used in `arya-banking-infra`. It has no network configuration (no `arya-banking-net`) and is not integrated with the main infrastructure stack.

| Aspect | This file | `arya-banking-infra/compose/kafka.yml` |
|---|---|---|
| Images | Custom GHCR images | Official `confluentinc/cp-kafka:latest` |
| Network | None (default bridge) | `arya-banking-net` (shared external) |
| Services | Kafka + Schema Registry only | Kafka + Schema Registry + Kafka Connect |
| Healthcheck | None | Kafka has healthcheck defined |

> **Recommendation:** This file is superseded by `arya-banking-infra`. It should be removed or clearly marked as deprecated to avoid confusion.

---

## 9. Request Flow — End to End

```
Client (Browser / API consumer)
        │
        │  HTTP request with Bearer JWT
        ▼
arya-banking-api-gateway  (port 8085)
        │
        ├─ SecurityWebFilterChain
        │   ├─ Check path against permitAll rules
        │   ├─ Validate JWT signature against Keycloak JWK Set
        │   ├─ Check authorities (ROLE_INTERNAL_SERVICE for /internal/**)
        │   └─ Reject with 401/403 if invalid
        │
        ├─ Route matching (path predicates)
        │   ├─ /api/users/**        → http://localhost:8086 (user-service)
        │   ├─ /api/auth/**         → http://localhost:8087 (auth-service)
        │   ├─ /internal/api/auth/**→ http://localhost:8087 (auth-service, internal)
        │   └─ /api/admin/**        → http://localhost:8089 (admin-service)
        │
        ▼
Downstream microservice (user-service / auth-service / admin-service)
```

### Request Headers Forwarded by Gateway

Spring Cloud Gateway automatically forwards:
- `Authorization: Bearer <JWT>` — downstream services can re-validate if needed
- `X-Forwarded-For`, `X-Forwarded-Host`, `X-Forwarded-Proto` — standard reverse proxy headers

> Downstream services that import `arya-banking-common` will have `GlobalExceptionHandler` active. Errors thrown downstream are serialised as `ErrorResponse(errorCode, errorMessage)` JSON and returned through the gateway to the client.

---

## 10. Known Issues & Improvement Suggestions

| # | Location | Issue | Recommendation |
|---|---|---|---|
| 1 | `application.yaml` | `client-secret: FMrBssX0Lk92Uwep4zQitLIRChUfffGs` hardcoded in plaintext | Move to Vault KV secret injected via `bootstrap.yaml` or `${KC_CLIENT_SECRET}` env var |
| 2 | `application.yaml` | Routes use `spring.cloud.gateway.routes` (old key) | Align with `arya-banking-configs` which uses `spring.cloud.gateway.server.webflux.routes` for Spring Cloud 2025.x |
| 3 | `application.yaml` | All route URIs use `localhost:{port}` hardcoded | Migrate to Eureka service discovery: `uri: lb://arya-banking-user-service`. `@EnableDiscoveryClient` is already in place |
| 4 | `SecurityConfig.java` | No rate limiting configured | Add `RequestRateLimiter` filter (e.g., Redis-backed) to protect downstream services from request floods |
| 5 | `SecurityConfig.java` | No CORS configuration | Add `CorsWebFilter` or `ServerHttpSecurity.cors()` for browser clients |
| 6 | `AryaBankingApiGatewayApplicationTests.java` | `@Test` annotation missing — context test never runs | Add `@Test` annotation and mock OAuth2/Eureka beans for CI safety |
| 7 | `pom.xml` | Lombok in compiler annotation processor but not in `<dependencies>` | Add `<dependency>lombok provided scope>` or remove the annotation processor path |
| 8 | `docker-compose.yaml` | Superseded by `arya-banking-infra` stack; uses old GHCR images | Remove or add a deprecation notice |
| 9 | `application.yaml` | No `spring.cloud.config.uri` — gateway does not fetch config from config server | Add Config Client dependency and `bootstrap.yaml` pointing to `arya-banking-config-server:8090` so routes are managed centrally |
| 10 | `SecurityConfig.java` | No logging/audit of rejected requests | Add a `WebFilter` that logs 401/403 responses with the request path for security audit trail |
| 11 | `application.yaml` | `keycloak.url` has a trailing slash (`http://localhost:5433/`) | Remove the trailing slash — it causes double-slash in derived URIs (e.g., `http://localhost:5433//realms/...`) |

---

## 11. Quick Reference

### Common Commands

| Task | Command |
|---|---|
| Run locally | `mvn spring-boot:run` |
| Build JAR | `mvn -DskipTests package` |
| Run tests | `mvn clean verify` |
| SpotBugs analysis | `mvn spotbugs:check` |
| JaCoCo coverage report | `mvn verify` → `target/site/jacoco/index.html` |

### Key URLs (local dev)

| URL | Purpose |
|---|---|
| `http://localhost:8085/api/users/register` | Public — user registration (no JWT) |
| `http://localhost:8085/api/auth/authenticate` | Public — login (no JWT) |
| `http://localhost:8085/api/users/{id}` | Authenticated — requires valid JWT |
| `http://localhost:8085/api/admin/**` | Authenticated — requires valid JWT |
| `http://localhost:8085/internal/api/auth/**` | Service-only — requires `ROLE_INTERNAL_SERVICE` |
| `http://localhost:8085/actuator/health` | Gateway health check |

### Environment Variables / Secrets Required

| Variable | Purpose |
|---|---|
| `GH_PAT` | GitHub PAT for pulling `arya-banking-common` from GitHub Packages |
| `SONAR_TOKEN` | SonarCloud analysis token |
| `SONAR_PROJECT_KEY` | SonarCloud project key |
| `SONAR_ORG` | SonarCloud organisation key |
| `ORG_ISSUE_TOKEN` | GitHub token for auto-creating issues across the org |

### Gateway Route Summary

```
POST /api/users/register          → user-service:8086     [PUBLIC]
POST /api/auth/authenticate       → auth-service:8087     [PUBLIC]
*    /api/users/**                → user-service:8086     [JWT required]
*    /api/security-details/**     → user-service:8086     [JWT required]
*    /api/auth/**                 → auth-service:8087     [JWT required]
*    /internal/api/auth/**        → auth-service:8087     [ROLE_INTERNAL_SERVICE]
*    /api/admin/**                → admin-service:8089    [JWT required]
```
