# Arya Banking — Configuration Layer
## Codebase Knowledge Document

> Covers two tightly coupled repositories:
> - **`arya-banking-configs`** — the centralised Spring Cloud Config Git-backed property store
> - **`arya-banking-config-server`** — the Spring Cloud Config Server that serves those properties to all microservices

---

## Repository Map

| Repo | Role | Port |
|---|---|---|
| `arya-banking-configs` | Git repo holding all shared `application.yml` and per-service config files | N/A (not a runnable service) |
| `arya-banking-config-server` | Spring Cloud Config Server — reads from `arya-banking-configs` and exposes config over HTTP | `8090` |

---

## Part 1 — arya-banking-configs

### 1.1 Overview

`arya-banking-configs` is a **pure configuration repository** — no Java, no build file. It stores YAML property files that are served by `arya-banking-config-server` to every microservice in the Arya Banking platform at startup. Microservices never read config files from their own JAR in production; they fetch them from this repo via the config server.

```
arya-banking-configs/
└── application.yml    ← Shared defaults for ALL microservices
```

> **Git-backed Config:** Spring Cloud Config Server uses `git clone` + `git pull` to keep a local mirror of this repo up to date. Any property change pushed here is picked up by microservices on their next `/actuator/refresh` or restart.

---

### 1.2 application.yml — Full Breakdown

This is the **global shared config** file. Every microservice that connects to the config server inherits these properties. Service-specific overrides live in files named `{spring.application.name}.yml` (e.g. `user-service.yml`).

```yaml
eureka:
  client:
    service-url:
      defaultZone: http://localhost:8761/eureka

spring:
  kafka:
    bootstrap-servers: localhost:9092
    properties:
      schema.registry.url: http://localhost:8081

  data:
    mongodb:
      uri: mongodb+srv://admin:${spring.application.mongo-password}@bankingcluster.ayhvgpk.mongodb.net/${spring.application.database}?retryWrites=true&w=majority&appName=bankingCluster

  cloud:
    gateway:
      server:
        webflux:
          routes:
            - id: user-service
              uri: http://localhost:8086
              predicates:
                - Path=/api/users/**,/api/security-details/**

            - id: auth-service-external
              uri: http://localhost:8087
              predicates:
                - Path=/api/auth/**

            - id: auth-service-internal
              uri: http://localhost:8087
              predicates:
                - Path=/internal/api/**

            - id: admin-service
              uri: http://localhost:8089
              predicates:
                - Path=/api/admin/**

app:
  config:
    keycloak:
      url: http://localhost:5433
      realm: event-based-banking-application
      token-uri: ${app.config.keycloak.url}/realms/${app.config.keycloak.realm}/protocol/openid-connect/token
      jwk-set-uri: ${app.config.keycloak.url}/realms/${app.config.keycloak.realm}/protocol/openid-connect/certs
```

---

### 1.3 Property Section Breakdown

#### Eureka Client

| Property | Value | Purpose |
|---|---|---|
| `eureka.client.service-url.defaultZone` | `http://localhost:8761/eureka` | Points all microservices at the service registry. Override per environment via profile-specific files or env vars. |

> **Docker Note:** In containerised deployments this value must be overridden to `http://arya-banking-service-registry:8761/eureka` (Docker hostname) or via `EUREKA_CLIENT_SERVICEURL_DEFAULTZONE` env var in Compose.

---

#### Kafka

| Property | Value | Purpose |
|---|---|---|
| `spring.kafka.bootstrap-servers` | `localhost:9092` | Kafka broker address. All producer/consumer microservices inherit this. |
| `spring.kafka.properties.schema.registry.url` | `http://localhost:8081` | Confluent Schema Registry for Avro schema resolution. Required by Avro-based producers/consumers. |

> **Overriding in Docker:** Set `SPRING_KAFKA_BOOTSTRAP_SERVERS=kafka:9092` and `SPRING_KAFKA_PROPERTIES_SCHEMA_REGISTRY_URL=http://schema-registry:8081` in each service's Compose `environment` block.

---

#### MongoDB

| Property | Value | Purpose |
|---|---|---|
| `spring.data.mongodb.uri` | `mongodb+srv://...` (Atlas) | Shared Atlas cluster URI. `${spring.application.mongo-password}` and `${spring.application.database}` are resolved at runtime — injected via Vault or environment variables per service. |

> **Secret Injection Pattern:** The placeholders `${spring.application.mongo-password}` and `${spring.application.database}` are **not** defined in this file. They are injected by HashiCorp Vault (AppRole auth) via `bootstrap.yaml` in each microservice, or overridden by environment variables. This prevents credentials from being committed to Git.

---

#### API Gateway Routes

The gateway route table is defined here as shared config and loaded by `arya-banking-api-gateway`. Routes use the new Spring Cloud Gateway `webflux` key structure (Spring Cloud 2025.x).

| Route ID | URI | Path Predicates |
|---|---|---|
| `user-service` | `http://localhost:8086` | `/api/users/**`, `/api/security-details/**` |
| `auth-service-external` | `http://localhost:8087` | `/api/auth/**` |
| `auth-service-internal` | `http://localhost:8087` | `/internal/api/auth/**` |
| `admin-service` | `http://localhost:8089` | `/api/admin/**` |

> **localhost vs Docker:** These URIs use `localhost` for local development. In the Dockerised environment these must be overridden to Docker service hostnames (e.g. `http://arya-banking-user-service:8086`). This is typically done via a Docker-profile-specific config file (e.g. `application-docker.yml`) in this same repo.

> **New Key Structure:** `spring.cloud.gateway.server.webflux.routes` is the correct path for Spring Cloud Gateway in the 2025.0.x release. The older `spring.cloud.gateway.routes` key is no longer used.

---

#### Keycloak

| Property | Value | Purpose |
|---|---|---|
| `app.config.keycloak.url` | `http://localhost:5433` | Keycloak base URL (non-standard port `5433` — maps to Keycloak's `8080` via Docker port binding) |
| `app.config.keycloak.realm` | `event-based-banking-application` | Realm name for all token operations |
| `app.config.keycloak.token-uri` | Derived from above | OAuth2 token endpoint — used by services requesting tokens |
| `app.config.keycloak.jwk-set-uri` | Derived from above | JWK Set endpoint — used by resource servers for JWT signature verification |

> **Property Composition:** `token-uri` and `jwk-set-uri` use Spring's `${...}` placeholder chaining — they are dynamically assembled from `url` and `realm`, so changing either base property automatically updates both derived URIs.

---

### 1.4 Config File Naming Convention

Spring Cloud Config Server resolves files using this pattern:

```
/{application}/{profile}
/{application}-{profile}.yml
/application.yml           ← global defaults (this file)
```

To add service-specific config, create files in this repo following the pattern:

| Filename | Loaded by |
|---|---|
| `application.yml` | All microservices (global defaults) |
| `user-service.yml` | Only `arya-banking-user-service` |
| `user-service-docker.yml` | `arya-banking-user-service` when `SPRING_PROFILES_ACTIVE=docker` |
| `admin-service.yml` | Only `arya-banking-admin-service` |
| `auth-service.yml` | Only `arya-banking-auth-service` |

---

## Part 2 — arya-banking-config-server

### 2.1 Overview

`arya-banking-config-server` is a Spring Cloud Config Server that reads property files from the `arya-banking-configs` Git repository and serves them over HTTP to all microservices. It also registers itself with Eureka, so clients can discover it by name instead of hardcoding a URL.

| Field | Value |
|---|---|
| Repository | `arya-banking-config-server` |
| Artifact ID | `arya-banking-config-server` |
| Version | `0.0.1-SNAPSHOT` |
| Java | 17 (Eclipse Temurin) |
| Spring Boot | `3.5.4` |
| Spring Cloud | `2025.0.0` |
| Port | `8090` |
| License | Apache 2.0 |
| Developer | Karthik Kulkarni |

---

### 2.2 Repository Structure

```
arya-banking-config-server/
├── src/
│   ├── main/
│   │   ├── java/org/arya/banking/config/
│   │   │   └── AryaBankingConfigServerApplication.java   ← Entry point
│   │   └── resources/
│   │       └── application.yaml                          ← Server config
│   └── test/
│       └── java/org/arya/banking/config/
│           └── AryaBankingConfigServerApplicationTests.java
├── pom.xml
├── Dockerfile                                             ← Multi-stage build (non-root)
├── Dockerfile.slim                                        ← Thin runtime-only build
├── docker-compose.yml                                     ← Standalone dev runner
├── .dockerignore
└── README.md
```

---

### 2.3 Source File Deep-Dives

#### AryaBankingConfigServerApplication.java

**Location:** `src/main/java/org/arya/banking/config/`

```java
package org.arya.banking.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.cloud.config.server.EnableConfigServer;

@SpringBootApplication
@EnableConfigServer
@EnableDiscoveryClient
public class AryaBankingConfigServerApplication {
    public static void main(String[] args) {
        SpringApplication.run(AryaBankingConfigServerApplication.class, args);
    }
}
```

| Annotation | Effect |
|---|---|
| `@SpringBootApplication` | Bootstraps the full Spring context with auto-configuration and component scanning. |
| `@EnableConfigServer` | Activates Spring Cloud Config Server — exposes `/{application}/{profile}` HTTP endpoints backed by the configured Git repo. |
| `@EnableDiscoveryClient` | Registers this server with Eureka. Microservices configured with `spring.cloud.config.discovery.enabled: true` can locate it by name (`arya-banking-config-server`) instead of a hardcoded URL. |

> **Design Note:** No custom controllers, security config, or beans are defined. The annotations do all the work via Spring Boot auto-configuration. This is intentional — keep the config server thin and let Spring Cloud handle the complexity.

---

#### application.yaml

```yaml
spring:
  application:
    name: arya-banking-config-server

  cloud:
    config:
      server:
        git:
          uri: https://github.com/Event-Based-Banking-Application/arya-banking-configs
          clone-on-start: true

eureka:
  client:
    service-url:
      defaultZone: http://localhosat:8761/eureka   # ⚠️ typo: "localhosat"

server:
  port: 8090
```

| Property | Value | Purpose |
|---|---|---|
| `spring.application.name` | `arya-banking-config-server` | Service name used for Eureka registration and log identification. |
| `spring.cloud.config.server.git.uri` | GitHub URL for `arya-banking-configs` | The Git repo that backs all config. The server clones this repo on startup and refreshes it on each config request. |
| `spring.cloud.config.server.git.clone-on-start` | `true` | Clones the repo immediately at startup, not lazily on first request. Ensures the server is ready to serve config the moment it passes its health check. |
| `eureka.client.service-url.defaultZone` | `http://localhosat:8761/eureka` | ⚠️ **Typo — "localhosat" should be "localhost"**. This will cause Eureka registration to fail silently in local mode. |
| `server.port` | `8090` | HTTP port for the config server API. |

> ⚠️ **Bug:** `eureka.client.service-url.defaultZone` contains a typo — `localhosat` instead of `localhost`. In Docker deployments this is masked because the env var `EUREKA_CLIENT_SERVICEURL_DEFAULTZONE` overrides it, but local non-Docker runs will fail to register with Eureka.

---

#### AryaBankingConfigServerApplicationTests.java

```java
@SpringBootTest
class AryaBankingConfigServerApplicationTests {
    @Test
    void contextLoads() { }
}
```

Context-load smoke test. Boots the full Spring context including the `@EnableConfigServer` and `@EnableDiscoveryClient` auto-configuration. Passes if no exception is thrown at startup.

> **Test Gap:** The test does not assert that config endpoints return expected values, or that the Git backend is reachable. Consider adding integration tests using `@SpringBootTest` with a test Git repo or `NativeEnvironmentRepository` backend.

---

### 2.4 Maven Build (pom.xml)

#### Coordinates & Parent

| POM Field | Value |
|---|---|
| `groupId` | `org.arya.banking` |
| `artifactId` | `arya-banking-config-server` |
| `version` | `0.0.1-SNAPSHOT` |
| Parent | `spring-boot-starter-parent : 3.5.4` |
| Spring Cloud BOM | `spring-cloud-dependencies : 2025.0.0` |
| License | Apache 2.0 |
| Developer | Karthik Kulkarni (`karthik`) |

#### Dependency Tree

| Dependency | Scope | Purpose |
|---|---|---|
| `spring-cloud-config-server` | compile | Core Config Server engine — serves `/{app}/{profile}` endpoints from Git backend |
| `spring-cloud-starter-netflix-eureka-client` | compile | Registers config server with Eureka for service-discovery-based client lookup |
| `spring-boot-starter-test` | test | JUnit 5 + Mockito + Spring Test |

> **Notable absence:** No `spring-boot-starter-actuator`. Adding it and exposing `/actuator/health` would enable proper liveness/readiness checks in Docker and Kubernetes. The README notes this as a next step.

#### Build Plugins

| Plugin | Version | Purpose |
|---|---|---|
| `maven-compiler-plugin` | `3.11.0` | Configures Lombok annotation processor (`1.18.36`) — though Lombok is not a declared dependency, the path is pre-wired for future use. |
| `spotbugs-maven-plugin` | `4.8.6.1` | Static analysis for common bug patterns. Run with `mvn spotbugs:check`. |
| `jacoco-maven-plugin` | `0.8.13` | Code coverage — runs as part of `mvn verify`, outputs to `target/site/jacoco`. |
| `spring-boot-maven-plugin` | (from parent) | Creates the executable fat JAR. Configured with a Paketo buildpack run image (`ubuntu-noble-run-base`) for `mvn spring-boot:build-image`. |

---

### 2.5 Dockerfile (Multi-Stage, Non-Root)

```dockerfile
# Stage 1 — Builder
FROM maven:3.9.4-eclipse-temurin-17 AS build
WORKDIR /workspace
COPY pom.xml ./
COPY src ./src
RUN mvn -B -DskipTests package

# Stage 2 — Runtime
FROM eclipse-temurin:17-jre-jammy
LABEL name="arya-banking-config-server" version="1.0.2"

RUN groupadd -r app \
  && useradd -r -m -d /home/app -s /bin/false -g app app \
  && mkdir -p /home/app/.config/jgit \
  && chown -R app:app /home/app

ENV HOME=/home/app
WORKDIR /app
COPY --from=build --chown=app:app /workspace/target/arya-banking-config-server-*.jar /app/app.jar

EXPOSE 8090
USER app
ENTRYPOINT ["java","-Xms256m","-Xmx512m","-jar","/app/app.jar"]
```

| Feature | Detail |
|---|---|
| **Non-root user** | Creates system user `app` with no login shell (`/bin/false`). The JVM runs as this user — a significant security improvement over running as root. |
| **jgit config dir** | `mkdir -p /home/app/.config/jgit` — Spring Cloud Config Server uses JGit to clone/pull the configs repo. JGit needs a writable home directory for its config and known-hosts files. Without this, Git operations fail at runtime. |
| **`HOME` env var** | Explicitly set to `/home/app` so JGit resolves `~/.config/jgit` correctly under the non-root user. |
| **JVM memory flags** | `-Xms256m -Xmx512m` hardcoded in `ENTRYPOINT`. Adjust for your environment; the config server is lightweight and 512 MB is usually sufficient. |
| **Layer caching** | `COPY pom.xml ./` before `COPY src ./src` — Maven dependencies are only re-downloaded when `pom.xml` changes, not on every source change. |
| **Glob JAR copy** | `target/arya-banking-config-server-*.jar` — handles version changes in the JAR name without updating the Dockerfile. |

---

### 2.6 Dockerfile.slim

```dockerfile
FROM eclipse-temurin:17-jre-jammy
# ... same non-root user setup ...
COPY --chown=app:app target/arya-banking-config-server-*.jar /app/app.jar
EXPOSE 8090
USER app
ENTRYPOINT ["java","-Xms256m","-Xmx512m","-jar","/app/app.jar"]
```

A **runtime-only** Dockerfile — skips the Maven build stage and expects a pre-built JAR in `target/`. Used for:
- Quick size measurement (`docker build -f Dockerfile.slim .` after a local `mvn package`)
- Environments where CI builds the JAR externally and only needs a container wrapper
- Faster local iteration when the full multi-stage build is too slow

> **When to use which:**
> - CI/CD pipelines → `Dockerfile` (self-contained, reproducible)
> - Local dev iteration after `mvn package` → `Dockerfile.slim` (fast)

---

### 2.7 docker-compose.yml

```yaml
version: "3.9"
services:
  service-registry:
    image: karthikulkarni/arya-banking-service-registry:latest
    ports:
      - "8761:8761"
    restart: unless-stopped
    networks:
      - arya-net

  config-server:
    image: karthikulkarni/arya-banking-config-server
    ports:
      - "8090:8090"
    environment:
      - SPRING_PROFILES_ACTIVE=default
      - EUREKA_CLIENT_SERVICEURL_DEFAULTZONE=http://registry:8761/eureka/
    depends_on:
      - service-registry
    restart: unless-stopped
    networks:
      - arya-net

networks:
  arya-net:
    driver: bridge
```

| Setting | Notes |
|---|---|
| Both services on `arya-net` | A shared bridge network so containers resolve each other by service name. |
| `depends_on: service-registry` | Compose starts the registry container before the config-server. Does **not** wait for the registry to be healthy — only for the container to start. Add a `healthcheck` + `condition: service_healthy` for production-grade ordering. |
| `EUREKA_CLIENT_SERVICEURL_DEFAULTZONE` | Set to `http://registry:8761/eureka/` — uses the Compose service name `registry`. Note this must match the service name key in the Compose file (here it's `service-registry`, not `registry` — this is a **bug**, the URL should be `http://service-registry:8761/eureka/`). |
| Uses published Docker Hub images | `karthikulkarni/arya-banking-*` — pulls from Docker Hub rather than building locally. For local development, replace with `build: .`. |

> ⚠️ **Bug:** `EUREKA_CLIENT_SERVICEURL_DEFAULTZONE` is set to `http://registry:8761/eureka/` but the service is named `service-registry` in Compose. The hostname `registry` will not resolve. Should be `http://service-registry:8761/eureka/`.

> **Integration Note:** This standalone Compose is for local testing of just these two services. The canonical full-stack definition lives in `arya-banking-infra` using the shared `arya-banking-net` network.

---

### 2.8 .dockerignore

| Excluded Pattern | Reason |
|---|---|
| `target/` | Maven build output — the Dockerfile builds its own JAR inside the container |
| `.mvn/, *.iml, .idea/` | Maven wrapper and IDE metadata — zero runtime value |
| `.git/` | Git history — reduces Docker build context size |
| `.DS_Store` | macOS filesystem metadata |
| `logs/, tmp/` | Local runtime artifacts — should never be in an image |
| `.env` | Local environment file with secrets — must never be baked into the image |

---

## Part 3 — How They Work Together

### 3.1 End-to-End Config Flow

```
arya-banking-configs (GitHub repo)
        │
        │  git clone / pull (on startup and per request)
        ▼
arya-banking-config-server  (port 8090)
        │
        │  HTTP GET /{application}/{profile}
        ▼
Each microservice (user-service, auth-service, admin-service, api-gateway)
    └── Reads config into Spring Environment at startup
```

### 3.2 How a Microservice Fetches Config

Each client microservice must have a `bootstrap.yaml` (or equivalent) pointing at the config server:

```yaml
spring:
  application:
    name: arya-banking-user-service   # ← determines which config file is loaded
  cloud:
    config:
      uri: http://arya-banking-config-server:8090
      # OR use discovery:
      discovery:
        enabled: true
        service-id: arya-banking-config-server
```

The config server then serves:
1. `application.yml` (global defaults from `arya-banking-configs`)
2. `arya-banking-user-service.yml` (service-specific overrides, if the file exists)
3. `arya-banking-user-service-{profile}.yml` (profile-specific overrides, if active)

Properties from lower files in this list **override** higher ones.

### 3.3 Startup Order

```
1. arya-banking-service-registry   (port 8761) — must be FIRST
2. arya-banking-config-server      (port 8090) — registers with Eureka; serves config
3. All other microservices          — fetch config from step 2, register with step 1
```

---

## Part 4 — Known Issues & Improvement Suggestions

| # | Location | Issue | Recommendation |
|---|---|---|---|
| 1 | `config-server/application.yaml` | Typo: `localhosat` in Eureka `defaultZone` | Fix to `localhost`. Masked in Docker by env var override but breaks local non-Docker runs. |
| 2 | `config-server/docker-compose.yml` | `EUREKA_CLIENT_SERVICEURL_DEFAULTZONE` points to `http://registry:8761` but service is named `service-registry` | Change to `http://service-registry:8761/eureka/` |
| 3 | `config-server/pom.xml` | No `spring-boot-starter-actuator` dependency | Add actuator and expose `/actuator/health` to enable proper Docker `HEALTHCHECK` and `depends_on: condition: service_healthy` in Compose. |
| 4 | `config-server/docker-compose.yml` | `depends_on` does not wait for registry to be healthy | Add a `healthcheck` to `service-registry` and use `condition: service_healthy` in `config-server.depends_on`. |
| 5 | `arya-banking-configs/application.yml` | All URIs use `localhost` — will not work in Docker without override | Add an `application-docker.yml` profile file with Docker hostnames (e.g. `kafka:9092`, `arya-banking-service-registry:8761`). |
| 6 | `config-server/application.yaml` | No `spring.cloud.config.server.git.default-label` set | Explicitly set the branch (e.g. `default-label: main`) to avoid ambiguity when the repo has multiple branches. |
| 7 | `config-server` | Lombok configured in compiler plugin but not declared as a dependency | Either add `lombok` to `<dependencies>` or remove the annotation processor path if unused. |
| 8 | `arya-banking-configs/application.yml` | MongoDB password uses `${spring.application.mongo-password}` placeholder | Document in a team runbook how this secret is injected (Vault AppRole path, env var name) so new developers know where to set it. |

---

## Part 5 — Quick Reference

### 5.1 Config Server API Endpoints

| Endpoint | Returns |
|---|---|
| `GET /arya-banking-user-service/default` | Global `application.yml` + user-service overrides |
| `GET /arya-banking-admin-service/default` | Global `application.yml` + admin-service overrides |
| `GET /arya-banking-api-gateway/default` | Global `application.yml` + gateway overrides |
| `GET /application/default` | Just the global `application.yml` defaults |
| `POST /actuator/refresh` _(if actuator added)_ | Triggers a live config refresh on the server |

### 5.2 Common Commands

| Task | Command |
|---|---|
| Build JAR | `mvn -B -DskipTests package` |
| Build Docker image (full) | `docker build -t arya-banking-config-server:latest .` |
| Build Docker image (slim) | `mvn -DskipTests package && docker build -f Dockerfile.slim -t arya-banking-config-server:slim .` |
| Start standalone stack | `docker-compose up -d` |
| Check config is served | `curl http://localhost:8090/arya-banking-user-service/default` |
| View logs | `docker-compose logs -f config-server` |
| Run SpotBugs analysis | `mvn spotbugs:check` |
| Generate JaCoCo report | `mvn verify` → open `target/site/jacoco/index.html` |

### 5.3 Key Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | `default` | Activates a named Spring profile |
| `EUREKA_CLIENT_SERVICEURL_DEFAULTZONE` | `http://localhost:8761/eureka` | Overrides Eureka registration URL (critical in Docker) |
| `SPRING_CLOUD_CONFIG_SERVER_GIT_URI` | GitHub URL | Override the backing Git repo if needed |
| `SPRING_CLOUD_CONFIG_SERVER_GIT_DEFAULT_LABEL` | `main` | Git branch to read from |
| `JAVA_OPTS` | (via ENTRYPOINT flags) | JVM tuning — currently hardcoded in Dockerfile as `-Xms256m -Xmx512m` |
