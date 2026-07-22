---
title: "API Reference"
description: "Detailed REST API reference for the User Service microservice."
icon: "api"
weight: 300
toc: true
---

## Overview

The `arya-banking-user-service` exposes a set of RESTful APIs for managing user profiles, registration lifecycle, and security metadata. 

{{< alert context="info" text="Base URL for local development: <code>http://localhost:8086</code>" />}}

---

## Swagger UI

Interactive API documentation is available directly on the service:

```text
http://localhost:8086/swagger-ui/index.html
```

Or aggregated via the **API Gateway** at `http://localhost:8085/swagger-ui.html` (select "User Service" from the dropdown).

---

## User Registration (`/api/users`)

### Register User (Step 1)
`POST /api/users/register`

Creates a new user in MongoDB and synchronizes the identity with Keycloak.

#### Request Body (`RegisterDto`)
{{< table "table-striped table-sm" >}}
| Parameter | Type | Required | Regex / Validation | Description |
|---|---|---|---|---|
| `firstName` | String | Yes | `^[A-Za-z]+$` | User's first name (letters only) |
| `lastName` | String | Yes | `^[A-Za-z]+$` | User's last name (letters only) |
| `emailId` | String | Yes | Email Regex | Unique email address |
| `password` | String | Yes | Complex Regex | Min 15 chars, 1 Uppercase, 1 Lowercase, 1 Digit, 1 Special |
| `primaryContactNumber` | String | Yes | `^[6-9][0-9]{9}$` | 10-digit Indian mobile number |
{{< /table >}}

**Example Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "emailId": "john.doe@example.com",
  "password": "Password@12345678",
  "primaryContactNumber": "9876543210"
}
```

**Example Response (`201 Created`):**
```json
{
  "userId": "ARYA3F9A12",
  "responseMessage": "User Registered Successfully",
  "responseCode": "USER_CREATED_201"
}
```

---

### Update User Profile (Step 2)
`PUT /api/users/{userId}`

Updates contact numbers and physical addresses.

#### Path Parameters
- `userId`: The unique application ID (e.g., `ARYA3F9A12`).

#### Request Body (`UserUpdateDto`)
{{< table "table-striped table-sm" >}}
| Parameter | Type | Required | Description |
|---|---|---|---|
| `isLockUser` | boolean | No | Set to `true` to block the user. |
| `updateContactDto` | Object | No | New contact number details. |
| `updateAddressDto` | Object | No | New physical address details. |
{{< /table >}}

**Example Address Update:**
```json
{
  "updateAddressDto": {
    "addressLine1": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pinCode": "400001",
    "addressType": "PERMANENT"
  }
}
```

---

### Get User Details
`GET /api/users/{userId}`

Returns the full user profile including contacts and addresses.

**Example Response (`200 OK`):**
```json
{
  "userId": "ARYA3F9A12",
  "firstName": "John",
  "emailId": "john.doe@example.com",
  "status": "ACTIVE",
  "addresses": [
    {
      "city": "Mumbai",
      "addressType": "PERMANENT"
    }
  ]
}
```

---

## Security Details (`/api/security-details`)

### Update Security Questions (Step 3)
`PUT /api/security-details/{userId}`

Updates user multi-factor security questions.

#### Request Body (`UpdateSecurityDetailsDto`)
{{< table "table-striped table-sm" >}}
| Parameter | Type | Required | Description |
|---|---|---|---|
| `securityQuestions` | List | Yes | Array of Q&A objects. |
{{< /table >}}

**Example Request:**
```json
{
  "securityQuestions": [
    {
      "question": "What is your pet's name?",
      "answer": "Buddy"
    }
  ]
}
```

---

## Internal Service API (`/internal/api/security-details`)

{{< alert context="warning" text="These endpoints are restricted to <code>ROLE_INTERNAL_SERVICE</code> and are intended for service-to-service communication only." />}}

### Signal Login Failure
`PUT /internal/api/security-details/{userId}?loginFailed=true`

Called by the **Auth Service** to manage account locking policies.

#### Query Parameters
- `loginFailed`: Boolean. If `true`, increments the failure counter.

**Response (`200 OK`):**
```json
{
  "userId": "ARYA3F9A12",
  "responseCode": "SUCCESS",
  "response": "Security details updated successfully"
}
```

{{< alert context="danger" text="If <code>loginFailedAttempts</code> matches 5, the response will include <code>\"DISABLE_USER\": \"true\"</code> and the user status will be set to <code>BLOCKED</code>." />}}
