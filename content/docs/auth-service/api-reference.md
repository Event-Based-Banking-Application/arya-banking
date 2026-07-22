---
title: "API Reference"
description: "Detailed REST API documentation for the Auth Service."
icon: "api"
weight: 300
toc: true
---

## Overview

The `arya-banking-auth-service` exposes public and internal endpoints for user authentication and identity management.

{{< alert context="info" text="Base URL for local development: <code>http://localhost:8087</code>" />}}

---

## Swagger UI

Interactive API documentation is available directly on the service:

```text
http://localhost:8087/swagger-ui/index.html
```

Or aggregated via the **API Gateway** at `http://localhost:8085/swagger-ui.html` (select "Auth Service" from the dropdown).

---

## Authentication API (`/api/auth`)

### Authenticate User
`GET /api/auth/authenticate`

Validates user credentials against Keycloak and returns an access token.

#### Query Parameters
- `username`: String. User's identity (typically the `userId`).
- `password`: String. User's password.

**Example Response (`200 OK`):**
```text
eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJ...
```

{{< alert context="warning" text="This endpoint uses query parameters for credentials, which is a security anti-pattern and should be refactored to a <code>POST</code> request with a JSON body." />}}

---

## Internal Admin API (`/internal/api/auth`)

{{< alert context="warning" text="These endpoints are restricted to <code>ROLE_INTERNAL_SERVICE</code> and are intended for service-to-service communication only." />}}

### Register Keycloak User
`POST /internal/api/auth/register/users`

Creates a new user record in the Keycloak realm.

#### Request Body (`KeyCloakUser`)
| Parameter | Type | Required | Description |
|---|---|---|---|
| `username` | String | Yes | Unique userId (e.g., `ARYA3F9A12`). |
| `password` | String | Yes | User's initial password. |
| `firstName` | String | Yes | User's first name. |
| `lastName` | String | Yes | User's last name. |
| `emailId` | String | Yes | User's email address. |

**Example Response (`200 OK`):**
```json
{
  "responseCode": "201",
  "response": "User Created Successfully"
}
```

---

## Health Check

### Actuator Health
`GET /actuator/health`

**Example Response (`200 OK`):**
```json
{
  "status": "UP"
}
```
