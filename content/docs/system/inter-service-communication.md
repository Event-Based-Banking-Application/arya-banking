---
title: "Inter-service Communication"
description: "Details on Feign, OAuth2, and Kafka event flows between Arya Banking services."
icon: "sync_alt"
weight: 120
toc: true
---

## Communication Strategies

Arya Banking utilizes three primary communication patterns to ensure scalability, security, and loose coupling.

---

## 1. Synchronous Feign (REST)

Internal service-to-service calls are handled by **OpenFeign**. To secure these calls, we use the **OAuth2 Client Credentials** grant.

### Machine-to-Machine (M2M) Flow
1. **Source Service** (e.g., Auth Service) triggers a Feign call.
2. **OAuth2 Interceptor** requests a machine-to-machine JWT from Keycloak using its own `client-id` and `client-secret`.
3. **Keycloak** returns a JWT with `ROLE_INTERNAL_SERVICE`.
4. **Source Service** injects `Authorization: Bearer <JWT>` into the outgoing request.
5. **Target Service** (e.g., User Service) validates the JWT and verifies the role.

#### Implementation Pattern
```java {linenos=table, anchorlinenos=true}
// OAuth2FeignConfig (Common Library pattern)
@Bean
public RequestInterceptor oauth2RequestInterceptor() {
    return requestTemplate -> {
        OAuth2AuthorizeRequest request = OAuth2AuthorizeRequest
            .withClientRegistrationId(clientRegistrationId).build();
        OAuth2AuthorizedClient client = authorizedClientManager.authorize(request);
        requestTemplate.header("Authorization", "Bearer " + client.getAccessToken().getTokenValue());
    };
}
```

---

## 2. API Flow Deep-Dive

### User Registration Sync
When a user registers, the flow spans two services:

```mermaid
sequenceDiagram
    participant C as Client
    participant US as User Service
    participant AU as Auth Service
    participant KC as Keycloak

    C->>US: POST /api/users/register (Step 1)
    US->>US: Save User Entity (MongoDB)
    US->>AU: Feign POST /internal/api/auth/register/users
    AU->>KC: Create User via Admin SDK
    AU-->>US: 201 Created (Keycloak UID)
    US->>US: Save Registration Progress
    US-->>C: 201 Created
```

### Account Locking (Login Failures)
When login fails multiple times, the **Auth Service** signals the **User Service**:

```mermaid
sequenceDiagram
    participant AU as Auth Service
    participant KC as Keycloak
    participant US as User Service

    AU->>KC: Validate Credentials
    KC-->>AU: 401 Unauthorized
    AU->>US: Feign PUT /internal/api/security-details/{userId}?loginFailed=true
    US->>US: Increment failedAttempts
    Note over US: If attempts >= 5, set BLOCKED
    US-->>AU: 200 OK (DISABLE_USER: true)
```

---

## 3. Asynchronous Events (Kafka) — UPDATED

State changes are propagated asynchronously using **Apache Kafka** and **Avro Schemas**.

### Event Topics & Producers/Consumers

| Topic | Schema | Producer | Consumers |
|---|---|---|---|
| `user.create.event` | `UserCreateEvent` | **Auth Service** (`UserEventProducer`) | Auth Service (`UserUpdateEventListener`) |
| `user.update.event` | `OutboxKafkaEvent` (wrapping `UserCreateEvent`) | **User Service** (outbox relay) | Auth Service |
| `auth.failed.event` | `LoginFailedEvent` | **Auth Service** (`UserEventProducer`) | **User Service** (`UserEventListeners`) |

### Producer: Auth Service User Registration
```mermaid
sequenceDiagram
    participant US as User Service
    participant AU as Auth Service
    participant KF as Kafka

    US->>AU: Feign POST /internal/api/auth/register/users
    AU->>KC: Create User via Admin SDK
    AU->>KF: UserCreateEvent (user.create.event)
    KF-->>AU: Consumed by UserUpdateEventListener
    AU->>AU: KeyCloakService.onUserUpdateEvent()
```

### Producer: Auth Service Login Failure
```mermaid
sequenceDiagram
    participant AU as Auth Service
    participant KC as Keycloak
    participant KF as Kafka
    participant US as User Service

    AU->>KC: Validate Credentials
    KC-->>AU: 401 Unauthorized
    AU->>KF: LoginFailedEvent (auth.failed.event)
    KF-->>US: UserEventListeners consumes
    US->>US: Increment failedAttempts, lock if >= 5
```

### Producer Logic (`UserEventProducer` in Auth Service)
The `UserEventProducer` in the Auth Service uses a typed `KafkaTemplate<String, LoginFailedEvent>` to send Avro-encoded records:

```java
// Auth Service - UserEventProducer
kafkaTemplate.send(AUTH_FAILED_TOPIC, event.getUserId().toString(), event);
```

### Consumer Logic (`UserUpdateEventListener` in Auth Service)
```java
// Auth Service - UserUpdateEventListener
@KafkaListener(id = "user-update-event", topics = USER_UPDATE_TOPIC)
public void onUserUpdateEvent(OutboxKafkaEvent event) {
    UserCreateEvent userCreateEvent = GsonParser.fromJson(
        event.getPayload().toString(), UserCreateEvent.class);
    keyCloakService.onUserUpdateEvent(userCreateEvent);
}
```

### Consumer Logic (`UserEventListeners` in User Service)
```java
// User Service - UserEventListeners
@KafkaListener(id = "login-failed-event", topics = AUTH_FAILED_TOPIC)
public void onUserUpdateEvent(LoginFailedEvent event) {
    EventContext.setEventContext(
        event.getMetadata().getCorrelationId().toString(),
        event.getMetadata().getEventId().toString()
    );
    UpdateSecurityDetailsDto dto = new UpdateSecurityDetailsDto(null, event.getIsLockUser());
    securityDetailsService.updateSecurityCredentials(
        event.getUserId().toString().toUpperCase(), dto);
}
```

---

## 4. Port & Path Mapping Reference

{{< table "table-striped table-hover table-sm" >}}
| Source | Destination | Path | Purpose |
|---|---|---|---|
| User Service | Auth Service | `/internal/api/auth/register/users` | Sync registration to Keycloak |
| Auth Service | User Service | `/internal/api/security-details/{id}` | Track login failures (legacy Feign) |
| Auth Service | User Service | Kafka `auth.failed.event` | Track login failures (event-driven) |
| User Service | Auth Service | Kafka `user.update.event` | User lifecycle events (outbox) |
| Auth Service | Keycloak | `/admin/realms/{realm}/roles` | Provision RBAC roles |
| Admin Service | Keycloak | `/admin/realms/{realm}/roles` | Provision RBAC roles |
| Admin Service | Vault | `/v1/auth/approle/role` | Provision service secrets |
{{< /table >}}

{{< alert context="important" text="Internal endpoints (marked with <code>/internal/</code>) are protected by <code>ROLE_INTERNAL_SERVICE</code> and are not accessible through the API Gateway by default." />}}
