---
title: "Create Vault Credentials"
description: "Configure per-service vault-credentials.yml files for Vault AppRole authentication."
icon: "lock"
weight: 700
toc: true
---

Each business service needs a `vault-credentials.yml` file at its project root with the Vault AppRole credentials. These files are **gitignored** and contain your actual secrets.

---

## 1. Get the AppRole Credentials from Vault

Log in to the Vault UI at [http://localhost:8091/ui](http://localhost:8091/ui) with the root token, then navigate to **Access → AppRole** to find the Role IDs and Secret IDs for each service.

Alternatively, use the Admin Service API to generate new credentials.

---

## 2. Create Each Credentials File

### Admin Service

**`arya-banking-admin-service/vault-credentials.yml`**:

```yaml
spring:
  cloud:
    vault:
      app-role:
        role-id: <admin-service-role-id>
        secret-id: <admin-service-secret-id>
```

### Auth Service

**`arya-banking-auth-service/vault-credentials.yml`**:

```yaml
spring:
  cloud:
    vault:
      app-role:
        role-id: <auth-service-role-id>
        secret-id: <auth-service-secret-id>
```

### User Service

**`arya-banking-user-service/vault-credentials.yml`**:

```yaml
spring:
  cloud:
    vault:
      app-role:
        role-id: <user-service-role-id>
        secret-id: <user-service-secret-id>
```

{{< alert icon="lock" context="danger" text="Never commit <code>vault-credentials.yml</code> to git. It is excluded via <code>.gitignore</code> in each service repository." />}}

---

## How It Works

The `bootstrap.yml` in each service imports this file via:

```yaml
spring:
  config:
    import: "optional:file:./vault-credentials.yml"
  cloud:
    vault:
      authentication: APPROLE
      app-role:
        role-id: placeholder
        secret-id: placeholder
```

The `optional:` prefix ensures the service starts even if the file is missing (useful in CI/CD where credentials are injected by other means).

---

## Reference

- [Vault Setup Guide]({{< ref "/docs/infra/vault-setup" >}})
