---
title: "Configuration Reference"
description: "Application properties, environment variables, and Docker settings for the Service Registry."
icon: "settings"
weight: 300
toc: true
---

## Application Configuration (`application.yaml`)

The Eureka server requires specific properties to operate in standalone mode (preventing it from trying to register with itself).

{{< prism lang="yaml" linkable-line-numbers="true" line-numbers="true" >}}
server:
  port: 8761

eureka:
  client:
    service-url:
      defaultZone: http://localhost:8761/eureka
    register-with-eureka: false   # Critical for standalone mode
    fetch-registry: false         # Saves memory, prevents self-loop

spring:
  application:
    name: arya-banking-service-registry
{{< /prism >}}

{{< alert context="info" >}}
**Cluster Readiness:** Currently configured for single-node standalone mode. To run a clustered Eureka pair, add a second Spring profile with each node's `defaultZone` pointing to the other node's URL and set `register-with-eureka: true`.
{{< /alert >}}

---

## Platform Stack Integration

When running as part of the full platform stack via `arya-banking-infra/compose/platform.yml`, the Service Registry is the first container to start. The Config Server and API Gateway depend on it.

```yaml
# From compose/platform.yml
service-registry:
  image: karthikulkarni/arya-banking-service-registry:latest
  container_name: service-registry
  ports:
    - "8761:8761"
  networks:
    - arya-banking-net
```

{{< alert context="info" text="Refer to the [Infrastructure &rarr; Docker Compose]({{< ref \"/docs/infra/docker-compose\" >}}) page for the complete platform.yml configuration." />}}

---

## Environment Variables

When running via Docker Compose or in production, you can override default settings using environment variables.

{{< table "table-striped table-sm" >}}
| Variable | Default & Purpose |
|----------|-------------------|
| `SERVER_PORT` | `8761` — Overrides `server.port` at runtime |
| `SPRING_PROFILES_ACTIVE` | `default` — Activates a named Spring profile |
| `JAVA_OPTS` | _(empty)_ — Pass JVM memory flags e.g. `-Xms256m -Xmx512m` |
| `EUREKA_CLIENT_SERVICEURL_DEFAULTZONE` | `http://localhost:8761/eureka` — Peer URL in cluster mode |
{{< /table >}}

---

## Dockerfile Build Stages

The Service Registry uses a multi-stage Dockerfile to minimize the runtime footprint.

{{< tabs tabTotal="2" >}}
{{% tab tabName="Stage 1: Builder" %}}
Uses `maven:3.9.4-eclipse-temurin-17`.
Downloads dependencies via `pom.xml` layer caching, then copies `src/` and runs `mvn -B -DskipTests package` to generate the fat JAR.
{{% /tab %}}

{{% tab tabName="Stage 2: Runtime" %}}
Uses `eclipse-temurin:17-jre-jammy` (slim JRE-only).
Copies the built JAR from Stage 1. Exposes port `8080` (Note: should be updated to `8761`) and executes using `java -jar`.
{{% /tab %}}
{{< /tabs >}}

---

## Docker Build

### Dockerfile

```dockerfile
# Stage 1 — Build
FROM maven:3.9.4-eclipse-temurin-17 AS build
WORKDIR /workspace
COPY pom.xml .
RUN mvn -B dependency:go-offline
COPY src ./src
RUN mvn -B -DskipTests clean package

# Stage 2 — Runtime
FROM eclipse-temurin:17-jre-jammy
COPY --from=build /workspace/target/*.jar /app/app.jar
EXPOSE 8080
ENTRYPOINT ["java","-jar","/app/app.jar"]
```

{{< alert context="warning" text="Port discrepancy — the Dockerfile exposes <code>8080</code> while the application actually runs on <code>8761</code> (<code>server.port: 8761</code> in <code>application.yaml</code>). The compose mapping compensates by mapping <code>8761:8761</code> and setting <code>SERVER_PORT=8761</code>, but the <code>EXPOSE 8080</code> instruction should be corrected to <code>8761</code>." />}}

### Standalone `docker-compose.yml`

The registry repo includes its own compose file for running the Eureka server standalone:

```yaml
services:
  arya-registry:
    image: arya-registry:latest
    ports:
      - "8761:8761"
    environment:
      SERVER_PORT: 8761
      SPRING_PROFILES_ACTIVE: default
    restart: unless-stopped
```

{{< table "table-striped table-sm" >}}
| Setting | Value |
|---|---|
| Service name | `arya-registry` |
| Image | `arya-registry:latest` (built from the repo's own Dockerfile) |
| Port mapping | `8761:8761` |
| `SERVER_PORT` | `8761` — overrides `server.port` at runtime |
| `SPRING_PROFILES_ACTIVE` | `default` |
| Restart policy | `unless-stopped` |
{{< /table >}}

{{< alert context="info" text="No CI workflows exist in this repository — the Service Registry image is not published to a container registry. In the platform stack (<code>arya-banking-infra/compose/platform.yml</code>) it is referenced as <code>karthikulkarni/arya-banking-service-registry:latest</code>, so the image must be built and published separately." />}}
