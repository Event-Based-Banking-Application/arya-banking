---
title: "Bootstrap Vault"
description: "Initialize and unseal HashiCorp Vault for local development."
icon: "security"
weight: 500
toc: true
---

Vault starts in a **sealed** state and must be initialized and unsealed before any service can read secrets.

---

## 1. Unseal Vault

```powershell
make vault-unseal
```

- **First run**: The script initializes Vault (5 shards, threshold 3), generates unseal keys and a root token, and saves them to `scripts/vault/init/keys.txt`.
- **Subsequent runs**: The script reads the saved keys and submits 3 of 5 shards to unseal.

{{< alert icon="key" context="warning" text="The generated <code>scripts/vault/init/keys.txt</code> is gitignored and contains your root token. Back it up securely. Without it, a sealed Vault cannot be recovered." />}}

---

## 2. Verify Vault is Unsealed

Open the Vault UI at [http://localhost:8091/ui](http://localhost:8091/ui) and log in with the root token from `keys.txt`.

You should see the **Secrets** tab with the KV v2 engine mounted at `secret/`.

---

## 3. Re-sealing (if needed)

```powershell
# Seal Vault via the API
curl -X POST http://localhost:8091/v1/sys/seal -H "X-Vault-Token: YOUR_ROOT_TOKEN"

# Unseal again
make vault-unseal
```

---

## Reference

- [Full Vault Setup Guide]({{< ref "/docs/infra/vault-setup" >}})
