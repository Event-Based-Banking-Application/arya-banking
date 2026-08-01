---
title: "CI/CD & Build"
description: "GitHub Actions workflows and Maven build configuration for arya-banking-outbox-service."
icon: "rocket_launch"
weight: 1000
toc: true
---

## GitHub Actions Workflows

### deploy.yml

- Triggers on **push to `master`** plus **`workflow_dispatch`**.
- Checks whether the version is **already published** at the GitHub Packages endpoint (`https://maven.pkg.github.com/Event-Based-Banking-Application/arya-banking-maven-registry/...`) and **skips** the deploy if it exists.
- Runs `mvn clean deploy -s settings.xml` using the `GH_PAT` secret.
- Creates a git tag `v$VERSION` after a successful release.

---

## settings.xml

Both CI and local deploys authenticate to GitHub Packages via a server entry that reads credentials from environment variables:

```xml
<server>
  <id>github</id>
  <username>${env.GITHUB_ACTOR}</username>
  <password>${env.GH_PAT}</password>
</server>
```

---

## Maven Plugins

{{< table "table-striped table-sm" >}}
| Plugin | Version | Notes |
|---|---|---|
| `maven-compiler-plugin` | `3.11.0` | Annotation processors: `mapstruct-processor` 1.5.5.Final, `lombok` 1.18.36, `spring-boot-configuration-processor` 3.5.4 |
| `spotbugs-maven-plugin` | `4.8.6.1` | Static analysis |
| `jacoco-maven-plugin` | `0.8.13` | Test coverage |
{{< /table >}}
