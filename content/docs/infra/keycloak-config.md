---
title: "Keycloak Configuration"
description: "IAM setup, realm management, and security configurations."
icon: "security"
weight: 500
toc: true
---

## Overview

The Arya Banking platform uses Keycloak for Identity and Access Management (IAM). It is configured to handle user lifecycle, JWT issuance, and role-based access control.

---

## Security Hardening (Argon2id)

The platform enforces **Argon2id** for password hashing, ensuring state-of-the-art protection against brute-force attacks.

{{< prism lang="yaml" line-numbers="true" >}}
# compose/keycloak.yml
KC_SPI_PASSWORD_HASHING_PROVIDER: argon2
KC_SPI_PASSWORD_HASHING_ARGON2_MEMORY: 65536
KC_SPI_PASSWORD_HASHING_ARGON2_PARALLELISM: 2
KC_SPI_PASSWORD_HASHING_ARGON2_ITERATIONS: 3
KC_SPI_PASSWORD_HASHING_ARGON2_TYPE: id
{{< /prism >}}

---

## Realm Settings

**Realm Name:** `event-based-banking-application`

### Keycloak Endpoints
| Endpoint | URL |
|---|---|
| **Admin Console** | `http://localhost:5433/admin` |
| **Well-known** | `.../realms/{realm}/.well-known/openid-configuration` |
| **JWKS** | `.../realms/{realm}/protocol/openid-connect/certs` |
| **Token** | `.../realms/{realm}/protocol/openid-connect/token` |

---

## Realm Data Export

Since the Keycloak data is stored in a PostgreSQL bind mount, it is best practice to export the realm configuration into a JSON file for backup or migration.

```bash
# Export the realm within the container
docker exec keycloak /opt/keycloak/bin/kc.sh export \
  --dir /tmp/realm-export \
  --realm event-based-banking-application

# Copy to host
docker cp keycloak:/tmp/realm-export ./keycloak-realm-export
```

---

## Credentials
* **Admin User**: `admin`
* **Admin Password**: `admin`

{{< alert context="danger" text="These are development-only credentials. Change them immediately if deploying to a shared environment." />}}
