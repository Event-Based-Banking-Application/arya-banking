---
title: "CI/CD & Build"
description: "GitHub Actions workflows, Maven build configuration, and Docker image generation."
icon: "build"
weight: 1000
toc: true
date: "2025-03-20T00:00:00Z"
lastmod: "2025-03-20T00:00:00Z"
tags: ["cicd", "github-actions", "maven", "docker"]
---

## GitHub Actions Workflows

One workflow is defined under `.github/workflows/`.

---

### deploy.yml — Build & Release

**Trigger:** Push to `master` branch, or manual `workflow_dispatch`.

```mermaid
flowchart LR
    T["Push to master"] --> A["Checkout source"]
    A --> B["Setup Java 17 (Temurin)"]
    B --> C["Cache ~/.m2/repository"]
    C --> D["mvn clean deploy\n(-s settings.xml)"]
    D --> E["Extract version\nfrom pom.xml"]
    E --> F["Create + push\ngit tag vX.Y.Z"]
```

**Key details:**
- Publishes the JAR to **GitHub Packages** using the `GH_PAT` secret.
- Automatically tags the commit with the version from `pom.xml` (e.g., `v1.0.0`).
- The `settings.xml` at the repo root wires GitHub Packages authentication using `GITHUB_ACTOR` and `GH_PAT`.

---

## Maven Build Configuration

### Key Build Plugins

{{< table "table-striped table-sm" >}}
| Plugin | Version | Purpose |
|---|---|---|
| `maven-compiler-plugin` | `3.11.0` | Wires MapStruct + Lombok annotation processors in the correct order |
| `spotbugs-maven-plugin` | `4.8.6.1` | Static bytecode analysis — flags potential bugs |
| `jacoco-maven-plugin` | `0.8.13` | Code coverage instrumentation and XML report generation |
| `spring-boot-maven-plugin` | — | Produces executable JAR + Buildpack container image |
{{< /table >}}

### Annotation Processor Order

MapStruct must run **after** Lombok so that Lombok-generated getters/setters are visible to MapStruct during compilation:

```xml {linenos=table, anchorlinenos=true}
<compilerArgs>
  <arg>-Amapstruct.suppressGeneratorTimestamp=true</arg>
  <arg>-Amapstruct.defaultComponentModel=spring</arg>
</compilerArgs>
<annotationProcessorPaths>
  <path>org.projectlombok:lombok:1.18.36</path>
  <path>org.mapstruct:mapstruct-processor:1.5.5.Final</path>
</annotationProcessorPaths>
```

### Container Image

The `spring-boot-maven-plugin` builds a container image using **Cloud Native Buildpacks** with an **Ubuntu Noble** base:

```bash {linenos=table, anchorlinenos=true}
mvn spring-boot:build-image
```

The resulting image is tagged as `arya-banking-admin-service:{version}`.

---

## Local Docker Compose

A `docker-compose.yaml` at the repo root provides a minimal local Kafka stack for testing future event publishing features:

```yaml {linenos=table, anchorlinenos=true}
services:
  kafka:
    image: confluentinc/cp-kafka
    ports:
      - 9092:9092
      - 29092:29092
      - 29093:29093
    environment:
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_NODE_ID: 1
      CLUSTER_ID: 5hci6rGNQECCvCLOiFDKow

  schema-registry:
    image: confluentinc/cp-schema-registry
    ports:
      - 8081:8081
    depends_on:
      - kafka
```

{{< alert context="info" text="The full platform infrastructure (Vault, Keycloak, Eureka, Config Server, MongoDB) is managed in the arya-banking-infra repository using concern-based Compose files sharing the arya-banking-net Docker network." />}}
