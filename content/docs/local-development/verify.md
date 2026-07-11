---
title: "Verify the Platform"
description: "Health checks and smoke tests to confirm the platform is running correctly."
icon: "check_circle"
weight: 900
toc: true
---

After all services are running, use these checks to verify the platform is healthy.

---

## 1. Service Discovery Dashboard

Open [http://localhost:8761](http://localhost:8761).

You should see these instances registered:
- `API-GATEWAY`
- `ARYA-BANKING-USER-SERVICE`
- `ARYA-BANKING-AUTH-SERVICE`
- `ARYA-BANKING-ADMIN-SERVICE`
- `CONFIG-SERVER`

---

## 2. API Gateway Health Check

```powershell
curl http://localhost:8085/actuator/health
```

Expected response:

```json
{"status":"UP"}
```

---

## 3. Individual Service Health Checks

```powershell
curl http://localhost:8086/actuator/health   # User Service
curl http://localhost:8087/actuator/health   # Auth Service
curl http://localhost:8089/actuator/health   # Admin Service
```

---

## 4. Authenticated API Test

```powershell
# Get a token from Keycloak
$token = curl -X POST "http://localhost:5433/realms/event-based-banking-application/protocol/openid-connect/token" `
  -H "Content-Type: application/x-www-form-urlencoded" `
  -d "client_id=banking-service-client" `
  -d "client_secret=YOUR_CLIENT_SECRET" `
  -d "grant_type=password" `
  -d "username=testuser" `
  -d "password=testpass" | ConvertFrom-Json

# Call the API Gateway with the token
curl -H "Authorization: Bearer $($token.access_token)" http://localhost:8085/api/users/me
```

Replace `YOUR_CLIENT_SECRET`, `testuser`, and `testpass` with your actual Keycloak client secret and test user credentials.

---

## 5. Vault Secret Verification

```powershell
# Using the root token from keys.txt
curl -H "X-Vault-Token: YOUR_ROOT_TOKEN" http://localhost:8091/v1/secret/data/arya-banking/user-service/dev
```

This should return the secrets stored for the user service.

---

## 6. Kafka Connectivity

Verify services can publish and consume events by checking the logs for Kafka-related messages. Look for `Connected to Kafka` or `Successfully joined group` in the service logs.

---

## What If Something Fails?

Refer to the **[Troubleshooting]({{< ref "troubleshooting" >}})** page for solutions to common issues.
