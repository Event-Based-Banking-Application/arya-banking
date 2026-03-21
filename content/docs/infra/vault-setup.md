---
title: "Vault Setup"
description: "Step-by-step guide for initializing and unsealing HashiCorp Vault."
icon: "lock"
weight: 400
toc: true
---

## The Sealed State

By design, HashiCorp Vault starts in a **sealed** state. In this state, Vault knows where the data is but cannot decrypt it as the master key is not in memory.

---

## First-Time Initialization

When running the stack for the first time, you must initialize the Vault server to generate the shard keys and the initial root token.

```bash
# Initialize Vault (1 key share, 1 threshold for dev)
docker exec vault vault operator init \
  -key-shares=1 \
  -key-threshold=1 \
  -format=json > vault-init.json
```

{{< alert context="danger" text="**Critical:** Save the contents of `vault-init.json`. If you lose the unseal key, you lose access to all secrets permanently." />}}

---

## Manual Unsealing

After every container restart or `make up`, Vault will be sealed. You must provide the unseal key to bring it online.

{{< tabs tabTotal="2" >}}

{{% tab tabName="Bash" %}}
```bash
# Extract key and unseal
UNSEAL_KEY=$(jq -r '.unseal_keys_b64[0]' vault-init.json)
docker exec vault vault operator unseal $UNSEAL_KEY
```
{{% /tab %}}

{{% tab tabName="PowerShell" %}}
```powershell
$init = Get-Content vault-init.json | ConvertFrom-Json
docker exec vault vault operator unseal $init.unseal_keys_b64[0]
```
{{% /tab %}}

{{< /tabs >}}

---

## AppRole Configuration

The `admin-service` and other microservices use **AppRole** authentication to fetch their configuration.

### 1. Enable AppRole Auth
```bash
docker exec vault vault auth enable approle
```

### 2. Create Policy
Save this as `admin-policy.hcl` and apply it:
```bash
docker exec vault vault policy write admin-policy - <<EOF
path "secret/data/*" {
  capabilities = ["read", "list"]
}
EOF
```

### 3. Generate Credentials
```bash
# Get the Role ID
docker exec vault vault read auth/approle/role/admin-role/role-id

# Generate a new Secret ID
docker exec vault vault write -f auth/approle/role/admin-role/secret-id
```

---

## Accessing the UI

Once unsealed, the Vault Web UI is accessible at:
[http://localhost:8091/ui](http://localhost:8091/ui)
