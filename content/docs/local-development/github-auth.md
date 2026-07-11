---
title: "GitHub Packages Auth"
description: "Configure Maven and Docker to authenticate with GitHub Packages."
icon: "key"
weight: 300
toc: true
---

Several services depend on `arya-banking-common` published as a Maven package to **GitHub Packages**. You need a GitHub Personal Access Token (PAT) with `read:packages` scope before any Maven build will succeed.

---

## 1. Generate a PAT

Go to **GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens** and create a token with:
- **Repository access**: All repositories
- **Permissions**: `Packages: Read`

---

## 2. Configure Maven `settings.xml`

Create or edit `%USERPROFILE%\.m2\settings.xml`:

```xml
<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://maven.apache.org/SETTINGS/1.0.0
                      http://maven.apache.org/xsd/settings-1.0.0.xsd">
  <servers>
    <server>
      <id>github</id>
      <username>YOUR_GITHUB_USERNAME</username>
      <password>YOUR_PAT</password>
    </server>
  </servers>
</settings>
```

---

## 3. Set Environment Variables for Docker

```powershell
[System.Environment]::SetEnvironmentVariable('GITHUB_ACTOR', 'YOUR_USERNAME', 'User')
[System.Environment]::SetEnvironmentVariable('GH_PAT', 'YOUR_PAT', 'User')
```

These are passed as build arguments to the Dockerfiles in `compose/platform.yml`.

{{< alert context="warning" text="The PAT must have <code>read:packages</code> scope. Without it, Maven builds will fail with a 401 error when resolving the <code>arya-banking-common</code> dependency." />}}

---

## 4. Verify Authentication

```powershell
curl -u "YOUR_USERNAME:YOUR_PAT" https://maven.pkg.github.com/Event-Based-Banking-Application/arya-banking-common
```

A successful response confirms access to the package registry.
