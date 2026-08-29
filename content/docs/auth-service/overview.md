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
| **Event-Driven Identity Sync** | Publishes and consumes user lifecycle events via Kafka (UserCreateEvent, UserLockEvent, LoginFailedEvent). |

---

## Technical Stack

The service is built on a modern Spring Cloud foundation designed for high availability and secure identity management.

- **Framework**: Spring Boot 3.5.4
- **Cloud Infrastructure**: Spring Cloud 2025.0.0 (Eureka, Config Server, Vault)
- **Identity Provider**: Keycloak 26.0.4
- **Messaging**: Apache Kafka (Spring Kafka + Confluent Avro Serializer)
- **Communication**: 
    - **Feign Clients**: For service-to-service calls (User Service).
    - **Keycloak Admin Client**: For administrative operations.
    - **RestTemplate**: With connection pooling for high-performance token requests.
- **Security**: Spring Security (OAuth2 Resource Server / Client).

---

## Service Architecture Pattern

Unlike other services, the Auth Service does **not** maintain its own primary database. Instead, it treats **Keycloak** as its system of record for identity data, ensuring that the platform's security remains centralized and robust.

---

## Event Integration (Kafka)

The Auth Service now participates in the platform's event-driven architecture via Kafka:

### Producer: `UserEventProducer`
Publishes Avro-encoded events to Kafka topics:
- **`user.create.event`** — `UserCreateEvent` when a user is registered
- **`auth.failed.event`** — `LoginFailedEvent` when login fails (triggers account locking logic)

### Consumer: `UserUpdateEventListener`
Listens on **`user.update.event`** (via `KafkaListenerConfig`) to consume `UserCreateEvent` from the User Service's outbox relay. When received, delegates to `KeyCloakService.onUserUpdateEvent()` for processing.

### Consumer: `UserEventListeners` (in User Service)
The User Service consumes `LoginFailedEvent` from `auth.failed.event` to increment failed login attempts and block accounts after 5 failures.

### Configuration
- `KafkaListenerConfig` provides a `ConcurrentKafkaListenerContainerFactory` bean using the shared `KafkaConfiguration` from `arya-banking-common`.
- Consumer group: `auth-service-group`
- Deserializer: Confluent `KafkaAvroDeserializer` with `specific.avro.reader=true`
