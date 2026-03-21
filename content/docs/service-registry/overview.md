---
title: "Overview"
description: "High-level summary of the Service Registry, its role, and technology stack."
icon: "info"
weight: 100
toc: true
---

## Role in the Ecosystem

`arya-banking-service-registry` is the **first infrastructure service** that must be running before any other microservice can register or be discovered. It acts as the central phone-book for the entire Arya Banking ecosystem.

{{< alert context="primary" text="Every microservice (user-service, auth-service, admin-service, api-gateway, config-server) registers here at startup and queries it for peer locations." />}}

---

## Technology Stack

The Service Registry is intentionally thin—its only job is to run the Eureka server engine.

{{< table "table-striped table-sm" >}}
| Technology | Version / Purpose |
|------------|-------------------|
| Spring Boot | 3.5.4 — Framework and auto-configuration |
| Netflix Eureka | 2025.0.0 (Spring Cloud BOM) — Core registry engine |
| Java | 17 (Eclipse Temurin) |
| Web & Actuator | Tomcat web server and health metrics |
{{< /table >}}
