---
title: "Overview"
description: "What the admin-service does, its role in the Arya Banking platform, and the tech stack powering it."
icon: "info"
weight: 100
toc: true
date: "2025-03-20T00:00:00Z"
lastmod: "2025-03-20T00:00:00Z"
author: "Karthik Kulkarni"
tags: ["admin-service", "overview", "microservices"]
---

## What is the Admin Service?

The `arya-banking-admin-service` is the administrative backbone of the **Arya Banking** event-driven microservices platform. It serves a dual purpose:

- **Infrastructure Administration** — Manages HashiCorp Vault secrets, AppRole credentials, and HCL policies programmatically via a REST API.
- **Identity Administration** — Manages Keycloak realm roles and inter-service OAuth2 clients via the Keycloak Admin Client.

All APIs are protected by **JWT-based OAuth2 Resource Server** (Keycloak-issued tokens) and role-checked at the method level via a custom `RolePermissionValidator` backed by the `security.api-roles` configuration map.

---

## Service Coordinates

{{< table "table-striped table-sm" >}}
| Property | Value |
|---|---|
| **Artifact** | `org.arya.banking:arya-banking-admin-service` |
| **Version** | `1.0.0` |
| **Java** | `17` |
| **Spring Boot** | `3.5.4` |
| **Spring Cloud** | `2025.0.0` |
| **Common Library** | `arya-banking-common:1.1.9` |
| **Server Port** | `8089` |
| **Base API Path** | `/api/admin` |
| **GitHub Repo** | `Event-Based-Banking-Application/arya-banking-admin-service` |
{{< /table >}}

---

## Responsibilities

The admin-service is the **only service** in the platform that has elevated Vault and Keycloak privileges. Other services receive read-only access; the admin-service provisions, manages, and rotates that access.

### Vault Management
- Create, read, update, and delete KV v2 secrets scoped to individual services under `secret/arya-banking/{service}/dev`
- Full CRUD over Vault AppRoles — including generating fresh `roleId` / `secretId` credential pairs
- Upload and delete HCL policy files (stored as classpath resources, versioned in Git)

### Keycloak Management
- Create confidential OAuth2 clients for inter-service communication (service accounts flow)
- Create, list, and query realm-level roles
- Assign the `INTERNAL_SERVICE` realm role to the service account of newly-created clients

---

## Technology Stack

{{< table "table-striped table-sm" >}}
| Layer | Technology |
|---|---|
| Framework | Spring Boot 3.5.4 + Spring Cloud 2025.0.0 |
| REST API | Spring Web MVC |
| Security | Spring Security OAuth2 Resource Server (JWT) |
| Secrets | HashiCorp Vault (AppRole auth, KV v2) |
| Identity | Keycloak Admin Client v26.0.4 |
| Service Discovery | Netflix Eureka Client |
| Config Server | Spring Cloud Config |
| Database | MongoDB (via `arya-banking-common`) |
| Mapping | MapStruct 1.5.5 |
| API Docs | SpringDoc OpenAPI / Swagger UI |
| Build | Maven + Spring Boot Buildpacks |
| CI/CD | GitHub Actions |
{{< /table >}}

{{< alert context="info" text="Kafka (spring-kafka + kafka-streams) and Spring Batch are declared as Maven dependencies but are not yet implemented. They are reserved for future event publishing and batch processing features." />}}
