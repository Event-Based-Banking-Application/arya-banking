---
title: "Configuration"
description: "Deep dive into arya-banking-configs, global defaults, and secrets injection."
icon: "settings"
weight: 300
toc: true
---

## Overview

`arya-banking-configs` is a pure configuration repository (it contains no Java code or build files). The Config Server automatically mirrors this repo and exposes its contents logically.

### File Naming Convention

Spring Cloud Config Server resolves files hierarchically to merge properties. Files in the Git repo should be named according to the following conventions:

{{< table "table-striped table-sm" >}}

| Pattern / Filename | Loaded By |
|---|---|
| `application.yml` | **All** microservices (global defaults) |
| `{application}.yml` | Only the specific microservice (e.g. `user-service.yml`) |
| `{application}-{profile}.yml` | Only when a specific profile is active (e.g. `user-service-docker.yml`) |

{{< /table >}}

Properties defined in files lower down the hierarchy **override** the global defaults.

---

## Global Defaults (`application.yml`)

The root `application.yml` file contains shared settings inherited by the entire Arya Banking ecosystem. Any configuration placed here does not need to be duplicated in individual microservices.

### Eureka Client

```yaml
eureka:
  client:
    service-url:
      defaultZone: http://localhost:8761/eureka
```

{{< alert context="info" text="This value points all microservices to the service registry. It must be explicitly overridden via Docker Compose (`EUREKA_CLIENT_SERVICEURL_DEFAULTZONE`) or profile-specific configs when running in containerized environments." />}}

### Kafka & Schema Registry

```yaml
spring:
  kafka:
    bootstrap-servers: localhost:9092
    properties:
      schema.registry.url: http://localhost:8081
```

### Gateway Routes

The API Gateway routes are mapped centrally here for the `arya-banking-api-gateway`. Starting from Spring Cloud 2025.0.0, the route definitions use the `webflux` key structure rather than the older standard structure:

```yaml
spring:
  cloud:
    gateway:
      server:
        webflux:
          routes:
            - id: user-service
              uri: http://localhost:8086
              predicates:
                - Path=/api/users/**,/api/security-details/**
```

---

## Secrets Management

Database URIs and passwords intentionally omit hardcoded credentials in the repository to prevent leaking sensitive secrets to version control.

```yaml
spring:
  data:
    mongodb:
      uri: mongodb+srv://admin:${spring.application.mongo-password}@bankingcluster.ayhvgpk.mongodb.net/${spring.application.database}
```

{{% alert icon="🔒" context="warning" %}}
**Security Pattern:** Placeholders like `${spring.application.mongo-password}` are **not** defined in this Git repo. Instead, they are injected dynamically at runtime by **HashiCorp Vault** via `bootstrap.yaml` inside each respective microservice!
{{% /alert %}}
