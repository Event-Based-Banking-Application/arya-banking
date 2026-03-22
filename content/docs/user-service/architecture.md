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
stateDiagram-v2
    [*] --> Step1: POST /api/users/register
    Step1 --> Step2: PUT /api/users/{userId}
    Step2 --> Step3: PUT /api/security-details/{userId}
    Step3 --> [*]

    state Step1 {
        [*] --> SaveUser: Create User document (ACTIVE)
        SaveUser --> FeignCall: POST /internal/api/auth/register/users
        FeignCall --> Progress1: Save BASIC_DETAILS_ADDED progress
        Progress1 --> Kafka1: Emit UserCreateEvent
    }

    state Step2 {
        [*] --> AddAddress: Update physical address
        AddAddress --> DetectLevel2: UserValidator check
        DetectLevel2 --> UpdateProgress2: Save ADDRESS_ADDED progress
        UpdateProgress2 --> Kafka2: Emit UserCreateEvent
    }

    state Step3 {
        [*] --> SetSecurity: Merge security questions
        SetSecurity --> DetectLevel3: UserValidator check
        DetectLevel3 --> Finish: Save SECURITY_CREDENTIALS_ADDED
        Finish --> Kafka3: Emit UserCreateEvent (REGISTRATION_COMPLETE)
    }
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
