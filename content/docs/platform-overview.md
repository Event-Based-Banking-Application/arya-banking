---
title: "Platform Overview"
description: "High-level overview of the Arya Banking microservices platform."
icon: "info"
weight: 10
toc: true
date: "2025-03-01T00:00:00Z"
lastmod: "2026-03-22T00:00:00Z"
tags: ["overview", "architecture", "microservices"]
---

## What is Arya Banking?

**Arya Banking** is an event-driven microservices platform modelling the core backend of a digital banking application. It is built around a service mesh of independently deployable Spring Boot services coordinated through Spring Cloud infrastructure.

{{< alert context="info" text="Stack: Spring Boot 3.5.4 · Spring Cloud 2025.0.0 · Java 17 · MongoDB · Kafka · Keycloak · HashiCorp Vault · Eureka" />}}

---

## 🏗️ Core Architecture & Guides

Explore the foundational principles and technical guides that power the Arya Banking platform:

{{< table "table-striped table-hover" >}}
| Guide | Description |
|---|---|
| **[System Architecture]({{< ref "/docs/system/system-architecture" >}})** | Component roles, data flow patterns, and network layout. |
| **[Inter-service Communication]({{< ref "/docs/system/inter-service-communication" >}})** | Details on Feign, OAuth2 (M2M), and Kafka event flows. |
| **[Security Model]({{< ref "/docs/system/security-model" >}})** | Comprehensive overview of Keycloak, Vault, and JWT processing. |
| **[Infrastructure Stack]({{< ref "/docs/infra/overview" >}})** | Docker orchestration, networking, and platform setup. |
{{< /table >}}

---

## 🧩 Microservice Documentation

Each service has its own dedicated documentation covering its specific logic, APIs, and configuration:

{{< table "table-striped table-hover" >}}
| Service | Description | Docs |
|---|---|---|
| **Common Library** | Shared domain models, Kafka/Avro schemas, and exceptions | [View Docs →]({{< ref "common" >}}) |
| **API Gateway** | Reactive entry point, JWT validation, and request routing | [View Docs →]({{< ref "api-gateway" >}}) |
| **User Service** | Multi-step registration and profile management | [View Docs →]({{< ref "user-service" >}}) |
| **Auth Service** | Identity bridge and Keycloak user management | [View Docs →]({{< ref "auth-service" >}}) |
| **Admin Service** | Infrastructure administration and secret provisioning | [View Docs →]({{< ref "admin-service" >}}) |
| **Config Server** | Centralized Spring Cloud configuration layer | [View Docs →]({{< ref "config-server" >}}) |
| **Service Registry** | Eureka service discovery server | [View Docs →]({{< ref "service-registry" >}}) |
{{< /table >}}

---

## Repository Map

The platform is distributed across **9 interconnected repositories**:

```text
Event-Based-Banking-Application/
│
├── arya-banking-infra/                  ← Docker Compose infra (Kafka, Keycloak, etc.)
├── arya-banking-configs/                ← Centralized Git-backed configuration
├── arya-banking-service-registry/       ← Eureka Server (Discovery)
├── arya-banking-config-server/          ← Spring Cloud Config Server (Properties)
├── arya-banking-api-gateway/            ← Reactive Entry Point
├── arya-banking-auth-service/           ← Identity Bridge
├── arya-banking-user-service/           ← User Domain
├── arya-banking-admin-service/          ← Infrastructure Admin
└── arya-banking-common/                 ← Shared Library (Maven/GitHub Packages)
```

---

## Quick Reference

- **API Gateway Port**: `8085` (Primary entry point)
- **Shared Network**: `arya-banking-net`
- **Identity Provider**: Keycloak (Port `5433` -> `8080`)
- **Secret Management**: HashiCorp Vault (Port `8091` -> `8200`)
- **Service Discovery**: Eureka (Port `8761`)
