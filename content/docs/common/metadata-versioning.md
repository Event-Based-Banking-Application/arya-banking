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

## The Metadata Loader

To trigger a schema snapshot, run the library with the `metadata-loader` profile:

```bash
mvn install -Pmetadata-loader
```

{{< alert context="info" text="This is typically run during the CI/CD pipeline after a successful build to ensure the metadata database stays in sync with the codebase." />}}

---

## Tracked Models

Currently, the following entities are under active metadata tracking:
* `User`
* `Role`
* `SecurityDetails`
* `RegistrationProgress`
* `Audit`
* `UserCredentials`
