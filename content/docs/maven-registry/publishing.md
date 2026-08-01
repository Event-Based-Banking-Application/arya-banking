---
title: "Publishing & Consuming"
description: "How services consume Arya Banking artifacts from GitHub Packages and how libraries publish to it."
icon: "publish"
weight: 200
toc: true
---

## Consuming

Add the repository to the service `pom.xml`:

```xml
<repositories>
    <repository>
        <id>github</id>
        <url>https://maven.pkg.github.com/Event-Based-Banking-Application/arya-banking-maven-registry</url>
    </repository>
</repositories>
```

Configure credentials in `~/.m2/settings.xml` with a PAT that has **`read:packages`** scope:

```xml
<servers>
    <server>
        <id>github</id>
        <username>GITHUB_USERNAME</username>
        <password>GITHUB_PAT</password>
    </server>
</servers>
```

Then declare the dependency normally:

```xml
<dependency>
    <groupId>org.arya.banking</groupId>
    <artifactId>arya-banking-common</artifactId>
    <version>1.2.3</version>
</dependency>
```

---

## Publishing

Publishing libraries (e.g., `arya-banking-common`, `arya-banking-outbox-service`) uses `distributionManagement`:

```xml
<distributionManagement>
    <repository>
        <id>github</id>
        <url>https://maven.pkg.github.com/Event-Based-Banking-Application/arya-banking-maven-registry</url>
    </repository>
</distributionManagement>
```

Then run `mvn clean deploy` with a PAT that has **`write:packages` + `read:packages`** scopes.

{{< alert context="info" text="GitHub Packages scopes artifacts under the owning organization namespace regardless of the repository URL used — all Arya Banking artifacts publish under the Event-Based-Banking-Application organization." />}}

## CI Credentials

The `arya-banking-common` and `arya-banking-outbox-service` repositories each carry a `settings.xml` at the repo root, wired with environment variables so GitHub Actions never hard-codes credentials:

```xml
<servers>
    <server>
        <id>github</id>
        <username>${env.GITHUB_ACTOR}</username>
        <password>${env.GH_PAT}</password>
    </server>
</servers>
```

Pass it to Maven with `-s settings.xml` (see the outbox-service CI/CD page) — the same file works for local and CI deploys alike.
