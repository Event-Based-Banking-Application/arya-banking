---
title: "Data Models"
description: "MongoDB entity schemas and document structures for the User Service."
icon: "database"
weight: 900
toc: true
---

## Overview

The `arya-banking-user-service` uses **Spring Data MongoDB**. All entities inherit from `AryaBase` (provided by the common library), which adds auditing fields (`createdAt`, `updatedAt`, `version`).

---

## User Entity

Stored in the `user` collection.

| Field | Type | Description |
|---|---|---|
| `userId` | String | Unique application ID (e.g., `ARYA123456`) |
| `firstName` | String | User's first name |
| `lastName` | String | User's last name |
| `emailId` | String | Unique email address |
| `primaryContactNumber` | String | Primary mobile number |
| `status` | Enum | `ACTIVE`, `INACTIVE`, `BLOCKED`, `DELETED` |
| `contactNumbers` | List | History of all contact numbers |
| `addresses` | List | Physical addresses (Permanent/Residential) |

---

## Registration Progress

Stored in the `registration_progress` collection. Tracks the 3-step onboarding flow.

| Field | Type | Description |
|---|---|---|
| `userId` | String | Reference to the user |
| `status` | String | Broad status (`REGISTRATION_IN_PROGRESS`, `REGISTRATION_COMPLETE`) |
| `subStatus` | Enum | Step detail (`BASIC_DETAILS_ADDED`, `ADDRESS_ADDED`, etc.) |
| `nextStep` | String | Advice for the UI on what endpoint to call next |

---

## Security Details

Stored in the `security_details` collection.

| Field | Type | Description |
|---|---|---|
| `userId` | String | Reference to the user |
| `loginFailedAttempts` | Integer | Counter for failed logins (max 5) |
| `securityQuestions` | List | Array of Q&A pairs |
| `isAccountLocked` | Boolean | Read-only flag based on attempts |

---

## Indexing Strategy

- **User**: Unique index on `userId` and `emailId`.
- **RegistrationProgress**: Compound index on `userId` and `subStatus`.
- **SecurityDetails**: Unique index on `userId`.

{{< alert context="info" text="All collections use Spring Data MongoDB auditing to keep track of record creation and modification times." />}}
