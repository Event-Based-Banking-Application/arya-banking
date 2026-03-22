---
title: "Overview"
description: "High-level overview of the arya-banking-user-service."
icon: "info"
weight: 100
toc: true
---

## Service Summary

`arya-banking-user-service` is the **core user domain microservice** for the Arya Banking platform. It owns the entire user lifecycle, from multi-step registration to profile updates and account security.

The service is built with **Spring Boot 3.5.4** and uses **MongoDB** as its primary data store. It integrates with the platform's infrastructure for configuration (Config Server), secrets (Vault), service discovery (Eureka), and event-driven communication (Kafka).

{{< alert context="info" text="This service implements a 3-step registration state machine to ensure data integrity during user onboarding." />}}

---

## Core Responsibilities

{{< table "table-striped table-sm" >}}
| Responsibility | Description |
|---|---|
| **User Registration** | Manages a 3-step flow: Basic Details → Address → Security Questions. |
| **Profile Management** | Updates for user contact information and physical addresses. |
| **Security Management** | Tracks failed login attempts and manages account locking/blocking. |
| **Identity Sync** | Synchronizes user credentials with Keycloak via the Auth Service. |
| **Event Publishing** | Emits `user-create-event` to Kafka for downstream consumption. |
{{< /table >}}

---

## Repository Structure

```text
arya-banking-user-service/
├── src/main/java/org/arya/banking/user/
│   ├── controller/      ← REST Endpoints (/api/users, /internal/api/...)
│   ├── service/         ← Business logic (UserService, SecurityDetailsService)
│   ├── repository/      ← Spring Data MongoDB repositories
│   ├── dto/             ← Request/Response records with Validation
│   ├── mapper/          ← MapStruct entity-DTO conversions
│   ├── util/            ← UserValidator registration engine
│   └── config/          ← Kafka, Security, and Mongo configurations
└── src/main/resources/
    ├── application.yaml ← Main configuration (OAuth2, Kafka topics)
    └── bootstrap.yml    ← Startup config (Vault AppRole, Config Server)
```

---

## Technical Stack

- **Framework:** Spring Boot 3.5.4 (Spring Cloud 2025.0.0)
- **Database:** MongoDB (Spring Data MongoDB)
- **Security:** Spring Security (OAuth2 Resource Server + JWT)
- **Messaging:** Apache Kafka (Spring Kafka + Avro)
- **Inter-service:** OpenFeign with OAuth2 Interceptor
- **Mapping:** MapStruct
- **Documentation:** SpringDoc / Swagger UI
