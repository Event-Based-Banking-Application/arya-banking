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

Vault runs in **production mode** with a file-based storage backend, configured via `compose/vault/config/vault.hcl`.

- **Internal Port**: `8200`
- **External Port**: `8091`
- **Network**: `arya-banking-net`
- **Storage**: File-backed (`/vault/data`)
- **UI**: Enabled at `http://localhost:8091/ui`

```hcl
# compose/vault/config/vault.hcl
ui = true

storage "file" {
  path = "/vault/data"
}

listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = 1
}

disable_mlock = false
```

### Initialisation & Unsealing

Vault starts in a **sealed** state after every restart. The `scripts/vault-unseal.ps1` PowerShell script automates the entire lifecycle:

{{< table "table-striped table-sm" >}}
| Phase | Action |
|---|---|
| **First start** | Script detects no keys file, initialises Vault (5 shares, threshold 3), and saves unseal keys + root token to `scripts/vault/init/keys.txt` |
| **Subsequent starts** | Script reads the saved keys, submits 3 of 5 unseal shards via the Vault REST API |
{{< /table >}}

```powershell
# Auto-initialise and unseal
make vault-unseal
```

{{% alert icon="🔑" context="warning" %}}
The generated `scripts/vault/init/keys.txt` is `.gitignore`-d and **must be backed up securely**. Without it, a sealed Vault cannot be recovered.
{{% /alert %}}

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
