---
title: "Metadata & Versioning"
description: "Automated database schema tracking and semantic versioning."
icon: "schema"
weight: 500
toc: true
---

## Overview

The Arya Banking platform features a custom **Metadata Versioning System** that automatically tracks changes to MongoDB document structures without manual intervention.

---

## How It Works

1.  **Annotation**: Developers mark domain models with `@TrackMetadata`.
2.  **Scanning**: The `MetadataInitializer` scans the classpath for these annotations.
3.  **Hashing**: A deterministic hash is generated based on the class's fields, types, and validation rules.
4.  **Comparison**: The hash is compared against the latest stored metadata in MongoDB.
5.  **Versioning**: If the hash differs, the system calculates a new **Semantic Version** and persists the update.

---

## Semantic Versioning Logic

The system automatically classifies changes to determine the version bump:

{{< table "table-striped" >}}
| Change Type | Version Bump | Trigger |
|---|---|---|
| **MAJOR** | `X.0.0` | A field was removed or a data type changed. |
| **MINOR** | `x.Y.0` | A new field was added. |
| **PATCH** | `x.y.Z` | Nullability or validation rules changed. |
{{< /table >}}

---

## Metadata Loader (Separate Repo)

The metadata loader is a standalone Spring Boot application hosted in its own repository:

**Repository**: `arya-banking-common-metadata-loader`
**Group ID**: `org.arya.banking.common.loader`
**Artifact ID**: `arya-banking-common-metadata-loader`

It depends on the `core` module and runs as an independent process — it is **not** part of the `arya-banking-common` reactor build.

### Running Locally

```bash
cd arya-banking-common-metadata-loader
mvn spring-boot:run
```

Requires a running **Vault** and **MongoDB** instance.

### CI/CD

The loader has its own deployment pipeline and runs after the common library modules are published, ensuring the metadata database stays in sync with the codebase.

---

## Tracked Models

Currently, the following entities are under active metadata tracking:
* `User`
* `Role`
* `SecurityDetails`
* `RegistrationProgress`
* `Audit`
* `UserCredentials`
