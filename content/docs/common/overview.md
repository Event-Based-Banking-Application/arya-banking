---
title: "Overview"
description: "High-level overview of the foundation shared library."
icon: "info"
weight: 100
toc: true
---

## Introduction

`arya-banking-common` is the foundational Maven library for the entire microservices ecosystem. It is not a runnable service but a shared dependency published to **GitHub Packages**.

Every platform component (`user-service`, `auth-service`, `api-gateway`, etc.) imports this library to ensure consistency across domain models, messaging schemas, and exception handling.

---

## Shared Capabilities

The library provides six core modules used by all services:

{{< table "table-striped" >}}
| Module | Description |
|---|---|
| **Domain Models** | Centralized definition of `User`, `Role`, `Audit`, and `SecurityDetails`. |
| **Kafka & Avro** | Shared producers, consumers, and Avro serialisation schemas. |
| **MongoDB Helpers** | Auditing, custom date converters, and transaction management. |
| **Exception Framework** | Global error hierarchy and `@RestControllerAdvice` handlers. |
| **Metadata Tracking** | Auto-versioning of database schemas via reflection. |
| **Inter-service Auth** | Feign client error decoding and OAuth2 client credentials management. |
{{< /table >}}

---

## Dependency Integration

To include the library in a microservice, add the following to your `pom.xml`:

```xml
<dependency>
    <groupId>org.arya.banking</groupId>
    <artifactId>arya-banking-common</artifactId>
    <version>1.1.9</version>
</dependency>
```

{{< alert context="info" text="Ensure your `settings.xml` is configured with a GitHub PAT to authenticate against our private package registry." />}}

---

## Artifact Details

* **Group ID**: `org.arya.banking`
* **Artifact ID**: `arya-banking-common`
* **Java Version**: 17
* **Parent**: `spring-boot-starter-parent:3.5.3`
