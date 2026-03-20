---
title: "Getting Started"
description: "Prerequisites, local setup, bootstrap configuration, and running the admin-service for the first time."
icon: "rocket_launch"
weight: 300
toc: true
date: "2025-03-20T00:00:00Z"
lastmod: "2025-03-20T00:00:00Z"
tags: ["setup", "local", "docker"]
---

## Prerequisites

Before running the admin-service locally, the following platform services must be up and reachable:

{{< table "table-striped table-sm" >}}
| Service | Default Local Port | Purpose |
|---|---|---|
| HashiCorp Vault | `8091` | Secrets source (AppRole auth + KV v2) |
| Keycloak | `5433` | JWT issuer + Admin Client |
| Eureka Server | `8761` | Service registry |
| Spring Cloud Config Server | `8090` | Remote config |
| MongoDB | `27017` | Shared data store (via common lib) |
{{< /table >}}

{{< alert context="info" text="The Arya Banking infra stack is managed in the dedicated arya-banking-infra repository using concern-based Docker Compose files (kafka.yml, keycloak.yml, platform.yml, vault.yml) all sharing the arya-banking-net network." />}}

---

## Vault Pre-requisites

The admin-service bootstraps using AppRole authentication. You need a valid `role-id` and `secret-id` before the service can start.

**Step 1 — Enable the AppRole auth method (once only):**

```bash {linenos=table, anchorlinenos=true}
vault auth enable approle
```

**Step 2 — Create the `admin-service` AppRole with the admin policy:**

```bash {linenos=table, anchorlinenos=true}
vault write auth/approle/role/admin-service \
  token_policies="admin-service-policy" \
  token_ttl=1h \
  token_max_ttl=4h
```

**Step 3 — Fetch the role-id:**

```bash {linenos=table, anchorlinenos=true}
vault read auth/approle/role/admin-service/role-id
```

**Step 4 — Generate a secret-id:**

```bash {linenos=table, anchorlinenos=true}
vault write -f auth/approle/role/admin-service/secret-id
```

**Step 5 — Upload the admin-service policy from the service itself** (after first boot with root token):

```bash {linenos=table, anchorlinenos=true}
curl -X POST http://localhost:8089/api/admin/vault/policies?service=admin-service \
  -H "Authorization: Bearer <admin-jwt>"
```

---

## Vault Parameter File

The `bootstrap.yml` imports `vault-param.yml` from a local file path. Create this file before starting the service:

```bash {linenos=table, anchorlinenos=true}
mkdir -p ~/.config/arya-banking-admin-service
```

```yaml {linenos=table, anchorlinenos=true}
# ~/.config/arya-banking-admin-service/vault-param.yml
vault:
  appRole:
    roleId: <your-role-id>
    secretId: <your-secret-id>
```

{{< alert context="danger" text="Never commit role-id or secret-id values to Git. The bootstrap.yml currently has hardcoded credentials — these must be rotated and moved to the local vault-param.yml file." />}}

---

## Running the Service

{{< tabs tabTotal="2" >}}

{{% tab tabName="Maven (local)" %}}
```bash {linenos=table, anchorlinenos=true}
# From the repo root
mvn spring-boot:run
```

The service starts on port **8089** and registers with Eureka automatically.
{{% /tab %}}

{{% tab tabName="Docker / Buildpack" %}}
```bash {linenos=table, anchorlinenos=true}
# Build image using Spring Boot Buildpacks (Ubuntu Noble base)
mvn spring-boot:build-image

# Run (inject secrets via environment)
docker run -p 8089:8089 \
  -e ADMIN_SERVICE_CLIENT_SECRET=<secret> \
  arya-banking-admin-service:1.0.0
```
{{% /tab %}}

{{< /tabs >}}

---

## Verifying Startup

Once running, the following checks confirm a healthy start:

**Actuator health:**
```bash {linenos=table, anchorlinenos=true}
curl http://localhost:8089/actuator/health
```

**Swagger UI:**

Open `http://localhost:8089/swagger-ui/index.html` in your browser. All five controller groups should be visible.

**Eureka dashboard:**

The service should appear as `ARYA-BANKING-ADMIN-SERVICE` on `http://localhost:8761`.

---

## GitHub Packages Authentication

The `arya-banking-common` dependency is hosted on GitHub Packages. Maven resolves it using the `settings.xml` at the repo root. Ensure your `GH_PAT` environment variable is set with `read:packages` scope, or provide the token directly in `~/.m2/settings.xml`.

```xml {linenos=table, anchorlinenos=true}
<!-- settings.xml (repo root) -->
<server>
  <id>github</id>
  <username>${env.GITHUB_ACTOR}</username>
  <password>${env.GH_PAT}</password>
</server>
```
