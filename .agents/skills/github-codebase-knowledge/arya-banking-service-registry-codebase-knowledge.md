# Arya Banking — Service Registry
## Codebase Knowledge Document

| Field | Value |
|---|---|
| Repository | arya-banking-service-registry |
| Artifact ID | arya-banking-service-registry |
| Version | 0.0.1-SNAPSHOT |
| Java | 17 (Eclipse Temurin) |
| Spring Boot | 3.5.4 |
| Spring Cloud | 2025.0.0 |
| Port | 8761 |
| Role | Eureka Service Registry |

---

## 1. Repository Overview

`arya-banking-service-registry` is the Netflix Eureka-based service discovery server for the Arya Banking microservices platform. It is the **first infrastructure service** that must be running before any other microservice can register or be discovered. All other services in the ecosystem point their Eureka client configuration at this server.

> **Role:** Acts as the central phone-book for the entire Arya Banking ecosystem. Every microservice (user-service, auth-service, admin-service, api-gateway, config-server) registers here at startup and queries it for peer locations.

---

## 2. Technology Stack

| Technology / Dependency | Version & Purpose |
|---|---|
| Spring Boot | 3.5.4 — Application framework and auto-configuration |
| Spring Cloud Netflix Eureka Server | 2025.0.0 (via BOM) — Core service registry |
| Spring Boot Actuator | Health, info, and metrics endpoints |
| Spring Boot Web | Embeds Tomcat; serves Eureka HTTP API & dashboard |
| Spring Boot DevTools | Hot-reload during local development (runtime/optional) |
| Java | 17 (Eclipse Temurin JDK for build, JRE for runtime) |
| Maven | 3.9.4 — Build tool and dependency management |

---

## 3. Repository Structure

```
arya-banking-service-registry/
├── src/
│   ├── main/
│   │   ├── java/org/arya/banking/service/registry/
│   │   │   └── AryaBankingServiceRegistryApplication.java  ← Entry point
│   │   └── resources/
│   │       └── application.yaml                            ← All configuration
│   └── test/
│       └── java/org/arya/banking/service/registry/
│           └── AryaBankingServiceRegistryApplicationTests.java
├── pom.xml                                                  ← Maven build descriptor
├── Dockerfile                                               ← Multi-stage container build
├── docker-compose.yml                                       ← Standalone local run
├── .dockerignore                                            ← Docker build exclusions
└── .gitignore
```

---

## 4. Source File Deep-Dives

### 4.1 AryaBankingServiceRegistryApplication.java

**Location:** `src/main/java/org/arya/banking/service/registry/`

```java
package org.arya.banking.service.registry;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.netflix.eureka.server.EnableEurekaServer;

@SpringBootApplication
@EnableEurekaServer
public class AryaBankingServiceRegistryApplication {
    public static void main(String[] args) {
        SpringApplication.run(AryaBankingServiceRegistryApplication.class, args);
    }
}
```

**Key annotations:**

| Annotation | Effect |
|---|---|
| `@SpringBootApplication` | Composite of `@Configuration`, `@EnableAutoConfiguration`, `@ComponentScan`. Bootstraps the whole Spring context. |
| `@EnableEurekaServer` | Activates the Eureka server auto-configuration: registers the `/eureka/*` REST endpoints, starts the peer-awareness heartbeat scheduler, and serves the Eureka dashboard UI at `/`. |

> **Design Note:** No additional beans, filters, or security config are defined. The service is intentionally thin — its only job is to run the Eureka server. Security is deferred (no `spring-security` dependency present).

---

### 4.2 application.yaml

```yaml
server:
  port: 8761

eureka:
  client:
    service-url:
      defaultZone: http://localhost:8761/eureka
    register-with-eureka: false
    fetch-registry: false

spring:
  application:
    name: arya-banking-service-registry
```

**Configuration property breakdown:**

| Property | Value | Purpose |
|---|---|---|
| `server.port` | `8761` | Standard Eureka server port. All client services use this as their `defaultZone`. |
| `eureka.client.register-with-eureka` | `false` | Prevents the server from registering itself as a client. Critical for standalone mode. |
| `eureka.client.fetch-registry` | `false` | Stops the server from fetching its own registry. Saves memory and avoids self-loop. |
| `eureka.client.service-url.defaultZone` | `http://localhost:8761/eureka` | Points to itself for peer-awareness. In a clustered setup this would list peer nodes. |
| `spring.application.name` | `arya-banking-service-registry` | The name used in logs and, if accidentally registered, in the registry. |

> **Cluster Readiness:** Currently configured for single-node standalone mode. To run a clustered Eureka pair, add a second Spring profile with each node's `defaultZone` pointing to the other node's URL and set `register-with-eureka: true`.

---

### 4.3 AryaBankingServiceRegistryApplicationTests.java

```java
@SpringBootTest
class AryaBankingServiceRegistryApplicationTests {
    @Test
    void contextLoads() { }
}
```

A single context-load smoke test. It boots the full Spring application context including the Eureka server and passes if no exception is thrown. This is the minimum viable test that catches misconfiguration, missing beans, or broken auto-configuration.

---

## 5. Maven Build (pom.xml)

### 5.1 Coordinates & Parent

| POM Field | Value |
|---|---|
| `groupId` | `org.arya.banking` |
| `artifactId` | `arya-banking-service-registry` |
| `version` | `0.0.1-SNAPSHOT` |
| Parent | `spring-boot-starter-parent : 3.5.4` |
| Spring Cloud BOM | `spring-cloud-dependencies : 2025.0.0` |

### 5.2 Dependency Tree

| Dependency | Scope | Purpose |
|---|---|---|
| `spring-boot-starter-actuator` | compile | Exposes `/actuator/health` for Docker & container health checks |
| `spring-boot-starter-web` | compile | Tomcat + Spring MVC; needed to serve the Eureka HTTP API |
| `spring-cloud-starter-netflix-eureka-server` | compile | Core Eureka server engine — version managed by Spring Cloud BOM |
| `spring-boot-devtools` | runtime / optional | Hot-reload in local dev; excluded from production JARs by Maven |
| `spring-boot-starter-test` | test | JUnit 5 + Mockito + Spring Test — for the context-load test |

> **Version Management:** No explicit version numbers are needed for Spring Cloud dependencies — they are all resolved through the `spring-cloud-dependencies` BOM imported under `dependencyManagement`. This ensures Spring Boot and Spring Cloud versions are always compatible.

### 5.3 Build Plugin

The `spring-boot-maven-plugin` is configured without additional customisation. It creates the executable fat JAR (`app.jar`) with all dependencies embedded, used by the Dockerfile `COPY --from=builder` step.

---

## 6. Dockerfile (Multi-Stage Build)

```dockerfile
# Stage 1 — Builder
FROM maven:3.9.4-eclipse-temurin-17 AS builder
WORKDIR /workspace
COPY pom.xml .
COPY src ./src
RUN mvn -B -DskipTests package

# Stage 2 — Runtime
FROM eclipse-temurin:17-jre-jammy
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /workspace/target/*.jar /app/app.jar
EXPOSE 8080
ENV JAVA_OPTS=""
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
```

**Stage-by-stage analysis:**

| Stage | What Happens |
|---|---|
| Stage 1 (builder) | Uses the full Maven + JDK image. Copies `pom.xml` first (Docker layer caching — dependencies are only re-downloaded when `pom.xml` changes). Then copies `src` and runs `mvn package -DskipTests`. |
| Stage 2 (runtime) | Uses the slim JRE-only image (no JDK, no Maven). Installs `curl` so Docker `HEALTHCHECK` and liveness probes work. Copies only the built JAR from Stage 1. |
| `EXPOSE 8080` | ⚠️ Declares port `8080` — **this differs from the actual application port (`8761`)**. EXPOSE is documentation only so the server still binds correctly, but this should be fixed. |
| `JAVA_OPTS` | Empty by default; override at runtime e.g. `-Xms256m -Xmx512m` via Docker `-e` flag or Compose `environment` block. |
| `ENTRYPOINT` | `exec` form via `sh -c` ensures the JVM receives OS signals properly (graceful shutdown on `SIGTERM`). |

> ⚠️ **Port Mismatch:** The Dockerfile declares `EXPOSE 8080` but the application binds to `8761`. Should be updated to `EXPOSE 8761` for consistency.

---

## 7. docker-compose.yml

```yaml
version: '3.8'
services:
  arya-registry:
    build: .
    image: arya-registry:latest
    ports:
      - "8761:8761"
    environment:
      - SERVER_PORT=8761
      - SPRING_PROFILES_ACTIVE=default
    restart: unless-stopped
```

This Compose file is a **standalone development runner**. It is NOT the production Compose definition — that lives in `arya-banking-infra` with the shared `arya-banking-net` network.

| Setting | Notes |
|---|---|
| `build: .` | Triggers the multi-stage Dockerfile build. Switch to `image: arya-registry:latest` after first build for faster restarts. |
| `ports 8761:8761` | Host port mapped directly — makes the dashboard reachable at `http://localhost:8761`. |
| `SERVER_PORT=8761` | Overrides `server.port` via Spring's environment variable binding. Redundant here since `application.yaml` already sets `8761`, but explicit. |
| `SPRING_PROFILES_ACTIVE=default` | For multi-env setups (dev/staging/prod), change this to load different config-server config. |
| `restart: unless-stopped` | Registry auto-restarts on failure or Docker daemon restart, but not when explicitly stopped. |

> **Integration Note:** When running with the full infra stack from `arya-banking-infra`, this service should be added to `platform.yml` using the `arya-banking-net` external network, not run in isolation.

---

## 8. .dockerignore

| Excluded Path / Pattern | Reason |
|---|---|
| `target/` | Maven build output — the Dockerfile runs its own `mvn package` inside the container |
| `.mvn/, .m2/` | Maven wrapper and local repo — not needed in container builds |
| `.git` | Git history — reduces context size, no runtime value |
| `Dockerfile, docker-compose.yml` | Self-referential; no reason to copy these into the image |
| `*.md, *.iml, .idea/, .vscode/` | Documentation and IDE files — zero runtime value |
| `logs/, tmp/` | Local runtime artifacts — should never be baked into an image |

---

## 9. Architecture Context

### 9.1 Position in the Arya Banking Ecosystem

`arya-banking-service-registry` is the **first service in the startup sequence**. Nothing else can communicate without it:

```
Startup Order (dependency chain):

  1. arya-banking-service-registry   ← This repo (must be FIRST)
  2. arya-banking-config-server       ← Registers with Eureka; serves config
  3. arya-banking-api-gateway         ← Uses Eureka for dynamic routing
  4. arya-banking-user-service        ← Registers & discovers peers via Eureka
  5. arya-banking-auth-service        ← Same as above
  6. arya-banking-admin-service       ← Same as above
```

### 9.2 How Client Services Connect

Every client microservice in the platform has the following in its `application.yaml` or `bootstrap.yaml`:

```yaml
eureka:
  client:
    service-url:
      defaultZone: http://arya-banking-service-registry:8761/eureka
  instance:
    prefer-ip-address: true
```

The hostname `arya-banking-service-registry` resolves on the shared Docker network (`arya-banking-net`). For local non-Docker development, clients use `http://localhost:8761/eureka`.

### 9.3 Eureka Dashboard & Endpoints

| URL | Description |
|---|---|
| `http://localhost:8761` | Main dashboard — lists all registered services, instances, lease info, and health status |
| `http://localhost:8761/eureka/apps` | REST endpoint — returns full registry in XML/JSON (used by Eureka clients) |
| `http://localhost:8761/actuator/health` | Spring Actuator health endpoint — returns `{"status":"UP"}` |
| `http://localhost:8761/actuator` | Lists all available actuator endpoints |

---

## 10. Known Issues & Improvement Suggestions

| Issue | Recommendation |
|---|---|
| `EXPOSE 8080` in Dockerfile (wrong port) | Change to `EXPOSE 8761` to match the actual `server.port`. |
| No Docker `HEALTHCHECK` instruction | Add: `HEALTHCHECK --interval=30s --timeout=5s CMD curl -f http://localhost:8761/actuator/health \|\| exit 1` |
| No security on Eureka dashboard | The dashboard and `/eureka/apps` are open with no auth. Add `spring-boot-starter-security` for production. |
| Standalone `docker-compose.yml` not on shared network | Ensure this service joins `arya-banking-net` when integrating with `arya-banking-infra`. |
| No high-availability / peer setup | Single-node Eureka is a SPOF. For prod, run two instances with `register-with-eureka: true` and each pointing to the other in `defaultZone`. |
| Spring Cloud BOM `2025.0.0` | Very recent release — pin to a patch release after stability validation in CI. |

---

## 11. Quick Reference

### 11.1 Common Commands

| Task | Command |
|---|---|
| Run locally (Maven) | `mvn spring-boot:run` |
| Build JAR | `mvn -B -DskipTests package` |
| Build Docker image | `docker build -t arya-registry:latest .` |
| Start with Compose | `docker-compose up -d` |
| View logs | `docker-compose logs -f arya-registry` |
| Stop and remove | `docker-compose down` |
| Open dashboard | `http://localhost:8761` |
| Check health | `curl http://localhost:8761/actuator/health` |
| Check registry | `curl http://localhost:8761/eureka/apps` |

### 11.2 Environment Variables

| Variable | Default & Purpose |
|---|---|
| `SERVER_PORT` | `8761` — overrides `server.port` at runtime |
| `SPRING_PROFILES_ACTIVE` | `default` — activates a named Spring profile |
| `JAVA_OPTS` | _(empty)_ — pass JVM flags e.g. `-Xms256m -Xmx512m -XX:+UseG1GC` |
| `EUREKA_CLIENT_SERVICEURL_DEFAULTZONE` | `http://localhost:8761/eureka` — override for peer Eureka in cluster mode |
