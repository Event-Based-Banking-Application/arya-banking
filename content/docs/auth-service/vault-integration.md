---
title: "Vault Integration"
description: "How the Auth Service manages sensitive credentials and configuration using HashiCorp Vault."
icon: "security"
weight: 700
toc: true
---

## Overview

The `arya-banking-auth-service` uses **Spring Cloud Vault** to retrieve sensitive configuration at startup during the "bootstrap" phase.

---

## Authentication: AppRole

The service authenticates with Vault using the **AppRole** mechanism. Credentials are provided via a gitignored `vault-credentials.yml` file at the project root, which `bootstrap.yml` imports.

### Bootstrap Configuration

```yaml {linenos=table, anchorlinenos=true}
# bootstrap.yml
spring:
  config:
    import: "optional:file:./vault-credentials.yml"
  cloud:
    vault:
      uri: http://localhost:8091
      authentication: APPROLE
      app-role:
        role-id: placeholder
        secret-id: placeholder
      kv:
        enabled: true
        backend: secret
        application-name: arya-banking/auth-service
        # kv-version: 2  <-- BUG: Missing in current bootstrap.yml
```

```yaml {linenos=table, anchorlinenos=true}
# vault-credentials.yml (gitignored — project root)
spring:
  cloud:
    vault:
      app-role:
        role-id: <your-role-id>
        secret-id: <your-secret-id>
```

---

## Managed Secrets

The service fetches its core identity client secrets from the Vault Key-Value (KV) engine.

| Secret Key | Target Property | Purpose |
|---|---|---|
| `AUTH.SERVICE.CLIENT.SECRET` | `spring.security.oauth2.client.registration.auth-service-client.client-secret` | OAuth2 `client_credentials` secret for inter-service calls. |
| `ARYA.BANKING.AUTH.CLIENT.SECRET` | `app.config.keycloak.client-secret` | Keycloak Admin SDK secret for identity management. |

---

## Security Best Practices

{{% alert context="danger" %}}
**Avoid committing hardcoded <code>role-id</code> and <code>secret-id</code>.** These credentials should be injected via environment variables at runtime to maintain environment security.
{{% /alert %}}

> [!IMPORTANT]
> **Missing `kv-version: 2`**: The current `bootstrap.yml` is missing the `kv-version: 2` property. Since the platform uses Vault KV V2, this service will fail to resolve secrets at startup unless this is added under `spring.cloud.vault.kv`.
