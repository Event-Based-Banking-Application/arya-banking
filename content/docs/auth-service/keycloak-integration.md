---
title: "Keycloak Integration"
description: "Detailed breakdown of the Auth Service's interaction with the Keycloak Admin Client."
icon: "lock"
weight: 800
toc: true
---

## Overview

The `arya-banking-auth-service` is the only service in the ecosystem that directly manages Keycloak users via the **Keycloak Admin Client SDK**. It acts as an identity bridge, abstracting Keycloak's complexity from the rest of the platform.

---

## Keycloak Clients

The service uses two distinct Keycloak clients for different purposes:

| Client ID | Role | Purpose |
|---|---|---|
| `arya-banking-auth-client` | Admin | Used by `KeyCloakManager` for user creation and locking via the Admin Client SDK. |
| `auth-service-client` | Resource Server | Used by `OAuth2FeignConfig` for authenticated service-to-service calls. |

---

## User Management Workflow

### User Creation
When a new user registers in the system (through the User Service), the Auth Service receives the request and use the `UsersResource` from the Keycloak Admin SDK to create the identity.

```java {linenos=table, anchorlinenos=true}
UsersResource usersResource = keyCloakManager.getUsersResource();
Response response = usersResource.create(userRepresentation);
```

### Account Locking
In the event of multiple failed login attempts, the Auth Service uses the `UserRepresentation` to disable the user's account in Keycloak.

```java {linenos=table, anchorlinenos=true}
UserRepresentation userRepresentation = findUserByUsername(username);
userRepresentation.setEnabled(false);
usersResource.get(userRepresentation.getId()).update(userRepresentation);
```

---

## Technical Details

- **Admin Client**: Initialized with `client_credentials` for the `arya-banking-auth-client`.
- **Credential Storage**: Passwords are never stored internally; they are sent directly to Keycloak via the `CredentialRepresentation`.

{{< alert context="info" text="This architecture ensures that identity data remains centralized and secured within a dedicated identity provider." />}}
