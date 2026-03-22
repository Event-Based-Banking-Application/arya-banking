---
title: "Domain Models"
description: "Detailed breakdown of the shared MongoDB entities in Arya Banking."
icon: "dataset"
weight: 200
toc: true
---

## Shared Entity Models

The `arya-banking-common` library defines the foundational domain models used across the microservices ecosystem. These are persisted in **MongoDB Atlas**.

---

## 1. User Entity (`User`)
The primary entity for user profile information.

{{< table "table-striped table-hover table-sm" >}}
| Field | Type | Description |
|---|---|---|
| `userId` | String | Unique app-level ID (e.g., `ARYA3F9A12`). |
| `firstName` | String | User's legal first name. |
| `lastName` | String | User's legal last name. |
| `emailId` | String | Primary email address (unique). |
| `primaryContactNumber` | String | 10-digit Indian mobile format. |
| `contactNumbers` | List | Collection of `ContactNumber` objects. |
| `addresses` | List | Collection of `Address` objects. |
| `status` | Enum | `ACTIVE`, `BLOCKED`, `DORMANT`. |
{{< /table >}}

---

## 2. Security Details (`SecurityDetails`)
Owner of the multi-factor and account-lock state.

{{< table "table-striped table-hover table-sm" >}}
| Field | Type | Description |
|---|---|---|
| `userId` | String | Reference to the User entity. |
| `securityQuestions` | List | Collection of `SecurityQuestions` (Q&A). |
| `loginFailedAttempts` | Integer | Counter for failed logins (max 5). |
| `twoFactorEnabled` | Boolean | Global toggle for 2FA. |
| `isEmailVerified` | Boolean | Email verification status. |
{{< /table >}}

---

## 3. Registration Progress (`RegistrationProgress`)
State machine data for the 3-step registration flow.

{{< table "table-striped table-hover table-sm" >}}
| Field | Type | Description |
|---|---|---|
| `userId` | String | Reference to the User entity. |
| `status` | String | Global registration status (`IN_PROGRESS` / `COMPLETE`). |
| `subStatus` | String | Detailed step (e.g., `ADDRESS_ADDED`). |
| `nextStep` | String | Hint for the UI on what to collect next. |
{{< /table >}}

---

## Common Base: `AryaBase`

All major entities extend `AryaBase`, inheriting automatic tracking fields:
- `createdAt`: Timestamp of creation.
- `updatedAt`: Timestamp of the last update.
- `deleted`: Soft-delete flag.

{{< alert context="info" text="Audit trails are automatically managed via Spring Data MongoDB's <code>@EnableMongoAuditing</code>." />}}
