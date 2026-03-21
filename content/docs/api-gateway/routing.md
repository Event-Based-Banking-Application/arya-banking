---
title: "Routing & Path Mapping"
description: "Detailed documentation of the gateway's routing rules and path predicates."
icon: "api"
weight: 200
toc: true
---

## Overview

The API Gateway uses Spring Cloud Gateway's predicate system to map incoming HTTP requests to downstream microservices.

---

## Route Definitions

{{< table "table-striped table-hover" >}}
| Route ID | Path Pattern | Destination URI | Purpose |
|---|---|---|---|
| `user-service` | `/api/users/**` | `http://localhost:8086` | Profile & Identity mgmt |
| `auth-service` | `/api/auth/**` | `http://localhost:8087` | Authentication & Login |
| `admin-service` | `/api/admin/**` | `http://localhost:8089` | Platform Administration |
| `internal-auth` | `/internal/api/auth/**` | `http://localhost:8087` | Service-to-Service auth |
{{< /table >}}

---

## Internal vs External Paths

The gateway distinguishes between public-facing APIs and internal service-only endpoints.

### Public/Authenticated Routes (`/api/**`)
These are standard routes for mobile and web clients. They require a valid Keycloak JWT (except for explicit `permitAll` paths like registration).

### Internal Routes (`/internal/**`)
These routes are reserved for inter-service communication. Access is restricted to tokens containing the `ROLE_INTERNAL_SERVICE` authority.

---

## Filter Configuration

By default, the gateway forwards all request headers, including the `Authorization` bearer token, to the downstream services. It also attaches standard reverse-proxy headers:
* `X-Forwarded-For`
* `X-Forwarded-Host`
* `X-Forwarded-Proto`

---

## Service Discovery (Eureka)

While currently configured with hardcoded URIs for local development, the gateway is registered with **Eureka** as `arya-banking-api-gateway`.

{{< alert context="info" text="Future migrations will transition from `http://localhost:xxxx` to load-balanced URIs using the `lb://service-id` scheme." />}}
