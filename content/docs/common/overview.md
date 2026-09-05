---
title: "Overview"
description: "High-level overview of the modular shared library."
icon: "info"
weight: 100
toc: true
---

## Introduction

`arya-banking-common` is a **multi-module Maven library** for the entire microservices ecosystem. It is not a runnable service — it publishes five independent modules to **GitHub Packages**, each containing a focused slice of shared infrastructure.

Services consume only the modules they need (via the centralized BOM), keeping classpaths lean and dependencies explicit.

---

## Module Structure

The reactor POM builds five modules from a single source tree:

{{< table "table-striped" >}}
| Module | Artifact | Description |
|---|---|---|
| **core** | `org.arya.banking:core` | Domain models (`OutboxEvent`, `User`, etc.), exception hierarchy, DTOs, constants, metadata annotations, and utility classes (`CorrelationIdContext`, `EventContext`, `GsonParser`). |
| **mongo** | `org.arya.banking:mongo` | MongoDB configuration: auditing, date converters, and transaction management via `MongoConfig`. |
| **kafka** | `org.arya.banking:kafka` | Kafka producers, consumers, Avro IDL schemas (compiled to `org.arya.banking.common.avro`), topic constants, `KafkaConfiguration`, and `EventContextAop`. |
| **feign** | `org.arya.banking:feign` | Feign client configuration and `FeignClientErrorDecoder` for inter-service error deserialization. |
| **oauth2** | `org.arya.banking:oauth2` | OAuth2 client credentials configuration for M2M auth. |
{{< /table >}}

A separate **metadata-loader** module (`arya-banking-common-metadata-loader`) runs as a standalone Spring Boot app to snapshot database schema metadata — it is no longer embedded in the library build.

---

## BOM (Bill of Materials)

`arya-banking-bom` is a standalone repository that centralizes all dependency versions:

- **Group ID**: `org.arya.banking`
- **Artifact ID**: `arya-banking-bom`
- **Version**: `2.0.0`

It manages:
- All five common modules (`core`, `mongo`, `kafka`, `feign`, `oauth2`)
- Third-party dependencies (`lombok`, `mapstruct`, `gson`, `avro`, `confluent`, `commons-io`)
- Imports `spring-boot-dependencies` and `spring-cloud-dependencies` BOMs

{{< alert context="info" text="Services only need to declare the BOM import + individual module dependencies. No version numbers are required for managed artifacts." />}}

---

## Dependency Integration

**Step 1**: Add the BOM import in your `pom.xml`:

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.arya.banking</groupId>
            <artifactId>arya-banking-bom</artifactId>
            <version>2.0.0</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
```

**Step 2**: Declare only the modules you need (no versions):

```xml
<dependencies>
    <dependency>
        <groupId>org.arya.banking</groupId>
        <artifactId>core</artifactId>
    </dependency>
    <dependency>
        <groupId>org.arya.banking</groupId>
        <artifactId>kafka</artifactId>
    </dependency>
    <!-- add mongo, feign, oauth2 as needed -->
</dependencies>
```

**Step 3**: Add the GitHub Packages repository:

```xml
<repositories>
    <repository>
        <id>github</id>
        <name>GitHub Packages</name>
        <url>https://maven.pkg.github.com/Event-Based-Banking-Application/arya-banking-maven-registry</url>
    </repository>
</repositories>
```

{{< alert context="info" text="Ensure your <code>settings.xml</code> is configured with a GitHub PAT to authenticate against our private package registry." />}}

---

## Package Structure

Each module uses distinct Java packages to avoid classpath collisions:

| Module | Base Package |
|---|---|
| core | `org.arya.banking.common.core.*` |
| mongo | `org.arya.banking.common.mongo.*` |
| kafka | `org.arya.banking.common.kafka.*` |
| feign | `org.arya.banking.common.feign.*` |
| oauth2 | `org.arya.banking.common.oauth2.*` |

Avro-generated classes remain in `org.arya.banking.common.avro` (compiled by the `kafka` module).

---

## Artifact Details

* **Group ID**: `org.arya.banking`
* **Reactor Artifact ID**: `arya-banking-common`
* **BOM Artifact ID**: `arya-banking-bom`
* **Latest Version**: `2.0.0`
* **Java Version**: 17 (runtime JDK 25 supported)
* **Parent**: None (standalone reactor, no Spring Boot parent)
* **Registry**: [arya-banking-maven-registry]({{< ref "/docs/maven-registry" >}})

---

## CI Build

The GitHub Actions workflow builds and deploys all five modules. The metadata loader is a **separate repository** (`arya-banking-common-metadata-loader`) and is not part of this build.

```bash
mvn clean install       # build all modules locally
mvn clean deploy -s settings.xml  # publish to GitHub Packages
```
