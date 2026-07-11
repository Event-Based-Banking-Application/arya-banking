---
title: "Configure Keycloak"
description: "Set up the Keycloak realm, OAuth2 client, and test users for local development."
icon: "vpn_key"
weight: 600
toc: true
---

Keycloak runs at [http://localhost:5433](http://localhost:5433).

---

## 1. Log in to the Admin Console

- **URL**: [http://localhost:5433](http://localhost:5433)
- **Username**: `admin`
- **Password**: `admin`

---

## 2. Create the Realm

1. Click the dropdown next to **Master** realm → **Create realm**
2. Set **Realm name**: `event-based-banking-application`
3. Click **Create**

---

## 3. Create the OAuth2 Client

1. Go to **Clients → Create client**
2. **Client ID**: `banking-service-client`
3. **Client authentication**: On
4. **Standard flow**: Enabled
5. **Valid redirect URIs**: `http://localhost:8085/*`
6. Click **Save**

---

## 4. Copy the Client Secret

1. Go to the **Credentials** tab of `banking-service-client`
2. Copy the **Client secret**
3. Save it — you will need it when configuring the API Gateway and when testing authenticated endpoints

---

## 5. Create Test Users

1. Go to **Users → Add user**
2. Fill in **Username** (e.g. `testuser`)
3. Click **Create**
4. Go to the **Credentials** tab
5. Set a password (turn **Temporary** off)
6. Click **Set password**

Repeat for any additional test users you need.

---

## Reference

- [Full Keycloak Configuration Guide]({{< ref "/docs/infra/keycloak-config" >}})
