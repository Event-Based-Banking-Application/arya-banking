---
title: "Vault Integration"
description: "How the user service manages secrets and authentication with HashiCorp Vault."
icon: "security"
weight: 7611
toc: true
---

## Overview

The `arya-banking-user-service` uses **Spring Cloud Vault** to retrieve sensitive configuration at startup. This occurs during the "bootstrap" phase, before the main application context is loaded.

---

## Authentication: AppRole

The service authenticates with Vault using the **AppRole** mechanism. This requires a `role-id` and a `secret-id`, which are provided in `bootstrap.yml`.

### Bootstrap Configuration

```yaml {linenos=table, anchorlinenos=true}
spring:
  cloud:
    vault:
      uri: http://localhost:8091
      authentication: APPROLE
      app-role:
        role-id: ${VAULT_ROLE_ID}
        secret-id: ${VAULT_SECRET_ID}
      kv:
        enabled: true
        backend: secret
        kv-version: 2
        application-name: arya-banking/user-service
```

---

## Secret Injection

Once authenticated, the service fetches secrets from the Key-Value (KV) engine.

### KV Path
`secret/data/arya-banking/user-service/dev`

### Managed Secrets

| Secret Key | Target Property | Purpose |
|---|---|---|
| `MONGO.PASSWORD` | `spring.application.mongo-password` | MongoDB Atlas authentication |
| `USER.SERVICE.CLIENT.SECRET` | `spring.security.oauth2.client.registration.user-service-client.client-secret` | OAuth2 `client_credentials` secret |

---

## Configuration Inheritance

If a property is not found in the service-specific path, Spring Cloud Vault can be configured to check the default context or shared paths if defined.

{{< alert context="info" text="Secrets are automatically mapped to Spring Cloud property placeholders (e.g., ${MONGO.PASSWORD})." />}}

---

## Security Best Practices

{{% alert icon="🔥" context="danger" %}}
**Avoid committing <code>role-id</code> and <code>secret-id</code> to version control.** In production, these should be injected into the container at runtime via environment variables or a secure platform-native mechanism.
{{% /alert %}}
