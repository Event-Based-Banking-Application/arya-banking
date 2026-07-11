---
title: "Getting Started"
description: "Building, running, and configuring the Config Server application locally and via Docker."
icon: "rocket_launch"
weight: 400
toc: true
---

## Build Commands

The `arya-banking-config-server` uses Maven and is optimized for multi-stage Docker builds.

{{< table "table-striped table-sm" >}}

| Task | Command |
|---|---|
| Build Fat JAR | `mvn -B -DskipTests package` |
| Build Docker Image | `docker build -t arya-banking-config-server:latest .` |
| Start via Platform Stack | `docker compose -f compose/platform.yml up -d` (from `arya-banking-infra`) |

{{< /table >}}

{{< alert context="info" text="The project requires Java 17 and Spring Boot 3.5.x." />}}

---

## Multi-Stage Dockerfile

The production Dockerfile is securely designed to run as a non-root User (`app`).

```dockerfile
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

{{% alert icon="💡" context="primary" %}}
**JGit Configuration:** The `mkdir -p /home/app/.config/jgit` step in the Dockerfile is critical. Spring Cloud Config uses **JGit** under the hood, which strictly requires a writable `~/.config/jgit` path to successfully clone the `arya-banking-configs` repository in a containerized environment.
{{% /alert %}}

---

## Environment Variables

When running locally or via Docker Compose, the following variables dictate the server's behavior:

{{< table "table-striped table-sm" >}}

| Variable | Default Value | Purpose |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | `default` | Activates environment profiles. |
| `EUREKA_CLIENT_SERVICEURL_DEFAULTZONE` | `http://localhost:8761/eureka` | Override Eureka location (critical for Docker networking). |
| `SPRING_CLOUD_CONFIG_SERVER_GIT_URI` | GitHub URL | The backend config repository URI to clone. |

{{< /table >}}

---

## Known Issues & Debugging

Several configuration bugs currently exist in the repository that may affect deployment:

1. **Typo in Eureka Zone:** The `application.yaml` in the config-server repository contains a typo (`http://localhosat:8761/eureka`) in the `eureka.client.service-url.defaultZone` property. While environment variables mask this in Docker, running it standalone locally will fail to register with Eureka.
2. **Compose Service Name Mismatch:** The `docker-compose.yml` sets the Eureka URL pointing to `http://registry:8761`, but the dependency block is currently incorrectly named `service-registry`.
3. **Missing Actuator:** The server does not declare the `spring-boot-starter-actuator` dependency, meaning `/actuator/health` is inaccessible for Docker container `HEALTHCHECK` assertions.
