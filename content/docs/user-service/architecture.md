---
title: "Architecture"
description: "Technical deep dive into the user service's registration flow, Kafka integration, and security model."
icon: "hub"
weight: 200
toc: true
---

## System Architecture

The `arya-banking-user-service` sits between the API Gateway and the core infrastructure. It communicates with Keycloak for identity, Vault for secrets, and Kafka for event publishing.

```mermaid
flowchart TD
    GW["API Gateway<br/>:8085"] -->|HTTP/JWT| US["User Service<br/>:8086"]
    US -->|"Feign (OAuth2)"| KC["Auth Service<br/>(Keycloak Integration)"]
    US -->|"Audit/Creation"| KF["Apache Kafka<br/>(user-create-event)"]
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
    US->>KF: Emit UserCreateEvent
    US-->>C: 201 Created

    C->>US: PUT /api/users/{userId} (address)
    US->>US: UserValidator check
    US->>MG: Save ADDRESS_ADDED progress
    US->>KF: Emit UserCreateEvent
    US-->>C: 200 OK

    C->>US: PUT /api/security-details/{userId}
    US->>US: UserValidator check
    US->>MG: Save SECURITY_CREDENTIALS_ADDED
    US->>KF: Emit UserCreateEvent (REGISTRATION_COMPLETE)
    US-->>C: 200 OK
```

---

## Key Components

### UserValidator (Registration Engine)

The `UserValidator` is the "brain" of the registration flow. It defines the required fields for each level and advances the user's progress:
- **Level 1:** Name, email, primary contact.
- **Level 2:** At least one address.
- **Level 3:** Security questions populated on `SecurityDetails`.

### Kafka Integration (`UserCreateProducer`)

The service publishes events to the `user-create-event` topic whenever registration progress moves forward or a user's status changes.

{{< alert context="info" text="Events use Avro schemas defined in the common library." />}}

---

## Security Model

- **JWT Role Extraction:** Converts Keycloak realm roles (e.g., `INTERNAL_SERVICE`) to Spring Security `ROLE_` authorities.
- **Account Locking:** If a user reaches **5 failed login attempts** (signaled via the `/internal` API from the auth service), the user is automatically set to `BLOCKED`.
- **Machine-to-Machine Auth:** Outgoing Feign calls to the auth-service are secured via `client_credentials` grant type.
