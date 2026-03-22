---
title: "Services Deep Dive"
description: "In-depth look at the business logic layer: UserService and SecurityDetailsService."
icon: "deployed_code"
weight: 16011
toc: true
---

## User Service (`UserServiceImpl`)

The `UserServiceImpl` is the orchestrator for all user lifecycle events.

### 1. User Registration (`register`)
This is a multi-step orchestration:
1.  **Duplicate Check**: Verifies if the email or primary contact already exists in MongoDB.
2.  **Mapping**: Uses `UserMapper` to convert `RegisterDto` to a `User` entity.
3.  **User ID Generation**: Creates a unique `userId` using a SHA-256 hash.
4.  **Save User**: Persists the initial User document to MongoDB.
5.  **Keycloak Sync**: Calls the Auth Service to create the identity record.
6.  **Progress Tracking**: Saves the initial `RegistrationProgress` record.
7.  **Security Setup**: Initializes an empty `SecurityDetails` record.
8.  **Kafka Event**: Publishes the first `user-create-event`.

### 2. Profile Management (`updateUser`)
Handles both status changes and profile updates:
- **Locking**: If `isLockUser` is true, sets status to `BLOCKED` and emits a Kafka event.
- **Contacts**: Manages primary and secondary contact numbers without deleting history.
- **Addresses**: Manages permanent and residential addresses, replacing existing ones of the same type.

---

## Security Details Service (`SecurityDetailsServiceImpl`)

Manages sensitive security metadata and account integrity.

### 1. Update Security Credentials
Merges new security questions and answers into the `SecurityDetails` document. It then triggers the `UserValidator` to check if the registration is complete.

### 2. Login Failure Handling
Increments the `loginFailedAttempts` counter.

```java {linenos=table, anchorlinenos=true}
if (loginFailed) {
    securityDetails.setLoginFailedAttempts(securityDetails.getLoginFailedAttempts() + 1);
    if (securityDetails.getLoginFailedAttempts() >= 5) {
        // Trigger account block
        userService.updateUser(userId, new UserUpdateDto(true, null, null));
    }
}
```

---

## Registration Engine (`UserValidator`)

The `UserValidator` is not a service but a utility consumed by the service layer. It acts as a **state transition listener**:

-   **Step 1 Complere?**: Advance to `ADD_ADDRESS`.
-   **Step 2 Complete?**: Advance to `ADD_SECURITY_CREDENTIALS`.
-   **Step 3 Complete?**: Set status to `REGISTRATION_COMPLETE`.

{{< alert context="info" text="Each transition triggers a new <code>RegistrationProgress</code> entry and a Kafka message." />}}
