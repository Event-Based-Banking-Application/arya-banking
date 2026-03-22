---
title: "Overview"
description: "High-level summary of the arya-banking-auth-service mission and tech stack."
icon: "info"
weight: 100
toc: true
---

## Introduction

The `arya-banking-auth-service` acts as the **authentication and identity bridge** between the Arya Banking platform and Keycloak. It is the centralized microservice responsible for interacting with the Keycloak Admin API and managing user identities across the ecosystem.

---

## Core Responsibilities

The Auth Service specializes in the following domains:

| Responsibility | Description |
|---|---|
| **Identity Bridging** | Maps internal User IDs to Keycloak identities. |
| **Authentication** | Validates user credentials against Keycloak and issues JWTs. |
| **User Onboarding** | Handles the creation of user records in Keycloak during registration. |
| **Account Security** | Enforces account locking policies after repeated failed login attempts. |
| **Internal Proxy** | Exposes secure endpoints for other microservices (like User Service) to trigger identity operations. |

---

## Technical Stack

The service is built on a modern Spring Cloud foundation designed for high availability and secure identity management.

- **Framework**: Spring Boot 3.5.4
- **Cloud Infrastructure**: Spring Cloud 2025.0.0 (Eureka, Config Server, Vault)
- **Identity Provider**: Keycloak 26.0.4
- **Communication**: 
    - **Feign Clients**: For service-to-service calls (User Service).
    - **Keycloak Admin Client**: For administrative operations.
    - **RestTemplate**: With connection pooling for high-performance token requests.
- **Security**: Spring Security (OAuth2 Resource Server / Client).

---

## Service Architecture Pattern

Unlike other services, the Auth Service does **not** maintain its own primary database. Instead, it treats **Keycloak** as its system of record for identity data, ensuring that the platform's security remains centralized and robust.
