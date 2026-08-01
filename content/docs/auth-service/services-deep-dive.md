---
title: "Services Deep Dive"
description: "In-depth look at the business logic layer: KeyCloakService and KeyCloakManager."
icon: "deployed_code"
weight: 900
toc: true
---

## KeyCloakServiceImpl

The `KeyCloakServiceImpl` is the primary orchestrator for identity-related operations in the Auth Service.

### 1. User Authentication (`authenticateUser`)
Handles the verification of user credentials via Keycloak's token endpoint.

```java {linenos=table, anchorlinenos=true}
// Build form data for password grant
MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
formData.add("grant_type", "password");
formData.add("client_id", keyCloakManager.getClientId());
formData.add("client_secret", keyCloakManager.getClientSecret());
// ...
```

#### Login Failure Strategy
If Keycloak returns a **401 Unauthorized**, the Auth Service triggers a Feign call to the User Service to increment the failure counter, potentially leading to an account lock.

---

### 2. User Creation (`createKeyCloakUser`)
Translates `KeyCloakUser` DTOs into Keycloak `UserRepresentation` objects and persists them using the Admin SDK.

- **Username**: Derived from the application-level `userId`.
- **Credential Storage**: Creates a non-temporary password credential for the user record.

---

## KeyCloakManager

The `KeyCloakManager` is responsible for initializing and managing the lifecycle of the Keycloak Admin Client.

- **Initialization**: Builds the `Keycloak` instance at startup using `client_credentials`.
- **Resource Access**: Exposes the `UsersResource` bean for atomic user operations across the service layer.

```java {linenos=table, anchorlinenos=true}
@Bean
public UsersResource getUsersResource() {
    return keyCloakManager.getKeyCloakInstanceWithRealm().users();
}
```

{{< alert context="info" text="The <code>KeyCloakManager</code> uses the <code>arya-banking-auth-client</code> credentials to perform administrative identity operations." />}}
