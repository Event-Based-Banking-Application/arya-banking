# Arya Banking User Service
## Codebase Knowledge Document

| Field | Value |
|---|---|
| Repository | `arya-banking-user-service` |
| Artifact ID | `arya-banking-user-service` |
| Group ID | `org.arya.banking` |
| Version | `1.0.0` |
| Java | 17 |
| Spring Boot | `3.5.4` |
| Spring Cloud | `2025.0.0` |
| Port | `8086` |
| MongoDB Database | `user-service` |
| License | Apache 2.0 |
| Developer | Karthik Kulkarni |

---

## 1. Overview

`arya-banking-user-service` is the **core user domain microservice** for the Arya Banking platform. It owns all user lifecycle operations: registration, profile management, address management, security details, and user status changes. It integrates deeply with the rest of the platform — fetching config from the config server, reading secrets from Vault, registering with Eureka, calling the auth service via Feign, and publishing events to Kafka.

**Core responsibilities:**

| Responsibility | Implementation |
|---|---|
| User registration (3-step flow) | `UserServiceImpl.register()` → `UserValidator` → `RegistrationProgressRepository` |
| Profile & contact updates | `UserServiceImpl.updateUser()` |
| Security credentials management | `SecurityDetailsServiceImpl.updateSecurityCredentials()` |
| Account locking | `SecurityDetailsServiceImpl.validateAndLockAccount()` |
| Keycloak user creation | Feign client `KeyCloakService` → `auth-service /internal/api/auth/register/users` |
| Kafka event publishing | `UserCreateProducer` → topic `user-create-event` |
| Registration progress tracking | `RegistrationProgressRepository` + `UserValidator` |

---

## 2. Repository Structure

```
arya-banking-user-service/
├── src/
│   ├── main/
│   │   ├── java/org/arya/banking/user/
│   │   │   ├── AryaBankingUserServiceApplication.java      ← Entry point
│   │   │   ├── config/
│   │   │   │   ├── KafkaWarnUp.java                        ← Kafka eager connection on startup
│   │   │   │   ├── OAuth2FeignConfig.java                  ← Feign OAuth2 interceptor (client_credentials)
│   │   │   │   ├── SecurityConfig.java                     ← HTTP security + JWT converter
│   │   │   │   ├── UserServiceMongoConfig.java             ← Imports MongoConfig + typed KafkaTemplate
│   │   │   │   └── kafka/
│   │   │   │       └── UserCreateProducer.java             ← Kafka Avro producer
│   │   │   ├── controller/
│   │   │   │   ├── UserController.java                     ← /api/users/** (register, get, update)
│   │   │   │   ├── SecurityDetailsController.java          ← /api/security-details/** (external)
│   │   │   │   └── InternalSecurityDetailsController.java  ← /internal/api/security-details/** (service-to-service)
│   │   │   ├── dto/
│   │   │   │   ├── RegisterDto.java                        ← Step 1 registration input
│   │   │   │   ├── UserUpdateDto.java                      ← Profile update wrapper
│   │   │   │   ├── UpdateContactDto.java                   ← Contact number update
│   │   │   │   ├── UpdateAddressDto.java                   ← Address update
│   │   │   │   └── UpdateSecurityDetailsDto.java           ← Security questions update
│   │   │   ├── external/
│   │   │   │   └── KeyCloakService.java                    ← Feign client for auth-service
│   │   │   ├── mapper/
│   │   │   │   └── UserMapper.java                         ← MapStruct: RegisterDto ↔ User
│   │   │   ├── repository/
│   │   │   │   ├── UserRepository.java
│   │   │   │   ├── RegistrationProgressRepository.java
│   │   │   │   └── SecurityDetailsRepository.java
│   │   │   ├── service/
│   │   │   │   ├── UserService.java                        ← Interface
│   │   │   │   ├── SecurityDetailsService.java             ← Interface
│   │   │   │   └── impl/
│   │   │   │       ├── UserServiceImpl.java
│   │   │   │       └── SecurityDetailsServiceImpl.java
│   │   │   └── util/
│   │   │       └── UserValidator.java                      ← Registration level checker + progress updater
│   │   └── resources/
│   │       ├── application.yaml                            ← Port, config server, OAuth2, Kafka topic
│   │       └── bootstrap.yml                              ← Vault AppRole + Config Server URI
│   └── test/
│       └── AryaBankingUserServiceApplicationTests.java     ← Context test (disabled)
├── .github/
│   ├── issues.json                                         ← 14 planned GitHub issues
│   └── workflows/
│       ├── auto-create-issues.yaml
│       ├── delete-all-issues.yaml
│       └── sonar-report.yml
├── pom.xml
├── settings.xml
└── add-secrets.sh
```

---

## 3. Entry Point — AryaBankingUserServiceApplication.java

```java
@Slf4j
@SpringBootApplication(exclude = {
    DataSourceAutoConfiguration.class,
    DataSourceTransactionManagerAutoConfiguration.class,
    HibernateJpaAutoConfiguration.class
})
@ComponentScan(basePackages = {"org.arya.banking.user", "org.arya.banking.common"})
@EnableMongoAuditing
@EnableDiscoveryClient
@EnableFeignClients(defaultConfiguration = OAuth2FeignConfig.class)
public class AryaBankingUserServiceApplication { ... }
```

| Annotation / Config | Purpose |
|---|---|
| `@SpringBootApplication(exclude = {...})` | Excludes all JPA/DataSource auto-configuration — this service uses MongoDB only. Without these exclusions, Spring Boot would fail to start if no JDBC DataSource is configured. |
| `@ComponentScan(basePackages = {...common...})` | Explicitly scans `org.arya.banking.common` so beans from the shared library (`GlobalExceptionHandler`, `KafkaConfiguration`, `MongoConfig`, etc.) are registered in this service's context. |
| `@EnableMongoAuditing` | Activates Spring Data MongoDB auditing — enables `@CreatedDate` and `@LastModifiedDate` in all `AryaBase` subclasses (`User`, `Role`, `SecurityDetails`, etc.). |
| `@EnableDiscoveryClient` | Registers service as `arya-banking-user-service` in Eureka at `http://localhost:8761/eureka`. |
| `@EnableFeignClients(defaultConfiguration = OAuth2FeignConfig.class)` | Activates Feign client scanning and applies `OAuth2FeignConfig` as the default configuration for all Feign clients in this service — every outgoing Feign call gets a `Bearer` token injected automatically. |

---

## 4. Configuration Files

### 4.1 application.yaml

```yaml
spring:
  application:
    topic: user-create-event
    name: arya-banking-user-service
    database: user-service
    mongo-password: ${MONGO.PASSWORD}

  config:
    import: configserver:http://localhost:8090

  security:
    oauth2:
      client:
        provider:
          keycloak:
            token-uri: ${app.config.keycloak.url}/realms/${app.config.keycloak.realm}/protocol/openid-connect/token
        registration:
          user-service-client:
            provider: keycloak
            client-id: user-service-client
            client-secret: ${USER.SERVICE.CLIENT.SECRET}
            authorization-grant-type: client_credentials
      resourceserver:
        jwt:
          jwk-set-uri: ${app.config.keycloak.jwk-set-uri}

app:
  security:
    client-registrationId: user-service-client

server:
  port: 8086
```

**Key properties:**

| Property | Value | Notes |
|---|---|---|
| `spring.application.topic` | `user-create-event` | Kafka topic name — used by `UserCreateProducer` |
| `spring.application.database` | `user-service` | MongoDB database name — injected into Atlas URI placeholder in `arya-banking-configs` |
| `spring.application.mongo-password` | `${MONGO.PASSWORD}` | Injected from Vault at startup via `bootstrap.yml` |
| `spring.config.import` | `configserver:http://localhost:8090` | Pulls shared config (Eureka URL, gateway routes, Keycloak URLs) from `arya-banking-config-server` |
| `spring.security.oauth2.client.registration.user-service-client.authorization-grant-type` | `client_credentials` | **Machine-to-machine flow** — no user involved. The service gets a token to call the auth-service Feign endpoint. |
| `spring.security.oauth2.client.registration.user-service-client.client-secret` | `${USER.SERVICE.CLIENT.SECRET}` | Injected from Vault — never hardcoded |
| `app.security.client-registrationId` | `user-service-client` | Injected into `OAuth2FeignConfig` to build token requests |
| `server.port` | `8086` | Matches gateway route `uri: http://localhost:8086` |

> **`app.config.keycloak.url`, `app.config.keycloak.realm`, `app.config.keycloak.jwk-set-uri`** are NOT defined in this file — they come from `arya-banking-configs/application.yml` via the config server.

### 4.2 bootstrap.yml

```yaml
spring:
  application:
    name: user-service

  profiles:
    active: dev

  config:
    import: vault://

  cloud:
    config:
      uri: http://localhost:8090

    vault:
      uri: http://localhost:8091
      authentication: APPROLE
      app-role:
        role-id: e6151838-363e-d363-9001-0da042b3f55e
        secret-id: 88669c88-9641-263f-c7ec-2cc36d847044
      kv:
        enabled: true
        backend: secret
        kv-version: 2
        default-context: ""
        application-name: arya-banking/user-service
        profile-separator: /
```

`bootstrap.yml` is processed **before** `application.yaml` — this is why secrets are available when `${MONGO.PASSWORD}` and `${USER.SERVICE.CLIENT.SECRET}` are resolved.

| Property | Value | Notes |
|---|---|---|
| `spring.application.name` | `user-service` | Used for Vault path lookup: `secret/data/arya-banking/user-service` |
| `spring.config.import: vault://` | — | Triggers Spring Cloud Vault to fetch secrets before the main context loads |
| `vault.uri` | `http://localhost:8091` | Matches `arya-banking-infra/compose/vault.yml` host port (`8091 → 8200`) |
| `vault.authentication` | `APPROLE` | AppRole auth — uses `role-id` + `secret-id` credentials |
| `vault.app-role.role-id` | `e6151838-...` | ⚠️ **Hardcoded** — should be injected via env var or CI secret |
| `vault.app-role.secret-id` | `88669c88-...` | ⚠️ **Hardcoded + short-lived** — secret IDs expire. Should be dynamically fetched |
| `vault.kv.kv-version` | `2` | Must match the KV engine version on the Vault server (v2 uses `secret/data/` path prefix) |
| `vault.kv.application-name` | `arya-banking/user-service` | Vault reads from `secret/data/arya-banking/user-service` |
| `profile-separator` | `/` | Allows profile-specific secrets at `secret/data/arya-banking/user-service/dev` |

> ⚠️ **Security:** Both `role-id` and `secret-id` are committed to the repository in plaintext. The `secret-id` in particular is short-lived and will expire. Both should be injected via environment variables or a CI/CD secrets vault. See Section 10 for recommendations.

---

## 5. Configuration Classes

### 5.1 SecurityConfig.java

```java
@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.csrf(AbstractHttpConfigurer::disable)
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/**").permitAll()
                .requestMatchers("/internal/**").hasAnyAuthority("ROLE_INTERNAL_SERVICE")
                .anyRequest().authenticated())
            .oauth2ResourceServer(oauth2 -> oauth2.jwt(
                jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter())));
        return http.build();
    }

    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(jwt -> {
            Map<String, Object> realmAccess = jwt.getClaim("realm_access");
            Collection<String> roles = (Collection<String>) realmAccess.get("roles");
            return roles.stream()
                .map(role -> "ROLE_" + role)
                .map(SimpleGrantedAuthority::new)
                .collect(Collectors.toList());
        });
        return converter;
    }
}
```

**Differences from the gateway's `SecurityConfig`:**
- Uses `HttpSecurity` (servlet, not reactive) — user-service is a standard Spring MVC app
- `/api/**` is entirely `permitAll()` — the gateway is trusted to enforce JWT validation upstream. Double-validation at the service level is relaxed here.
- `/internal/**` still enforces `ROLE_INTERNAL_SERVICE` for service-to-service calls

**`jwtAuthenticationConverter` — Keycloak role extraction:**
Keycloak embeds roles in the JWT under `realm_access.roles` (not the standard Spring Security `authorities` claim). This converter reads that claim and prefixes each role with `ROLE_` so Spring Security's `hasAuthority("ROLE_INTERNAL_SERVICE")` check works correctly.

```json
// Keycloak JWT payload example:
{
  "realm_access": {
    "roles": ["INTERNAL_SERVICE", "USER"]
  }
}
// Converted to Spring authorities: ["ROLE_INTERNAL_SERVICE", "ROLE_USER"]
```

### 5.2 OAuth2FeignConfig.java

```java
@Configuration
@RequiredArgsConstructor
public class OAuth2FeignConfig {

    private final OAuth2AuthorizedClientManager authorizedClientManager;

    @Value("${app.security.client-registrationId}")
    private String clientRegistrationId;   // = "user-service-client"

    @Bean
    public RequestInterceptor oauth2RequestInterceptor() {
        return requestTemplate -> {
            OAuth2AuthorizeRequest request = OAuth2AuthorizeRequest
                .withClientRegistrationId(clientRegistrationId)
                .principal(clientRegistrationId).build();

            OAuth2AuthorizedClient client = authorizedClientManager.authorize(request);
            if (isEmpty(client)) {
                throw new InvalidOAuth2Client(400, AUTH_INVALID_OAUTH_TOKEN_400, "Could not get oauth client...");
            }
            requestTemplate.header(HttpHeaders.AUTHORIZATION, "Bearer " + client.getAccessToken().getTokenValue());
        };
    }
}
```

Every outgoing Feign call (`KeyCloakService`) is intercepted by this `RequestInterceptor`:
1. Calls Keycloak's `token-uri` using `client_credentials` grant for `user-service-client`
2. Gets an access token
3. Injects it as `Authorization: Bearer <token>` on the Feign request

This allows the user-service to call `/internal/api/auth/register/users` on the auth-service, which requires `ROLE_INTERNAL_SERVICE`.

> **Token caching:** `OAuth2AuthorizedClientManager` caches tokens and only fetches a new one when the current token expires. This is built-in Spring Security behaviour.

### 5.3 KafkaWarnUp.java

```java
@Component
@RequiredArgsConstructor
public class KafkaWarnUp {

    private final ProducerFactory<String, Object> producerFactory;

    @PostConstruct
    public void init() {
        producerFactory.createProducer().close();
        log.info("Kafka connection established");
    }
}
```

Forces a Kafka connection at startup via `@PostConstruct`. Creating and immediately closing a producer validates that the Kafka broker is reachable. Prevents lazy-connection failures where the first message send fails silently at runtime.

### 5.4 UserServiceMongoConfig.java

```java
@Import(MongoConfig.class)
public class UserServiceMongoConfig {

    @Bean
    public KafkaTemplate<String, UserCreateEvent> userCreateTemplate(
            ProducerFactory<String, UserCreateEvent> producerFactory) {
        return new KafkaTemplate<>(producerFactory);
    }
}
```

Two responsibilities:
1. `@Import(MongoConfig.class)` — explicitly imports the `MongoConfig` bean from `arya-banking-common`, registering the `LocalDateTime` converters and `MongoTransactionManager`
2. Creates a **typed** `KafkaTemplate<String, UserCreateEvent>` bean — although `UserCreateProducer` currently uses the untyped `KafkaTemplate<String, Object>` from `KafkaConfiguration`

> **Note:** This class has no `@Configuration` annotation. Without it, `@Import` and `@Bean` methods may not be processed by Spring. This should be verified — add `@Configuration` if the bean is not being registered.

---

## 6. Controllers

### 6.1 UserController — `/api/users/**`

| Method | Path | Request | Response | Auth |
|---|---|---|---|---|
| `POST` | `/api/users/register` | `RegisterDto` (JSON body) | `UserResponse` | Public (permitAll) |
| `GET` | `/api/users/{userId}` | Path variable | `User` entity | Public (permitAll) |
| `PUT` | `/api/users/{userId}` | `UserUpdateDto` (JSON body) | `UserResponse` | Public (permitAll) |

### 6.2 SecurityDetailsController — `/api/security-details/**`

| Method | Path | Request | Response | Auth |
|---|---|---|---|---|
| `PUT` | `/api/security-details/{userId}` | `UpdateSecurityDetailsDto` (JSON body) | `Map<String, String>` | Public (permitAll) |

Used by the user themselves to update security questions.

### 6.3 InternalSecurityDetailsController — `/internal/api/security-details/**`

| Method | Path | Request | Response | Auth |
|---|---|---|---|---|
| `PUT` | `/internal/api/security-details/{userId}` | `?loginFailed=true/false` (query param) | `Map<String, String>` | `ROLE_INTERNAL_SERVICE` |

Called by **auth-service** after a failed login attempt. Increments `loginFailedAttempts` on `SecurityDetails` and locks the account after 5 failures.

---

## 7. DTOs

All DTOs are Java records with Jakarta Bean Validation annotations.

### RegisterDto

```java
public record RegisterDto(
    @Pattern(regexp = "^[A-Za-z]+$")          String firstName,
    @Pattern(regexp = "^[A-Za-z]+$")          String lastName,
    @Pattern(regexp = "^[\\w-.]+@...")         String emailId,
    @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{15,}$")
                                               String password,
    @Pattern(regexp = "^[6-9][0-9]{9}$")      String primaryContactNumber
)
```

| Field | Validation Rule |
|---|---|
| `firstName` | Letters only (`^[A-Za-z]+$`) |
| `lastName` | Letters only — note: typo in message: `"Lst name"` |
| `emailId` | Basic email regex |
| `password` | Minimum 15 chars, requires uppercase, lowercase, digit, special char (`@$!%*?&`) |
| `primaryContactNumber` | Indian mobile format — starts with 6-9, exactly 10 digits |

### UserUpdateDto

```java
public record UserUpdateDto(
    boolean isLockUser,
    @Valid UpdateContactDto updateContactDto,
    @Valid UpdateAddressDto updateAddressDto
)
```

Composite update DTO. If `isLockUser = true`, the user's status is set to `BLOCKED` and a Kafka event is emitted — the `updateContactDto` and `updateAddressDto` fields are ignored.

### UpdateSecurityDetailsDto

```java
public record UpdateSecurityDetailsDto(
    @Valid List<SecurityQuestions> securityQuestions,
    boolean loginFailed
)
```

Dual-purpose DTO:
- When `securityQuestions` is populated → updates Q&A pairs in `SecurityDetails`
- When `loginFailed = true` → increments failed attempt counter (used by the internal controller path)

---

## 8. Service Layer

### 8.1 UserServiceImpl

#### register()

```
RegisterDto received
    ↓
Check duplicate: userRepository.findByEmailIdOrPrimaryContactNumber(email, phone)
    → throws UserAlreadyExistsException (409) if found
    ↓
userMapper.toEntity(registerDto)         ← MapStruct maps firstName, lastName, emailId
    ↓
Set userId = "ARYA" + SHA256(firstName+lastName+timestamp).substring(0,6).toUpperCase()
Set contactNumbers = [ContactNumber(PRIMARY, unverified)]
Set status = "ACTIVE"
    ↓
userRepository.save(user)
    ↓
keyCloakService.createKeyCloakUser(keyCloakUser)  ← Feign → auth-service (with OAuth2 token)
    ↓
registrationProgressRepository.save(BASIC_DETAILS_ADDED progress)
    ↓
securityDetailsRepository.save(SecurityDetails(userId, all-false, 0 attempts))
    ↓
userCreateProducer.sendUserCreateEvent(UserCreateEvent)
    ↓
return UserResponse(userId, "User Registered Successfully", USER_CREATED_201)
```

**User ID generation:**
```java
"ARYA" + generateSHA256hash(firstName + lastName + System.currentTimeMillis()).substring(0, 6).toUpperCase()
// Example: "ARYAF3A2B1"
```

#### updateUser()

```
getUserById(userId)          ← throws UserNotFoundException (404) if missing
    ↓
if isLockUser:
    user.status = "BLOCKED"
    sendUserEvent(BLOCKED, userId)
else:
    if updateContactDto != null → updateContactNumber(user, dto)
    if updateAddressDto != null → updateAddress(user, dto)
    validateAndInvokeUpdateRegistrationStep(user, false, null)
    ↓
userRepository.save(user)
return UserResponse(userId, "User updated successfully", USER_UPDATED_200)
```

**Contact number update logic:**
- If `isPrimary = true`: demotes current PRIMARY to OTHERS, promotes new number to PRIMARY, updates `user.primaryContactNumber`
- If `isPrimary = false`: appends as OTHERS type
- Never removes numbers — they accumulate in `contactNumbers` list

**Address update logic:**
- Removes any existing address of the same `AddressType` (PERMANENT or RESIDENTIAL)
- Adds the new address
- Result: at most one PERMANENT and one RESIDENTIAL address at any time

### 8.2 SecurityDetailsServiceImpl

#### updateSecurityCredentials()

```
getSecurityDetails(userId)     ← throws SecurityDetailsNotFoundException (404) if missing
    ↓
if securityQuestions provided:
    merge new Q&A with existing (update answer if question exists, add if new)
    validateAndInvokeUpdateRegistrationStep(user, true, securityDetails)
    response = "Security questions updated successfully"
else if loginFailed:
    securityDetails.loginFailedAttempts++
    if attempts >= 5:
        response.put(DISABLE_USER, "true")
        userService.updateUser(userId, UserUpdateDto(isLockUser=true))
    ↓
securityDetailsRepository.save(securityDetails)
return Map{userId, responseCode, response}
```

**Account lock trigger:** 5 consecutive failed login attempts → `UserStatus.BLOCKED` + Kafka event sent.

---

## 9. Repositories

| Repository | Entity | Custom Queries |
|---|---|---|
| `UserRepository` | `User` (`user` collection) | `findByEmailIdOrPrimaryContactNumber(email, phone)` — duplicate check on register; `findByUserId(userId)` — lookup by app-level ID (not MongoDB `_id`) |
| `RegistrationProgressRepository` | `RegistrationProgress` (`registration_progress`) | `findByUserIdAndSubStatus(userId, subStatus)` — checks if a step is already recorded; `findByUserIdAndStatus(userId, status)` — checks if registration is complete |
| `SecurityDetailsRepository` | `SecurityDetails` (`security_details`) | `findByUserId(userId)` — lookup by app user ID |

---

## 10. UserValidator — Registration Flow Engine

`UserValidator` is the brain of the 3-step registration state machine. It determines where a user is in the flow and advances them to the next step.

### Registration Levels

```java
FIRST_LEVEL  = [firstName, lastName, primaryContactNumber, emailId]   // Step 1 complete
SECOND_LEVEL = [addresses (List)]                                       // Step 2 complete
THIRD_LEVEL  = [securityQuestions (List)]                              // Step 3 complete (SecurityDetails)
```

### validateRegistrationLevel(user)

Iterates through `LEVELS` (FIRST + SECOND). Returns:
- `0` — Step 1 not yet complete (missing name/email/phone)
- `1` — Step 1 complete (basic details saved)
- `2` — Steps 1+2 complete (address also saved)

Security questions (Step 3) are on `SecurityDetails`, not `User`, so they're checked separately via `validateSecurityQuestionsSet(securityDetails)`.

### updateRegistrationStep(user, level)

```java
switch (registrationLevel) {
    case 1 → validateAndGetRegistrationProgress(userId, BASIC_DETAILS_ADDED)
    case 2 → validateAndGetRegistrationProgress(userId, ADD_ADDRESS)
    case 3 → validateAndGetRegistrationProgress(userId, SECURITY_CREDENTIALS_ADDED)
}
```

Each case calls `validateAndGetRegistrationProgress` — which checks if that `subStatus` already exists in `registration_progress`. If it does not exist, a new `RegistrationProgress` record is saved and a Kafka event is emitted.

### Full 3-Step Flow

```
Step 1 — POST /api/users/register
  → UserServiceImpl.register()
  → Save User, call Keycloak, save SecurityDetails (empty)
  → Save RegistrationProgress(BASIC_DETAILS_ADDED, REGISTRATION_IN_PROGRESS, nextStep=ADD_SECURITY_DETAILS)
  → Emit UserCreateEvent(userId, status=BASIC_DETAILS_ADDITION_COMPLETED)

Step 2 — PUT /api/users/{userId} with updateAddressDto
  → UserServiceImpl.updateUser()
  → Add address to User
  → UserValidator.validateAndInvokeUpdateRegistrationStep(user, false, null)
      → level = 2 (firstName+lastName+phone+email + addresses all present)
      → Save RegistrationProgress(ADDRESS_ADDED, REGISTRATION_IN_PROGRESS, nextStep=ADD_SECURITY_CREDENTIALS)
  → Emit UserCreateEvent(userId, status=ADDRESS_ADDED)

Step 3 — PUT /api/security-details/{userId} with securityQuestions
  → SecurityDetailsServiceImpl.updateSecurityCredentials()
  → Merge security Q&A into SecurityDetails
  → UserValidator.validateAndInvokeUpdateRegistrationStep(user, true, securityDetails)
      → level = 2 (user fields) + 1 (security questions present) = 3
      → Save RegistrationProgress(SECURITY_CREDENTIALS_ADDED, REGISTRATION_COMPLETE, nextStep="")
  → Emit UserCreateEvent(userId, status=SECURITY_CREDENTIALS_ADDED)
```

---

## 11. Kafka Integration

### UserCreateProducer

```java
@Component
@RequiredArgsConstructor
public class UserCreateProducer {

    private final KafkaTemplate<String, Object> userCreateEventTemplate;

    public void sendUserCreateEvent(UserCreateEvent userCreateEvent) {
        userCreateEventTemplate.send("user-create-event", userCreateEvent.getUserId().toString(), userCreateEvent);
        log.info("User create event sent for: {}", userCreateEvent.getUserId());
    }
}
```

| Property | Value |
|---|---|
| Topic | `user-create-event` (hardcoded string — does not use `KafkaConstants.USER_CREATE_EVENT`) |
| Key | `userId` |
| Value | `UserCreateEvent` Avro record (from `arya-banking-common`) |
| Template | `KafkaTemplate<String, Object>` — injected from `KafkaConfiguration` in common library |

**Event payload (Avro):**

| Field | Type | When Set |
|---|---|---|
| `userId` | string | Always |
| `status` | string | Matches `subStatus` of registration step or `UserStatus` |
| `isEmailVerified` | boolean | Always `false` (email verification not yet implemented) |
| `isContactVerified` | boolean | Always `false` (contact verification not yet implemented) |

> **Topic name mismatch:** `UserCreateProducer` hardcodes `"user-create-event"` but `KafkaConstants.USER_CREATE_EVENT` in `arya-banking-common` is `"user.create.event"` (dot-separated). These are different topic names. The constant should be used for consistency.

---

## 12. External Service Integration

### KeyCloakService (Feign Client)

```java
@FeignClient(name = "ARYA-BANKING-AUTH-SERVICE", configuration = FeignConfiguration.class)
public interface KeyCloakService {

    @PostMapping("/internal/api/auth/register/users")
    ResponseEntity<KeyCloakResponse> createKeyCloakUser(@RequestBody KeyCloakUser keyCloakUser);
}
```

| Property | Value | Notes |
|---|---|---|
| `name` | `ARYA-BANKING-AUTH-SERVICE` | Uppercase Eureka service ID — resolved via Eureka to `arya-banking-auth-service` host |
| `configuration` | `FeignConfiguration.class` | Applies `FeignClientErrorDecoder` from common — deserialises error responses as `GlobalException` |
| `@PostMapping` | `/internal/api/auth/register/users` | Internal route — requires `ROLE_INTERNAL_SERVICE` JWT (injected by `OAuth2FeignConfig`) |

**Called with:**
```java
KeyCloakUser.builder()
    .username(user.getUserId())   // e.g. "ARYAF3A2B1"
    .firstName(user.getFirstName())
    .lastName(user.getLastName())
    .emailId(user.getEmailId())
    .password(registerDto.password())  // raw password — hashed by Keycloak
    .build()
```

---

## 13. Mapper

### UserMapper

```java
@Mapper(componentModel = "spring")
public interface UserMapper extends BaseMapper<User, RegisterDto> {
    User toEntity(RegisterDto registerDto);
    RegisterDto toDto(User user);
    List<User> toEntityList(List<RegisterDto> registerDtos);
    List<RegisterDto> toDtoList(List<User> users);
}
```

MapStruct generates the implementation at compile time. Maps `RegisterDto` fields to `User` entity fields by name matching. Fields in `User` not present in `RegisterDto` (`userId`, `status`, `contactNumbers`, etc.) are set manually in `UserServiceImpl.register()` after `toEntity()`.

---

## 14. Maven Build (pom.xml)

### 14.1 Coordinates

| Field | Value |
|---|---|
| `groupId` | `org.arya.banking` |
| `artifactId` | `arya-banking-user-service` |
| `version` | `1.0.0` |
| Parent | `spring-boot-starter-parent : 3.5.4` |
| Spring Cloud BOM | `spring-cloud-dependencies : 2025.0.0` |
| Common library | `arya-banking-common : 1.1.7` (from GitHub Packages) |

### 14.2 Full Dependency Table

| Dependency | Scope | Purpose |
|---|---|---|
| `spring-cloud-starter-openfeign` | compile | Feign HTTP clients for inter-service calls |
| `spring-cloud-starter-netflix-eureka-client` | compile | Eureka service registration and discovery |
| `spring-boot-starter-actuator` | compile | Health and metrics endpoints |
| `spring-boot-starter-batch` | compile | Spring Batch — included but no batch jobs defined yet |
| `spring-boot-starter-data-mongodb` | compile | Spring Data MongoDB repositories |
| `spring-boot-starter-validation` | compile | Jakarta Bean Validation on DTOs |
| `spring-boot-starter-web` | compile | Spring MVC (servlet, not reactive) |
| `kafka-streams` | compile | Kafka Streams API (future use) |
| `spring-kafka` | compile | Spring Kafka template and listener support |
| `spring-boot-starter-oauth2-client` | compile | `client_credentials` token fetching via `OAuth2AuthorizedClientManager` |
| `spring-boot-starter-oauth2-resource-server` | compile | JWT validation for incoming requests |
| `spring-cloud-starter-config` | compile | Pulls config from `arya-banking-config-server` |
| `spring-cloud-starter-bootstrap` | compile | Enables `bootstrap.yml` processing (required for Vault + Config Server) |
| `spring-cloud-starter-vault-config` | compile | HashiCorp Vault AppRole secret injection |
| `arya-banking-common` | compile | Shared domain models, exceptions, Kafka config, MongoDB config |
| `springdoc-openapi-starter-webmvc-ui` | compile | Swagger UI at `/swagger-ui.html` |
| `mapstruct` | compile | Type-safe mapper generation |
| `avro` | compile | Avro runtime for `UserCreateEvent` |
| `lombok` | provided | Boilerplate reduction |
| `spring-boot-devtools` | runtime/optional | Hot reload |
| `spring-boot-starter-test` | test | JUnit 5 + Mockito + Spring Test |
| `spring-batch-test` | test | Spring Batch test utilities |
| `spring-kafka-test` | test | Embedded Kafka for integration tests |

### 14.3 Build Plugins

| Plugin | Version | Purpose |
|---|---|---|
| `maven-compiler-plugin` | `3.11.0` | Wires MapStruct + Lombok annotation processors |
| `jacoco-maven-plugin` | `0.8.13` | Code coverage → `target/site/jacoco/jacoco.xml` |
| `spotbugs-maven-plugin` | `4.8.6.1` | Static bug analysis |
| `spring-boot-maven-plugin` | from parent | Fat JAR + Paketo buildpack image |

---

## 15. GitHub Issues — Planned Work (.github/issues.json)

14 planned GitHub issues for the User Management Service:

| # | Task | Labels |
|---|---|---|
| 1 | Register user (Step 1 — name, email, phone) | user-management, registration |
| 2 | Validate email format | user-management, validation |
| 3 | Validate phone format | user-management, validation |
| 4 | Check duplicate email/phone | user-management, validation |
| 5 | Store registration step state | user-management, registration |
| 6 | Create full User object on Step 1 | user-management, registration |
| 7 | Add permanent address | user-management, address |
| 8 | Add communication address | user-management, address |
| 9 | Verify pincode format | user-management, validation, address |
| 10 | Save addresses against user ID | user-management, address |
| 11 | Update user profile information | user-management, profile |
| 12 | User blocking (admin/user triggered) | user-management, security, user-blocking |
| 13 | User deletion (soft and hard) | user-management, gdpr, deletion |
| 14 | Complete registration flow (emit UserFullyRegistered event) | user-management, event |

> Items 1–10 are implemented. Items 11–14 are partially implemented or pending.

---

## 16. CI/CD Workflows

### sonar-report.yml
Same pattern as `arya-banking-api-gateway` — validates secrets exist first, then delegates to `arya-banking-workflows` reusable workflow. Passes `GH_PAT` for GitHub Packages access to `arya-banking-common`.

### auto-create-issues.yaml
Delegates to `arya-banking-workflows/issue-creation.yaml` to create GitHub issues + milestones from `issues.json`. Manual trigger only.

### delete-all-issues.yaml
A utility workflow with a confirmation gate (`"DELETE-ALL-ISSUES"` must be typed as input). Uses Python + GitHub REST API to delete all open (optionally closed) issues and milestones. Includes rate limiting (`time.sleep(0.2)`), PR skipping, and a verification step.

---

## 17. Known Issues & Improvement Suggestions

| # | Location | Issue | Recommendation |
|---|---|---|---|
| 1 | `bootstrap.yml` | `app-role.role-id` and `secret-id` hardcoded in source | Inject via `VAULT_ROLE_ID` and `VAULT_SECRET_ID` env vars. Never commit credentials. |
| 2 | `bootstrap.yml` | `secret-id` expires (default Vault TTL) — service will fail to start after expiry | Use `secret-id-num-uses: 0` with a CI pipeline that generates a fresh secret-id per deployment, or use Vault Agent for dynamic injection |
| 3 | `UserCreateProducer.java` | Topic name `"user-create-event"` hardcoded — mismatches `KafkaConstants.USER_CREATE_EVENT = "user.create.event"` | Use `KafkaConstants.USER_CREATE_EVENT` constant consistently |
| 4 | `UserServiceImpl.java` | `user.getAddresss()` — field name typo propagated from `arya-banking-common` `User` model | Fix typo in common library + migration |
| 5 | `RegisterDto.java` | Typo in error message: `"Lst name should contain only alphabets"` | Fix to `"Last name..."` |
| 6 | `SecurityConfig.java` | `/api/**` is fully `permitAll()` — downstream service does not re-validate JWT | Consider adding `authenticated()` for non-registration endpoints. Defence-in-depth is recommended. |
| 7 | `UserServiceMongoConfig.java` | Missing `@Configuration` annotation | Add `@Configuration` or the `@Import(MongoConfig.class)` and typed `KafkaTemplate` `@Bean` may not be processed |
| 8 | `UserServiceImpl.register()` | No `@Transactional` rollback if Keycloak call fails after user is saved to MongoDB | Wrap in a compensating transaction or use a saga pattern: if Keycloak fails, delete the saved user |
| 9 | `AryaBankingUserServiceApplicationTests.java` | `@Test` and `@SpringBootTest` context load test is disabled | Re-enable and mock external dependencies (Vault, Kafka, MongoDB) with `@MockBean` / Testcontainers |
| 10 | `pom.xml` | `spring-boot-starter-batch` included but no batch jobs exist | Remove until batch processing is needed to reduce startup overhead |
| 11 | `application.yaml` | `spring.application.topic: user-create-event` is defined but never referenced via `@Value` | Wire it into `UserCreateProducer` via `@Value("${spring.application.topic}")` |
| 12 | `UserServiceImpl.updateUser()` | `User.getAddresss()` null-check only done in `updateAddress()` — `updateContactNumber()` assumes non-null `contactNumbers` | Add null-safe initialisation for `contactNumbers` similar to address handling |

---

## 18. Quick Reference

### Common Commands

| Task | Command |
|---|---|
| Run locally | `mvn spring-boot:run` |
| Build JAR | `mvn -DskipTests package` |
| Run tests | `mvn clean verify` |
| SpotBugs check | `mvn spotbugs:check` |
| JaCoCo report | `mvn verify` → `target/site/jacoco/index.html` |
| Swagger UI | `http://localhost:8086/swagger-ui.html` |

### API Endpoints

```
POST   /api/users/register                  → Register new user (Step 1)
GET    /api/users/{userId}                  → Get user by ID
PUT    /api/users/{userId}                  → Update user (address/contact/lock)
PUT    /api/security-details/{userId}       → Update security questions
PUT    /internal/api/security-details/{userId}?loginFailed=true   → Increment failed login (service only)
GET    /actuator/health                     → Health check
GET    /swagger-ui.html                     → API documentation
```

### Environment Variables / Secrets Required

| Variable | Source | Purpose |
|---|---|---|
| `MONGO.PASSWORD` | Vault `secret/arya-banking/user-service` | MongoDB Atlas password |
| `USER.SERVICE.CLIENT.SECRET` | Vault `secret/arya-banking/user-service` | Keycloak client secret for `user-service-client` |
| `GH_PAT` | CI secret | GitHub Packages access to `arya-banking-common` |
| `SONAR_TOKEN` | CI secret | SonarCloud analysis |
| `SONAR_PROJECT_KEY` | CI secret | SonarCloud project identifier |
| `SONAR_ORG` | CI secret | SonarCloud organisation |
| `ORG_ISSUE_TOKEN` | CI secret | GitHub issue creation across org |

### MongoDB Collections Used

| Collection | Class | Notes |
|---|---|---|
| `user` | `User` | Core user document |
| `registration_progress` | `RegistrationProgress` | One record per step per user |
| `security_details` | `SecurityDetails` | One record per user |
