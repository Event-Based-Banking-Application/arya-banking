---
title: "Publishing & Consuming"
description: "How services consume Arya Banking artifacts from GitHub Packages and how libraries publish to it."
icon: "publish"
weight: 200
toc: true
---

## Consuming via BOM

The recommended way to consume common modules is through the **BOM** (Bill of Materials). This centralizes all versions in one place.

### 1. Add the BOM import

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

### 2. Declare the modules you need (no versions)

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
</dependencies>
```

### 3. Add the GitHub Packages repository

```xml
<repositories>
    <repository>
        <id>github</id>
        <url>https://maven.pkg.github.com/Event-Based-Banking-Application/arya-banking-maven-registry</url>
    </repository>
</repositories>
```

### 4. Configure credentials

Add `settings.xml` to your repo root (for CI) or `~/.m2/settings.xml` (for local):

```xml
<servers>
    <server>
        <id>github</id>
        <username>${env.GITHUB_ACTOR}</username>
        <password>${env.GH_PAT}</password>
    </server>
</servers>
```

Pass it to Maven: `mvn --settings settings.xml clean compile`

---

## Consuming Without BOM

If you prefer explicit versions, you can skip the BOM and declare each dependency with its version:

```xml
<dependency>
    <groupId>org.arya.banking</groupId>
    <artifactId>core</artifactId>
    <version>2.0.0</version>
</dependency>
```

{{< alert context="warning" text="This approach requires updating versions manually in every service when the common library is upgraded. The BOM is strongly recommended." />}}

---

## Publishing

Libraries publish to GitHub Packages via `distributionManagement`:

```xml
<distributionManagement>
    <repository>
        <id>github</id>
        <url>https://maven.pkg.github.com/Event-Based-Banking-Application/arya-banking-maven-registry</url>
    </repository>
</distributionManagement>
```

Then run `mvn clean deploy -s settings.xml` with a PAT that has **`write:packages` + `read:packages`** scopes.

{{< alert context="info" text="GitHub Packages scopes artifacts under the owning organization namespace regardless of the repository URL used — all Arya Banking artifacts publish under the Event-Based-Banking-Application organization." />}}

## CI Credentials

Each library repository carries a `settings.xml` at the repo root, wired with environment variables so GitHub Actions never hard-codes credentials:

```xml
<servers>
    <server>
        <id>github</id>
        <username>${env.GITHUB_ACTOR}</username>
        <password>${env.GH_PAT}</password>
    </server>
</servers>
```

Pass it to Maven with `-s settings.xml` — the same file works for local and CI deploys alike.
