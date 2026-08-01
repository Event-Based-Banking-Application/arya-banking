---
title: "Routing & Path Mapping"
description: "Detailed documentation of the gateway's routing rules, Config Server integration, and service discovery."
icon: "api"
weight: 210
toc: true
---

## Overview

The API Gateway does **not** define routes locally. Instead, it pulls routing configuration from the **Spring Cloud Config Server** (`arya-banking-configs`) at `http://config-server:8090` and resolves downstream service endpoints via **Eureka service discovery**.

{{< alert context="info" text="Routes are defined centrally in <code>arya-banking-configs</code> and served to all gateway instances — no local route definitions exist in the gateway codebase." />}}

---

## Config Server Integration

The gateway imports its configuration from the Config Server via:

```yaml
spring:
  config:
    import: 'configserver:'
  cloud:
    config:
      uri: http://localhost:8090
  application:
    name: arya-banking-api-gateway
```

At startup, the gateway fetches `arya-banking-api-gateway.yml` (or shared `application.yml`) from the Config Server, which contains the `spring.cloud.gateway.routes` definitions.

---

## Route Resolution

Routes are resolved through two layers:

### 1. Config Server (Route Definitions)
The Config Server provides the static route rules — path predicates, filters, and target URIs. Routes use the **`lb://`** (load-balanced) scheme to delegate host resolution to Eureka.

Typical route structure in the Config Server:

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: user-service
          uri: lb://arya-banking-user-service
          predicates:
            - Path=/api/users/**
        - id: auth-service
          uri: lb://arya-banking-auth-service
          predicates:
            - Path=/api/auth/**
        - id: admin-service
          uri: lb://arya-banking-admin-service
          predicates:
            - Path=/api/admin/**
```

### 2. Eureka (Dynamic Host Resolution)
When the gateway routes to `lb://arya-banking-user-service`, Eureka resolves the virtual hostname to the actual container or host address, providing load balancing and failover.

---

## Internal vs External Paths

The gateway distinguishes between public-facing APIs and internal service-only endpoints.

### Public/Authenticated Routes (`/api/**`)
These are standard routes for mobile and web clients. They require a valid Keycloak JWT (except for explicit `permitAll` paths like registration and authentication).

### Internal Routes (`/internal/**`)
These routes are reserved for inter-service communication. Access is restricted to tokens containing the `ROLE_INTERNAL_SERVICE` authority, enforced at the gateway security layer.

---

## Filter Configuration

By default, the gateway forwards all request headers, including the `Authorization` bearer token, to the downstream services. It also attaches standard reverse-proxy headers:
* `X-Forwarded-For`
* `X-Forwarded-Host`
* `X-Forwarded-Proto`

---

## Inspecting Active Routes

To view the currently loaded routes on a running gateway instance:

```bash
curl http://localhost:8085/actuator/gateway/routes
```

{{< alert context="tip" text="This endpoint requires administrative privileges (<code>ROLE_ADMIN</code>) and exposes the full route definitions loaded from the Config Server." />}}
