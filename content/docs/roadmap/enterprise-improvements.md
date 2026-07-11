---
title: "Enterprise Improvements"
description: "Comprehensive list of improvements needed to bring the Arya Banking platform to enterprise standards."
icon: "build"
weight: 100
toc: true
---

## Overview

This roadmap tracks 27 improvements identified across all 9 repositories, ranked by severity. Improvements are grouped into three milestones.

{{< alert context="info" text="Items are sourced from a cross-repo audit of security, architecture, code quality, observability, and documentation gaps conducted on 2026-07-11." />}}

---

## Milestone 1 — Critical Security Fixes

{{< alert context="danger" text="These items involve hardcoded secrets committed to git. Rotate all exposed credentials immediately." />}}

---

### 1. Hardcoded Vault AppRole credentials in bootstrap.yml ✅

**Files:**
- `arya-banking-auth-service/bootstrap.yml`
- `arya-banking-user-service/bootstrap.yml`
- `arya-banking-admin-service/bootstrap.yml`

**Fixed:** Each service now uses a gitignored `vault-credentials.yml` file at its project root, imported via `spring.config.import: "optional:file:./vault-credentials.yml"`. The `bootstrap.yml` contains only `placeholder` values that are overridden by the local file.

```yaml
# bootstrap.yml
spring:
  config:
    import: "optional:file:./vault-credentials.yml"
  cloud:
    vault:
      app-role:
        role-id: placeholder
        secret-id: placeholder
```

```yaml
# vault-credentials.yml (gitignored — not committed)
spring:
  cloud:
    vault:
      app-role:
        role-id: <actual-role-id>
        secret-id: <actual-secret-id>
```

| Affected Repos | Severity |
|---|---|
| auth-service, user-service, admin-service | ✅ Completed |

---

### 2. Hardcoded Keycloak client secret in API Gateway

**File:** `arya-banking-api-gateway/src/main/resources/application.yaml`

**Current (vulnerable) code:**

```yaml
    registration:
      banking-service-client:
        provider: keycloak
        client-id: banking-service-client
        client-secret: FMrBssX0Lk92Uwep4zQitLIRChUfffGs
```

**Problem:** The OAuth2 client secret for the gateway's `banking-service-client` is in plaintext. This secret is used in the Authorization Code flow and can be extracted from the repo.

| Affected Repos | Severity |
|---|---|
| api-gateway | 🔴 Critical |

---

### 3. Hardcoded MongoDB Atlas password

**File:** `arya-banking-common/src/main/resources/application.yaml`

**Current (vulnerable) code:**

```yaml
spring:
  data:
    mongodb:
      uri: mongodb+srv://admin:ka3k912719@bankingcluster.ayhvgpk.mongodb.net/metadata?retryWrites=true&w=majority&appName=bankingCluster
```

**Problem:** The MongoDB Atlas admin password is in plaintext. This gives full database access to anyone with repo access. This connection string is also bundled into the `arya-banking-common` JAR published to GitHub Packages.

| Affected Repos | Severity |
|---|---|
| common | 🔴 Critical |

---

### 4. Vault unseal keys committed to git

**File:** `arya-banking-infra/scripts/vault/init/keys_raw.json`

**Content (currently exposed):**

```json
{
  "unseal_keys_b64": ["sMgMGskdSogAO7dcFPBeWr35qhCnWuNV8wRgxhIX6cyU", ...],
  "root_token": "hvs.<redacted>"
}
```

**Problem:** Five unseal keys and the root token are committed in a JSON file. This compromises the entire Vault instance.

| Affected Repos | Severity |
|---|---|
| infra | 🔴 Critical |

---

### 5. SCM URL points to wrong repository

**File:** `arya-banking-auth-service/pom.xml`

**Current (wrong) code:**

```xml
<scm>
  <connection>scm:git:https://github.com/Event-Based-Banking-Application/arya-banking-common</connection>
  <developerConnection>scm:git@github.com:Event-Based-Banking-Application/arya-banking-common.git</developerConnection>
  <url>https://github.com/Event-Based-Banking-Application/arya-banking-common</url>
</scm>
```

**Problem:** The auth service's `pom.xml` references `arya-banking-common` instead of `arya-banking-auth-service`. This breaks Maven release plugins, automated changelogs, and IDE integrations.

| Affected Repos | Severity |
|---|---|
| auth-service | 🔴 Critical |

---

## Milestone 2 — Architecture & Reliability

---

### 6. Missing Dockerfiles for business microservices

**Files:** Missing from `arya-banking-auth-service/`, `arya-banking-user-service/`, `arya-banking-admin-service/`

**Current state:** These three services have no `Dockerfile`. Only `api-gateway`, `service-registry`, and `config-server` are containerized.

**Problem:** Without Dockerfiles, these services cannot be deployed in the Docker Compose platform stack. They must be run manually via Maven or IDE, meaning the full system cannot be started with `make up`.

| Affected Repos | Severity |
|---|---|
| auth-service, user-service, admin-service | 🟠 High |

---

### 7. Missing Docker publish CI/CD workflows

**Files:** Missing `.github/workflows/docker-publish.yml` from `auth-service`, `user-service`, `admin-service`

**Current state:** `arya-banking-api-gateway` has a `docker-publish.yml` that builds and pushes to Docker Hub on version tags. The business services have none.

**Problem:** No automated image builds. Every deployment requires manual `docker build` and `docker push`.

| Affected Repos | Severity |
|---|---|
| auth-service, user-service, admin-service | 🟠 High |

---

### 8. Tests are all empty stubs

**Files:** All `src/test/java/**/*ApplicationTests.java` across every service

**Current state:**
```java
@SpringBootTest
class AryaBankingXxxServiceApplicationTests {
    void contextLoads() {  // Missing @Test, no assertions
    }
}
```

**Problem:** Every test class is a stub. Some are missing the `@Test` annotation so they don't execute. There are zero assertions in the entire codebase.

| Affected Repos | Severity |
|---|---|
| All services | 🟠 High |

---

### 9. Duplicate Docker Compose definitions

**Files:**
- `arya-banking-infra/compose/kafka.yml`
- `arya-banking-common/docker-compose.yaml`
- `arya-banking-auth-service/docker-compose.yaml`

**Current state:** Kafka is defined in 3 places; Keycloak + PostgreSQL appear in both `infra/compose/keycloak.yml` and `auth-service/docker-compose.yaml`. Each copy has slightly different configurations and ports. The auth-service compose file uses an invalid version string `version: '1.0'`.

**Problem:** Config drift between copies. Developers may start the wrong one and waste time debugging connectivity.

| Affected Repos | Severity |
|---|---|
| auth-service, common, infra | 🟠 High |

---

### 10. Gateway routes use `host.docker.internal`

**File:** `arya-banking-configs/application.yml`

**Current code:**

```yaml
spring:
  cloud:
    gateway:
      server:
        webflux:
          routes:
            - id: user-service
              uri: http://host.docker.internal:8086
```

**Problem:** `host.docker.internal` only works on Docker Desktop (Windows/Mac). It fails on Linux hosts and in CI/CD runners. This also bypasses Eureka service discovery. Additionally, `spring.cloud.gateway.server.webflux.routes` may not be the correct key structure for Spring Cloud Gateway 2025.0.0 — the standard key is `spring.cloud.gateway.routes`.

| Affected Repos | Severity |
|---|---|
| configs | 🟠 High |

---

### 11. No circuit breakers on Feign clients

**Files:**
- `arya-banking-auth-service/src/main/java/org/arya/banking/auth/external/UserService.java`
- `arya-banking-user-service/src/main/java/org/arya/banking/user/external/KeyCloakService.java`
- All other `@FeignClient` declarations across services

**Current code:**
```java
@FeignClient(name = "ARYA-BANKING-USER-SERVICE", configuration = FeignConfiguration.class)
public interface UserService {
    @PutMapping("/internal/api/security-details/{userId}")
    ResponseEntity<Map<String, String>> updateLoginAttempts(...);
}
```

**Problem:** If the downstream service is down or slow, the Feign client blocks the caller thread until timeout. No fallback, no circuit breaker. A single degraded service can cascade failures across the entire system.

| Affected Repos | Severity |
|---|---|
| auth-service, user-service, admin-service | 🟠 High |

---

### 12. No Docker publish for platform services

**Files:** Missing `.github/workflows/docker-publish.yml` from `service-registry`, `config-server`

**Current state:** These services have Dockerfiles but no CI/CD pipeline to publish images. The `api-gateway` has one — the platform services don't.

**Problem:** Images must be built and pushed manually. Version tags on GitHub don't automatically trigger releases.

| Affected Repos | Severity |
|---|---|
| service-registry, config-server | 🟠 High |

---

### 13. Missing `@Test` annotation

**Files:**
- `arya-banking-auth-service/src/test/.../AryaBankingAuthServiceApplicationTests.java`
- `arya-banking-user-service/src/test/.../AryaBankingUserServiceApplicationTests.java`

**Current code:**
```java
@SpringBootTest
class ...Tests {
    void contextLoads() {  // Missing @Test
    }
}
```

**Problem:** Without `@Test`, these methods are never executed by JUnit. Developers get no feedback on whether the application context starts correctly.

| Affected Repos | Severity |
|---|---|
| user-service, auth-service | 🟠 High |

---

## Milestone 3 — Code Quality & Observability

---

### 14. Sonar exclusions too broad

**Files:** All `pom.xml` files

**Current config:**
```xml
<sonar.coverage.exclusions>**/config/**,**/dto/**,**/constants/**,**/mapper/**,
**/repository/**,**/model/**,**/metadat/**, **/exception/**,**/*Application.java</sonar.coverage.exclusions>
```

**Problem:** Almost every package is excluded from coverage. Only controller and service implementation classes are measured, giving a false sense of coverage.

| Affected Repos | Severity |
|---|---|
| All services | 🟡 Medium |

---

### 15. No distributed tracing

**Files:** All services — missing `micrometer-tracing` and Brave dependencies

**Current state:** No correlation ID is propagated across service boundaries. When a request flows Gateway &rarr; Auth Service &rarr; User Service, there is no way to trace it across logs.

| Affected Repos | Severity |
|---|---|
| All services | 🟡 Medium |

---

### 16. No rate limiting on API Gateway

**File:** `arya-banking-api-gateway`

**Current state:** The gateway has no `RequestRateLimiter` filter. A malicious client can flood all downstream services.

| Affected Repos | Severity |
|---|---|
| api-gateway | 🟡 Medium |

---

### 17. Missing API documentation

**Files:** `arya-banking-auth-service`, `arya-banking-service-registry`, `arya-banking-config-server`

**Current state:** Only `user-service` and `admin-service` have `springdoc-openapi` dependency. The other services have no Swagger/OpenAPI documentation.

| Affected Repos | Severity |
|---|---|
| auth-service, service-registry, config-server | 🟡 Medium |

---

### 18. Invalid Docker Compose version string

**File:** `arya-banking-auth-service/docker-compose.yaml`

**Current code:**
```yaml
version: '1.0'
```

**Problem:** Docker Compose doesn't recognize `1.0` as a valid version. Valid values are `3.8`, `3.9`, etc., or omit the `version` key entirely (Docker Compose v2 ignores it).

| Affected Repos | Severity |
|---|---|
| auth-service | 🟡 Medium |

---

### 19. Service Registry Dockerfile exposes wrong port

**File:** `arya-banking-service-registry/Dockerfile`

**Current code:**
```
EXPOSE 8080
```

**Problem:** The Eureka server runs on port 8761, but the Dockerfile advertises port 8080. Container metadata is misleading.

| Affected Repos | Severity |
|---|---|
| service-registry | 🟡 Medium |

---

### 20. Config Server Eureka URL typo

**File:** `arya-banking-config-server/src/main/resources/application.yaml`

**Current code:**
```yaml
eureka:
  client:
    service-url:
      defaultZone: http://localhosat:8761/eureka
```

**Problem:** `localhosat` is a typo of `localhost`. The Config Server fails to register with Eureka and downstream services can't discover it.

| Affected Repos | Severity |
|---|---|
| config-server | 🟡 Medium |

---

### 21. No `.env.example` files

**Files:** All 9 repos

**Current state:** No documentation of required environment variables exists in any repo. New developers must read the source code to discover what to set.

| Affected Repos | Severity |
|---|---|
| All repos | 🟡 Medium |

---

### 22. Placeholder values in `add-secrets.sh`

**Files:** All `add-secrets.sh` across all repos

**Current code:**
```bash
SONAR_TOKEN={ sonar-token }
SONAR_PROJECT_KEY={ project_key }
SONAR_ORG={ sonar-org }
```

**Problem:** The script references SonarCloud tokens with unreplaced placeholders. Running it without editing will set invalid values as GitHub secrets.

| Affected Repos | Severity |
|---|---|
| All repos | 🟡 Medium |

---

### 23. No startup retry for Keycloak initialization

**Files:**
- `arya-banking-auth-service/.../service/KeyCloakManager.java`
- `arya-banking-admin-service/.../service/KeyCloakManager.java`

**Current code:**
```java
@PostConstruct
public void init() {
    keycloak = KeycloakBuilder.builder()
            .serverUrl(serverUrl)
            .realm(keyCloakRealm)
            .clientId(clientId)
            .clientSecret(clientSecret)
            .grantType(CLIENT_CREDENTIALS)
            .build();
}
```

**Problem:** If Keycloak isn't ready when this `@PostConstruct` fires, the entire service fails to start. No retry mechanism.

| Affected Repos | Severity |
|---|---|
| auth-service, admin-service | 🟡 Medium |

---

### 24. No README files

**Files:** All service repos except `arya-banking-common`

**Current state:** Only `arya-banking-common` has a README. 6 service repos have none.

**Problem:** New contributors have no guidance on purpose, tech stack, how to run, or environment variables.

| Affected Repos | Severity |
|---|---|
| All service repos | 🔵 Low |

---

### 25. No CONTRIBUTING.md

**Files:** Root / all repos

**Current state:** No development setup guide anywhere.

**Problem:** No documented conventions for branching, PR process, coding standards, or local dev setup.

| Affected Repos | Severity |
|---|---|
| Root | 🔵 Low |

---

### 26. Gateway routes key may be incorrect

**File:** `arya-banking-configs/application.yml`

**Current code:**
```yaml
spring:
  cloud:
    gateway:
      server:
        webflux:
          routes:
```

**Problem:** The `server.webflux` nesting may not be the correct key structure for Spring Cloud Gateway 2025.0.0. The standard documented key is `spring.cloud.gateway.routes`. This needs validation against the actual Spring Cloud Gateway 2025.0.0 behavior.

| Affected Repos | Severity |
|---|---|
| configs | 🔵 Low |

---

### 27. Missing LICENSE files

**Files:** All repos

**Current state:** `pom.xml` declares Apache 2.0 but no `LICENSE.txt` file exists in any repo.

| Affected Repos | Severity |
|---|---|
| All repos | 🔵 Low |

---

## Quick Stats

{{< table "table-striped" >}}
| Severity | Count | Target Milestone |
|----------|-------|------------------|
| 🔴 Critical | 5 | Milestone 1 |
| 🟠 High | 8 | Milestone 2 |
| 🟡 Medium | 10 | Milestone 3 |
| 🔵 Low | 4 | Milestone 3 |
| **Total** | **27** | |
{{< /table >}}
