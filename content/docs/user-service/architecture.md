---
title: "Architecture"
description: "Technical deep dive into the user service's registration flow, Kafka integration, and security model."
icon: "hub"
weight: 200
toc: true
---

## System Architecture

The `arya-banking-user-service` sits between the API Gateway and the core infrastructure. It communicates with Keycloak for identity, Vault for secrets, and Kafka for event publishing and consumption.

```mermaid
flowchart TD
    GW["API Gateway<br/>:8085"] -->|HTTP/JWT| US["User Service<br/>:8086"]
    US -->|"Feign (OAuth2)"| KC["Auth Service<br/>(Keycloak Integration)"]
    US -->|"Audit/Creation"| KF["Apache Kafka<br/>(user-create-event)"]
    US -->|"Consumes"| KF2["Kafka<br/>(auth.failed.event)"]
    US -->|"Registration Data"| MG[("MongoDB<br/>User Collection")]
    US -.->|"Config/Secrets"| CS["Config Server / Vault"]
```

---

## 3-Step Registration Flow

The registration process is a state machine controlled by the `UserValidator` and tracked in the `registration_progress` collection.

```mermaid
sequenceDiagram
    participant C as Client
    participant US as User Service
    participant KC as Auth Service
    participant MG as MongoDB
    participant KF as Kafka

    C->>US: POST /api/users/register
    US->>MG: Create User doc (ACTIVE)
    US->>KC: POST /internal/api/auth/register/users
    US->>MG: Save BASIC_DETAILS_ADDED progress
    US->>KF: Emit UserCreateEvent (via outbox)
    US-->>C: 201 Created

    C->>US: PUT /api/users/{userId} (address)
    US->>US: UserValidator check
    US->>MG: Save ADDRESS_ADDED progress
    US->>KF: Emit UserCreateEvent (via outbox)
    US-->>C: 200 OK

    C->>US: PUT /api/security-details/{userId}
    US->>US: UserValidator check
    US->>MG: Save SECURITY_CREDENTIALS_ADDED
    US->>KF: Emit UserCreateEvent (REGISTRATION_COMPLETE, via outbox)
    US-->>C: 200 OK
```

---

## Key Components

### UserValidator (Registration Engine)

The `UserValidator` is the "brain" of the registration flow. It defines the required fields for each level and advances the user's progress:
- **Level 1:** Name, email, primary contact.
- **Level 2:** At least one address.
- **Level 3:** Security questions populated on `SecurityDetails`.

### Kafka Integration

#### Producer: Transactional Outbox (`UserOutboxEventRepository`)
The service publishes events to the `user.update.event` topic via the **transactional outbox pattern** (using `arya-banking-outbox-service`). This guarantees at-least-once delivery:

1. Business operation (user create/update) + outbox record written in single MongoDB transaction
2. Outbox relay (scheduled) polls `PENDING` records and publishes to Kafka
3. Record marked `COMPLETED` on success, `FAILED` after 3 retries

```java
// In UserServiceImpl.updateUser() when locking user:
userValidator.insertToUserOutbox(userId,
    userValidator.getUserCreateEvent(userId, false, false, user.getStatus()),
    USER_UPDATED, PENDING, USER_UPDATE_TOPIC);
```

#### Consumer: `UserEventListeners`
Listens on `auth.failed.event` for `LoginFailedEvent` from Auth Service:

```java
@KafkaListener(id = "login-failed-event", topics = AUTH_FAILED_TOPIC)
public void onUserUpdateEvent(LoginFailedEvent event) {
    // Sets correlation context for tracing
    EventContext.setEventContext(
        event.getMetadata().getCorrelationId().toString(),
        event.getMetadata().getEventId().toString()
    );
    // Updates security details (increments failed attempts, locks if >= 5)
    UpdateSecurityDetailsDto dto = new UpdateSecurityDetailsDto(null, event.getIsLockUser());
    securityDetailsService.updateSecurityCredentials(
        event.getUserId().toString().toUpperCase(), dto);
}
```

---

## Security Model

- **JWT Role Extraction:** Converts Keycloak realm roles (e.g., `INTERNAL_SERVICE`) to Spring Security `ROLE_` authorities.
- **Account Locking:** If a user reaches **5 failed login attempts** (signaled via Kafka `LoginFailedEvent` from the auth service), the user is automatically set to `BLOCKED`.
- **Machine-to-Machine Auth:** Outgoing Feign calls to the auth-service are secured via `client_credentials` grant type.
