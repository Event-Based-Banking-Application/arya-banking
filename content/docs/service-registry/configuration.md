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
