---
title: "Exception Framework"
description: "Global error handling and exception hierarchy in Arya Banking."
icon: "error"
weight: 300
toc: true
---

## Centralized Error Handling

Arya Banking uses a unified exception hierarchy defined in the `common` library and applied via `@RestControllerAdvice` in every microservice.

---

## 1. Global Exception Class

The `GlobalException` class is the root of all domain-specific errors. It carries:
- **`httpErrorCode`**: The standard HTTP status code (e.g., 404, 401).
- **`errorCode`**: A platform-specific error code (e.g., `USER_NOT_FOUND_404`).
- **`errorMessage`**: A human-readable message.

---

## 2. Error Mapping Matrix

{{< table "table-striped table-hover table-sm" >}}
| Exception Class | HTTP Code | Platform Code | Purpose |
|---|---|---|---|
| `UserNotFoundException` | 404 | `USER_NOT_FOUND_404` | User lookup failed. |
| `UserAlreadyExistsException` | 409 | `USER_ALREADY_EXISTS_409` | Duplicate registration attempt. |
| `UnAuthorizedException` | 403 | `ADMIN_UN_AUTHORIZED_403` | RBAC check failed. |
| `VaultSecretNotFoundException`| 404 | `VAULT_SECRET_404` | Missing secret in Vault. |
| `KeyCloakServiceException` | 500 | `KC_SERVICE_500` | Error during Keycloak API call. |
{{< /table >}}

---

## 3. Global Exception Handler

The `GlobalExceptionHandler` is automatically picked up via `@ComponentScan("org.arya.banking.common")`. It intercepts all thrown `GlobalException` subclasses and returns a consistent JSON payload:

```json {linenos=table, anchorlinenos=true}
{
  "errorCode": "USER_NOT_FOUND_404",
  "errorMessage": "User not found with ID: ARYA123456"
}
```

---

## 4. Feign Error Decoding

Inter-service communication errors are deserialized back into their original exception types via the `FeignClientErrorDecoder`. This ensures that a 404 from the `auth-service` is correctly re-thrown as a `UserNotFoundException` in the `user-service`.

{{< alert context="tip" text="This pattern maintains a clean, uniform error experience across the entire distributed system." />}}
