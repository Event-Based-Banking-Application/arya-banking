---
title: "Vault Setup"
description: "Configuring HashiCorp Vault for secrets management in Arya Banking."
icon: "security"
weight: 400
toc: true
---

## Secrets Orchestration

The platform uses HashiCorp Vault to securely store and inject environment-specific properties (secrets) into microservices at runtime.

---

## 1. Vault Server Configuration

The Vault server is started in `dev` mode for simplicity, using a file-based storage backend.

- **Internal Port**: `8200`
- **External Port**: `8091`
- **Network**: `arya-banking-net`

### Unsealing Process
When the Vault container starts for the first time, it must be unsealed (though `dev` mode currently auto-unseals with a known root token). In production, the `admin-service` or a manual operator uses unseal keys to unlock the master key.

---

## 2. KV v2 Secret Engine

We use the **KV (Key-Value) Version 2** engine. This engine supports versioning and soft-deletion of secrets.

- **Mount Path**: `secret/`
- **Application Path**: `arya-banking/{service}/{profile}`

Example: `secret/data/arya-banking/user-service/dev`

---

## 3. AppRole Authentication

Microservices authenticate to Vault using the **AppRole** mechanism. This is a machine-to-machine authentication method that does not require a human operator.

### Credentials
- **Role ID**: A static identifier configured in `bootstrap.yml`.
- **Secret ID**: A sensitive credential (similar to a password) used to generate a temporary Vault token.

#### Sample `bootstrap.yml`
```yaml
spring:
  cloud:
    vault:
      authentication: APPROLE
      app-role:
        role-id: ${VAULT_ROLE_ID}
        secret-id: ${VAULT_SECRET_ID}
```

---

## 4. Admin Service Integration

The `arya-banking-admin-service` provides REST wrappers to manage Vault programmatically:
- **Upload Policies**: Convert `.hcl` files into Vault ACL policies.
- **Generate AppRoles**: Create new service identities.
- **Manage Secrets**: CRUD operations on the KV store.

{{< alert context="important" text="The Admin Service uses a broad policy (<code>admin-service-policy.hcl</code>) that allows it to manage AppRoles and secrets platform-wide." />}}
