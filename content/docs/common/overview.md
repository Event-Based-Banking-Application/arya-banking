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
    <version>1.2.0</version>
</dependency>
```

{{< alert context="info" text="Ensure your `settings.xml` is configured with a GitHub PAT to authenticate against our private package registry." />}}

### Swagger Compatibility

The common library transitively depends on `kafka-avro-serializer` which pulls in an older `swagger-annotations:2.1.10`. If your service uses `springdoc-openapi` version 2.8.9+, this causes a `NoSuchMethodError` at startup because `Schema.requiredMode()` is missing.

**Fix**: Exclude the old swagger from the common dependency in your service's `pom.xml`:

```xml
<dependency>
    <groupId>org.arya.banking</groupId>
    <artifactId>arya-banking-common</artifactId>
    <version>1.2.0</version>
    <exclusions>
        <exclusion>
            <groupId>io.swagger.core.v3</groupId>
            <artifactId>swagger-annotations</artifactId>
        </exclusion>
    </exclusions>
</dependency>
```

---

## Artifact Details

* **Group ID**: `org.arya.banking`
* **Artifact ID**: `arya-banking-common`
* **Java Version**: 17
* **Parent**: `spring-boot-starter-parent:3.5.3`

---

## CI Build

The GitHub Actions workflow builds and deploys the library. The metadata loader (exec-maven-plugin) is **skipped in CI** via `-P!metadata-loader` since it requires a running Vault and MongoDB. To run it locally:

```bash
mvn clean install    # metadata-loader runs automatically (activeByDefault)
```

To skip it locally:

```bash
mvn clean install -P!metadata-loader
```
