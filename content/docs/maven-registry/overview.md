---
title: "Overview"
description: "The GitHub Packages Maven endpoint and the artifacts hosted in arya-banking-maven-registry."
icon: "info"
weight: 100
toc: true
---

## What is the Maven Registry?

`arya-banking-maven-registry` anchors the **GitHub Packages Maven endpoint** for the Arya Banking platform:

```
https://maven.pkg.github.com/Event-Based-Banking-Application/arya-banking-maven-registry
```

It contains **no source code** — it exists solely to satisfy the GitHub Packages URL convention, so all Arya Banking artifacts resolve from a single, predictable repository URL.

---

## Hosted Artifacts

{{< table "table-striped table-sm" >}}
| Artifact | Version | Source Repository |
|---|---|---|
| `org.arya.banking:arya-banking-bom` | `2.0.0` | `arya-banking-bom` |
| `org.arya.banking:core` | `2.0.0` | `arya-banking-common` |
| `org.arya.banking:mongo` | `2.0.0` | `arya-banking-common` |
| `org.arya.banking:kafka` | `2.0.0` | `arya-banking-common` |
| `org.arya.banking:feign` | `2.0.0` | `arya-banking-common` |
| `org.arya.banking:oauth2` | `2.0.0` | `arya-banking-common` |
| `org.arya.banking:arya-banking-outbox-service` | `2.0.0` | `arya-banking-outbox-service` |
{{< /table >}}
