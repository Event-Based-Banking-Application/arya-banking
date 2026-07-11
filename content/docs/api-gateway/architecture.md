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

Routes are defined centrally in the `arya-banking-configs` repository and served to the gateway at startup via the **Spring Cloud Config Server**. The gateway imports configuration using `spring.config.import: 'configserver:'` pointed at `http://config-server:8090`.

Route targets use the `lb://` scheme (e.g., `lb://arya-banking-user-service`) so that **Eureka** resolves the downstream service address dynamically.

### Route Access Tiers

The Gateway enforces three tiers of access:
- **Public Routes**: No authentication required (e.g., `/api/users/register`, `/api/auth/authenticate`).
- **Internal Routes**: Require `ROLE_INTERNAL_SERVICE` authority in the JWT (e.g., `/internal/**`).
- **Authenticated Routes**: All other paths require a valid Keycloak JWT.

---

## Dockerized Deployment

The API Gateway is containerized alongside the Service Registry and Config Server in `compose/platform.yml`. The Docker image is built via GitHub Actions on version tags and pushed to Docker Hub as `karthikulkarni/arya-banking-api-gateway:latest`.

{{< alert context="info" text="See the [Infrastructure &rarr; Docker Compose]({{< ref \"/docs/infra/docker-compose\" >}}) page for the full platform stack configuration." />}}

## Service Discovery

The Gateway registers itself with **Eureka** (Service Registry) and uses it for downstream route resolution. Routes defined in the Config Server use the `lb://` scheme (e.g., `lb://arya-banking-user-service`), which Eureka resolves to the actual host and port — enabling load balancing and failover.

---

## Monitoring & Health

The Gateway exposes actuator endpoints at `/actuator/health` and `/actuator/gateway/routes` for operational monitoring. 

{{< alert context="info" text="For a list of active routes, you can query the <code>/actuator/gateway/routes</code> endpoint (requires <code>ROLE_ADMIN</code>)." />}}
