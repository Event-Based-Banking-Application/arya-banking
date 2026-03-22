---
title: "Architecture"
description: "High-level architecture of the Arya Banking API Gateway."
icon: "account_tree"
weight: 200
toc: true
---

## Reactive Stack

The `arya-banking-api-gateway` is built on **Spring Cloud Gateway**, leveraging a non-blocking, reactive architecture (Spring WebFlux) powered by the Netty server.

### Role in the Platform

The Gateway serves as the **Single Entry Point** (Ingress) for all external clients (Browser, Mobile, Postman). It handles:

1.  **Request Routing**: Directing traffic to the appropriate microservice based on path predicates.
2.  **Cross-Cutting Concerns**: Authentication (JWT validation), CORS, and Rate Limiting.
3.  **Security Filtering**: Enforcing standard security headers and preventing unauthorized access to internal routes.

---

## Routing Engine

Routes are defined centrally in `arya-banking-configs/application.yml`. The Gateway dynamically routes requests based on the path prefix.

### Internal vs Public Routes

The Gateway enforces a distinction between:
- **Public Routes**: Accessible without authentication (e.g., `/api/users/register`, `/api/auth/authenticate`).
- **Private Routes**: Require a valid JWT issued by Keycloak.
- **Internal Routes**: Hidden from the Gateway or restricted at the source (e.g., `/internal/**`).

---

## Service Discovery

The Gateway registers itself with the **Service Registry (Eureka)**. When routing to a microservice, it typically uses the service ID (e.g. `http://arya-banking-user-service`) unless direct URI overrides are active.

---

## Monitoring & Health

The Gateway exposes actuator endpoints at `/actuator/health` and `/actuator/gateway/routes` for operational monitoring. 

{{< alert context="info" text="For a list of active routes, you can query the <code>/actuator/gateway/routes</code> endpoint (requires <code>ROLE_ADMIN</code>)." />}}
