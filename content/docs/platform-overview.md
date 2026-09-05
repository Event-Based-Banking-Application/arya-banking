---
title: "Platform Overview"
description: "High-level overview of the Arya Banking microservices platform."
icon: "info"
weight: 10
toc: true
date: "2025-03-01T00:00:00Z"
lastmod: "2026-09-06T00:00:00Z"
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
| **[Local Development Setup]({{< ref "/docs/local-development/overview" >}})** | Step-by-step guide to running the full platform locally. |
| **[Outbox Pattern]({{< ref "/docs/outbox-service/overview" >}})** | Transactional outbox library for reliable Kafka publishing. |
| **[Maven Registry]({{< ref "/docs/maven-registry/overview" >}})** | Publishing and consuming internal artifacts via GitHub Packages. |
{{< /table >}}

---

## 🧩 Microservice Documentation

Each service has its own dedicated documentation covering its specific logic, APIs, and configuration:

{{< table "table-striped table-hover" >}}
| Service | Description | Docs |
|---|---|---|
| **Common Library** | Shared domain models, Kafka/Avro schemas, and exceptions (5 modules: core, mongo, kafka, feign, oauth2) | [View Docs →]({{< ref "/docs/common" >}}) |
| **BOM** | Centralized dependency version management for all common modules | [View Docs →]({{< ref "/docs/maven-registry/overview" >}}) |
| **Metadata Loader** | Standalone schema versioning tool | [View Docs →]({{< ref "/docs/common/metadata-versioning" >}}) |
| **API Gateway** | Reactive entry point, JWT validation, and request routing | [View Docs →]({{< ref "/docs/api-gateway" >}}) |
| **User Service** | Multi-step registration and profile management | [View Docs →]({{< ref "/docs/user-service" >}}) |
| **Auth Service** | Identity bridge and Keycloak user management | [View Docs →]({{< ref "/docs/auth-service" >}}) |
| **Admin Service** | Infrastructure administration and secret provisioning | [View Docs →]({{< ref "/docs/admin-service" >}}) |
| **Config Server** | Centralized Spring Cloud configuration layer | [View Docs →]({{< ref "/docs/config-server" >}}) |
| **Service Registry** | Eureka service discovery server | [View Docs →]({{< ref "/docs/service-registry" >}}) |
| **Outbox Service** | Transactional outbox pattern starter library | [View Docs →]({{< ref "/docs/outbox-service" >}}) |
| **Maven Registry** | GitHub Packages artifact registry | [View Docs →]({{< ref "/docs/maven-registry" >}}) |
{{< /table >}}

---

## Repository Map

The platform is distributed across **11 interconnected repositories**:

```text
Event-Based-Banking-Application/
│
├── arya-banking/                        ← Documentation site (Next.js)
├── arya-banking-infra/                  ← Docker Compose infra (Kafka, Keycloak, Vault)
├── arya-banking-configs/                ← Centralized Git-backed configuration
│
├── arya-banking-common/                 ← Shared Maven library (5 modules: core, mongo, kafka, feign, oauth2)
├── arya-banking-bom/                    ← Bill of Materials (centralized dependency versions)
├── arya-banking-common-metadata-loader/ ← Standalone metadata schema versioning tool
├── arya-banking-outbox-service/         ← Outbox pattern starter library
├── arya-banking-maven-registry/         ← GitHub Packages Maven registry anchor
│
├── arya-banking-service-registry/       ← Eureka Server (Discovery)
├── arya-banking-config-server/          ← Spring Cloud Config Server
├── arya-banking-api-gateway/            ← Reactive entry point
│
├── arya-banking-user-service/           ← User domain
├── arya-banking-auth-service/           ← Identity bridge
└── arya-banking-admin-service/          ← Infrastructure admin
```

---

## Quick Reference

{{< table "table-striped table-hover table-sm" >}}
| Service | Port | Description |
|---------|------|-------------|
| **API Gateway** | `8085` | Primary entry point (Docker) |
| **User Service** | `8086` | User domain (Host) |
| **Auth Service** | `8087` | Identity bridge (Host) |
| **Admin Service** | `8089` | Infrastructure admin (Host) |
| **Config Server** | `8090` | Centralized configuration (Docker) |
| **Vault** | `8091` | Secrets management + UI (Docker) |
| **Eureka** | `8761` | Service discovery dashboard (Docker) |
| **Kafka** | `9092` / `29092` | Messaging — external / internal (Docker) |
| **Schema Registry** | `8081` | Confluent Avro schema registry (Docker) |
| **Kafka Connect** | `8083` | Kafka Connect REST API (Docker) |
| **Kafka UI (Kafbat)** | `8080` | Kafka web UI (Docker) |
| **Keycloak** | `5433` | IAM admin + auth (Docker) |
| **PostgreSQL** | `5432` | Keycloak database (Docker) |
{{< /table >}}

- **Shared Network**: `arya-banking-net`
- **Infrastructure Runs In**: Docker containers via `arya-banking-infra`
- **Business Services Run On**: Host via `mvn spring-boot:run`
- **Secrets**: HashiCorp Vault with AppRole authentication (local `vault-credentials.yml`)
- **Docs Site**: <https://event-based-banking-application.github.io/arya-banking/>
- **Maven Registry**: `https://maven.pkg.github.com/Event-Based-Banking-Application/arya-banking-maven-registry`
