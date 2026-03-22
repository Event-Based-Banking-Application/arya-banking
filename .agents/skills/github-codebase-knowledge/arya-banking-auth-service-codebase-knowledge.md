# Arya Banking Auth Service
## Codebase Knowledge Document

| Field | Value |
|---|---|
| Repository | `arya-banking-auth-service` |
| Artifact ID | `arya-banking-auth-service` |
| Group ID | `org.arya.banking` |
| Version | `1.0.0` |
| Java | 17 |
| Spring Boot | `3.5.4` |
| Spring Cloud | `2025.0.0` |
| Port | `8087` |
| License | Apache 2.0 |
| Developer | Karthik Kulkarni |

---

## 1. Overview

`arya-banking-auth-service` is the **authentication and identity bridge** between the Arya Banking platform and Keycloak. It is the only service in the ecosystem that directly manages Keycloak users via the Keycloak Admin Client SDK. All other services validate tokens but do not create or manage Keycloak users directly.

**Core responsibilities:**

| Responsibility | Implementation |
|---|---|
| Create Keycloak users on registration | `KeyCloakServiceImpl.createKeyCloakUser()` via Admin Client |
| Authenticate users and return JWT | `KeyCloakServiceImpl.authenticateUser()` via Keycloak token endpoint + `RestTemplate` |
| Track failed login attempts | Calls `user-service /internal/api/security-details/{userId}` via Feign |
| Disable Keycloak account after 5 failures | `updateUserRepresentation()` — sets `enabled=false` on Keycloak `UserRepresentation` |
| Expose internal user creation endpoint | `InternalKeyCloakController POST /internal/api/auth/register/users` — called by `user-service` |

**Two distinct Keycloak client roles:**
- `arya-banking-auth-client` — Admin Client SDK credentials for managing Keycloak users (create, search, update)
- `auth-service-client` — OAuth2 `client_credentials` credentials for service-to-service token acquisition (Feign calls to other services)

---

## 2. Repository Structure

```
arya-banking-auth-service/
├── src/
│   ├── main/
│   │   ├── java/org/arya/banking/auth/
│   │   │   ├── AryaBankingAuthServiceApplication.java       ← Entry point
│   │   │   ├── config/
│   │   │   │   ├── HttpConfig.java                          ← Pooled RestTemplate bean
│   │   │   │   ├── OAuth2FeignConfig.java                   ← Feign OAuth2 token interceptor
│   │   │   │   └── SecurityConfig.java                      ← HTTP security + Keycloak JWT converter
│   │   │   ├── controller/
│   │   │   │   ├── KeyCloakController.java                  ← /api/auth/authenticate (public)
│   │   │   │   └── InternalKeyCloakController.java          ← /internal/api/auth/register/users
│   │   │   ├── external/
│   │   │   │   └── UserService.java                         ← Feign client to user-service
│   │   │   └── service/
│   │   │       ├── KeyCloakManager.java                     ← Keycloak Admin Client initialiser
│   │   │       ├── KeyCloakService.java                     ← Interface
│   │   │       └── impl/
│   │   │           └── KeyCloakServiceImpl.java             ← All Keycloak operations
│   │   └── resources/
│   │       ├── application.yaml                             ← Port, OAuth2, config server import
│   │       └── bootstrap.yml                               ← Vault AppRole + Config Server URI
│   └── test/
│       └── AryaBankingAuthServiceApplicationTests.java      ← Context test (disabled)
├── .github/
│   ├── issues.json                                          ← 15 auth + 9 cross-cutting issues
│   └── workflows/
│       ├── auto-create-issues.yaml
│       └── sonar-report.yml
├── docker-compose.yaml                                      ← Local Keycloak + platform stack
├── pom.xml
├── settings.xml
└── add-secrets.sh
```

---

## 3. Entry Point — AryaBankingAuthServiceApplication.java

```java
@SpringBootApplication(exclude = {
    DataSourceAutoConfiguration.class,
    DataSourceTransactionManagerAutoConfiguration.class,
    HibernateJpaAutoConfiguration.class
})
@EnableDiscoveryClient
@ComponentScan(basePackages = {"org.arya.banking.auth", "org.arya.banking.common"})
@EnableFeignClients(defaultConfiguration = OAuth2FeignConfig.class)
public class AryaBankingAuthServiceApplication { ... }
```

| Annotation | Purpose |
|---|---|
| `@SpringBootApplication(exclude = {...})` | Excludes JPA/JDBC auto-config — auth-service does not use a relational database. Keycloak data is managed via the Admin SDK, not directly through JPA. |
| `@ComponentScan({"...auth", "...common"})` | Scans both local packages and `arya-banking-common` to register `GlobalExceptionHandler`, `KafkaConfiguration`, `OAuth2ClientConfig` etc. |
| `@EnableDiscoveryClient` | Registers as `arya-banking-auth-service` in Eureka |
| `@EnableFeignClients(defaultConfiguration = OAuth2FeignConfig.class)` | All Feign clients auto-inject `Bearer` tokens via `OAuth2FeignConfig` interceptor |

> **Note:** Unlike `AryaBankingUserServiceApplication`, auth-service does **not** have `@EnableMongoAuditing` — it has no MongoDB documents of its own. All persistence is via the Keycloak Admin Client.

---

## 4. Configuration Files

### 4.1 application.yaml

```yaml
server:
  port: 8087

spring:
  application:
    name: arya-banking-auth-service
    database: auth

  config:
    import: configserver:http://localhost:8090

  security:
    oauth2:
      client:
        provider:
          keycloak:
            token-uri: ${app.config.keycloak.token-uri}
        registration:
          auth-service-client:
            provider: keycloak
            client-id: auth-service-client
            client-secret: ${AUTH.SERVICE.CLIENT.SECRET}
            authorization-grant-type: client_credentials
      resourceserver:
        jwt:
          jwk-set-uri: ${app.config.keycloak.jwk-set-uri}

app:
  security:
    client-registrationId: auth-service-client
  config:
    keycloak:
      client-id: arya-banking-auth-client
      client-secret: ${ARYA.BANKING.AUTH.CLIENT.SECRET}
```

**Key properties:**

| Property | Value | Source | Purpose |
|---|---|---|---|
| `server.port` | `8087` | Local | Matches gateway route `uri: http://localhost:8087` |
| `spring.application.database` | `auth` | Local | Placeholder — auth-service has no MongoDB DB of its own |
| `spring.config.import` | `configserver:http://localhost:8090` | Local | Pulls `app.config.keycloak.url`, `realm`, `token-uri`, `jwk-set-uri` from config server |
| `security.oauth2.client.registration.auth-service-client.client-secret` | `${AUTH.SERVICE.CLIENT.SECRET}` | **Vault** | Secret for `client_credentials` token used by Feign calls to other services |
| `app.config.keycloak.client-id` | `arya-banking-auth-client` | Local | Admin Client SDK client ID for managing Keycloak users |
| `app.config.keycloak.client-secret` | `${ARYA.BANKING.AUTH.CLIENT.SECRET}` | **Vault** | Admin Client SDK secret — grants access to Keycloak Admin REST API |

> **Two separate Keycloak clients — critical distinction:**
>
> | Client | Config key | Used by | Purpose |
> |---|---|---|---|
> | `auth-service-client` | `spring.security.oauth2.client.registration` | `OAuth2FeignConfig` | `client_credentials` grant for service-to-service Feign calls |
> | `arya-banking-auth-client` | `app.config.keycloak` | `KeyCloakManager` | Admin SDK — create/search/update Keycloak users |

### 4.2 bootstrap.yml

```yaml
spring:
  application:
    name: auth-service

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
        role-id: 740524ed-edd1-d034-b89c-bae47f072eaa
        secret-id: 9853456a-b211-f565-9539-335b10fffe0b
      kv:
        enabled: true
        backend: secret
        default-context: ""
        application-name: arya-banking/auth-service
        profile-separator: /
```

| Property | Value | Notes |
|---|---|---|
| `spring.application.name` | `auth-service` | Determines Vault secret path: `secret/data/arya-banking/auth-service` |
| `vault.authentication` | `APPROLE` | AppRole auth method — uses role-id + secret-id |
| `vault.app-role.role-id` | `740524ed-...` | ⚠️ **Hardcoded in source** |
| `vault.app-role.secret-id` | `9853456a-...` | ⚠️ **Hardcoded + will expire** |
| `vault.kv.kv-version` | **NOT SET** | ⚠️ Missing `kv-version: 2` — the default is KV v1. If Vault's `secret/` engine is mounted as v2 (which `arya-banking-infra` does), this mismatch will cause secret fetch failures at startup |
| `vault.kv.application-name` | `arya-banking/auth-service` | Vault reads from `secret/data/arya-banking/auth-service` |

> ⚠️ **Critical:** `kv-version: 2` is missing from `bootstrap.yml`. The `user-service` bootstrap has `kv-version: 2` explicitly. Without it, Spring Cloud Vault defaults to v1 path format (`secret/arya-banking/auth-service`) instead of v2 (`secret/data/arya-banking/auth-service`). This will cause `${AUTH.SERVICE.CLIENT.SECRET}` and `${ARYA.BANKING.AUTH.CLIENT.SECRET}` to remain unresolved at startup.

---

## 5. Configuration Classes

### 5.1 SecurityConfig.java

```java
@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity httpSecurity) throws Exception {
        httpSecurity.csrf(AbstractHttpConfigurer::disable)
            .authorizeHttpRequests(request ->
                request.requestMatchers("/api/auth/authenticate").permitAll()
                    .requestMatchers("/internal/**").hasAnyAuthority("ROLE_INTERNAL_SERVICE")
                    .anyRequest().authenticated())
            .oauth2ResourceServer(oauth2 -> oauth2.jwt(
                jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter())));
        return httpSecurity.build();
    }
}
```

**Authorization rules:**

| Pattern | Rule | Who |
|---|---|---|
| `/api/auth/authenticate` | `permitAll()` | Anyone — login endpoint needs no prior auth |
| `/internal/**` | `hasAnyAuthority("ROLE_INTERNAL_SERVICE")` | Only `user-service` presenting a service token |
| `anyRequest()` | `authenticated()` | Valid JWT required |

The `jwtAuthenticationConverter` is identical to the one in `user-service` — reads `realm_access.roles` from Keycloak JWT and prefixes with `ROLE_`. Null-safe (returns empty list if `realm_access` is missing).

### 5.2 OAuth2FeignConfig.java

Identical in pattern to `user-service/OAuth2FeignConfig`. Uses `app.security.client-registrationId = auth-service-client` to fetch a `client_credentials` token from Keycloak and inject it as `Authorization: Bearer <token>` on all Feign calls (specifically `UserService.updateLoginAttempts()`).

### 5.3 HttpConfig.java

```java
@Configuration
public class HttpConfig {

    @Bean
    public RestTemplate restTemplate() {
        PoolingHttpClientConnectionManager connManager = new PoolingHttpClientConnectionManager();
        connManager.setMaxTotal(100);
        connManager.setDefaultMaxPerRoute(20);

        HttpClient httpClient = HttpClients.custom()
            .setConnectionManager(connManager).build();

        HttpComponentsClientHttpRequestFactory factory =
            new HttpComponentsClientHttpRequestFactory(httpClient);

        RestTemplate restTemplate = new RestTemplate(factory);
        restTemplate.setErrorHandler(new ResponseErrorHandler() {
            @Override
            public boolean hasError(ClientHttpResponse response) throws IOException {
                return false;  // Never throw on HTTP errors
            }
        });
        return restTemplate;
    }
}
```

Creates a **pooled `RestTemplate`** with Apache HttpClient 5 connection pooling:

| Setting | Value | Purpose |
|---|---|---|
| `setMaxTotal(100)` | 100 total connections | Shared across all routes |
| `setDefaultMaxPerRoute(20)` | 20 per route | Max concurrent connections to any single host (i.e. Keycloak) |
| `setErrorHandler(never throws)` | — | **Disables default Spring error throwing** on 4xx/5xx responses. Auth-service checks status codes manually in `authenticateUser()`. Without this, `RestTemplate.exchange()` would throw on 401 before the code can inspect the response. |

> **Why `RestTemplate` and not `WebClient`?** Auth-service is a servlet-based Spring MVC app. `RestTemplate` is appropriate here. The custom error handler is deliberate — the code inspects `response.getStatusCode().value() == 401` directly.

---

## 6. Service Layer

### 6.1 KeyCloakManager.java

```java
@Getter
@Component
public class KeyCloakManager {

    @Value("${app.config.keycloak.url}")        private String serverUrl;
    @Value("${app.config.keycloak.realm}")       private String keyCloakRealm;
    @Value("${app.config.keycloak.client-id}")   private String clientId;       // arya-banking-auth-client
    @Value("${app.config.keycloak.client-secret}") private String clientSecret;  // from Vault
    @Value("${app.config.keycloak.token-uri}")   private String tokenUrl;

    private Keycloak keycloak;

    @PostConstruct
    public void init() {
        keycloak = KeycloakBuilder.builder()
            .serverUrl(serverUrl)
            .realm(keyCloakRealm)
            .clientId(clientId)
            .clientSecret(clientSecret)
            .grantType("client_credentials")
            .build();
    }

    public RealmResource getKeyCloakInstanceWithRealm() {
        return keycloak.realm(keyCloakRealm);
    }

    @Bean
    public UsersResource getUsersResource() {
        return getKeyCloakInstanceWithRealm().users();
    }
}
```

Initialises the Keycloak Admin Client SDK at startup. The `Keycloak` instance is a lazy HTTP client — it does not connect at startup, only when an Admin API call is made.

| Getter | Used In | Purpose |
|---|---|---|
| `getClientId()` | `KeyCloakServiceImpl.authenticateUser()` | Added as `client_id` in token request form data |
| `getClientSecret()` | `KeyCloakServiceImpl.authenticateUser()` | Added as `client_secret` in token request form data |
| `getTokenUrl()` | `KeyCloakServiceImpl.authenticateUser()` | Keycloak token endpoint URL |
| `getKeyCloakInstanceWithRealm()` | — | Returns `RealmResource` for realm-level operations |
| `getUsersResource()` | `KeyCloakServiceImpl` (injected `@Bean`) | `UsersResource` for user CRUD operations |

> **`@Bean` inside a `@Component`:** `getUsersResource()` is annotated `@Bean` inside a `@Component`. This works because Spring processes `@Bean` methods in `@Component`-annotated classes via subclass proxying (CGLIB). However, it is a non-standard pattern — the conventional approach is to put `@Bean` methods in a `@Configuration` class.

### 6.2 KeyCloakService Interface

```java
public interface KeyCloakService {
    KeyCloakResponse createKeyCloakUser(KeyCloakUser keyCloakUser);
    String authenticateUser(String username, String password);
    UserRepresentation findUserByUsername(String username);
    List<UserRepresentation> findUserByUserId(String userId);  // returns empty List — not implemented
}
```

### 6.3 KeyCloakServiceImpl — Method Deep-Dives

#### createKeyCloakUser()

```
KeyCloakUser received (userId as username, firstName, lastName, emailId, password)
    ↓
Build UserRepresentation:
    - username = keyCloakUser.getUsername()  (e.g. "ARYAF3A2B1")
    - firstName, lastName, email
    - emailVerified = false
    - enabled = true
    - credentials = [CredentialRepresentation(PASSWORD, value=rawPassword, temporary=false)]
    ↓
usersResource.create(userRepresentation)
    → HTTP 201 → return KeyCloakResponse("201", responseBody)
    → HTTP != 201 → throw KeyCloakServiceException(status, AUTH_KEYCLOAK_USER_CREATION_FAILED_400, message)
    → Exception thrown → throw KeyCloakServiceException(500, AUTH_KEYCLOAK_INTERNAL_SERVER_ERROR_500, cause)
```

> **Password handling:** The raw password from `RegisterDto` is passed to Keycloak in `CredentialRepresentation`. Keycloak hashes it using Argon2id (configured in `arya-banking-infra/compose/keycloak.yml`). Auth-service itself never stores passwords.

#### authenticateUser()

```
username + password received
    ↓
Build form data:
    client_id     = arya-banking-auth-client
    client_secret = (from Vault via KeyCloakManager)
    grant_type    = password
    username      = username
    password      = password
    ↓
RestTemplate.exchange(tokenUrl, POST, formData, HashMap.class)
    ↓
response.status == 401 (wrong credentials):
    → updateLoginFailedAttempts(username)  ← Feign call to user-service
    → throw KeyCloakServiceException(401, SECURITY_INVALID_CREDENTIALS_401, "Invalid username or password")

response.status == 400 AND error_description == "Account disabled":
    → throw KeyCloakServiceException(403, ACCOUNT_LOCKED_403, "Account is locked...")

success:
    → return response.body.get("access_token").toString()
```

> **`grant_type: password`** (Resource Owner Password Credentials): This grant type is deprecated in OAuth 2.1. It requires the client to handle user credentials directly. The recommended migration path is Authorization Code + PKCE. This is noted in the issues section below.

#### updateLoginFailedAttempts()

```
userService.updateLoginAttempts(username.toUpperCase(), loginFailed=true)
    ↓
If response.body.get("disableUser") == "true":
    → updateUserRepresentation(username, response.body)
        → findUserByUsername(username)
        → userRepresentation.setEnabled(false)
        → usersResource.get(userRepresentation.getId()).update(userRepresentation)
```

This creates a **cross-service account lock flow**:

```
auth-service.authenticateUser()
    ↓ (5th failed attempt)
    → Feign call: user-service /internal/api/security-details/{userId}?loginFailed=true
            ↓
            user-service.SecurityDetailsServiceImpl:
                loginFailedAttempts >= 5 → set User.status = BLOCKED
                → return Map{disableUser: "true"}
    ↓
    → auth-service: setEnabled(false) on Keycloak UserRepresentation
    → Keycloak: user account disabled
```

---

## 7. Controllers

### 7.1 KeyCloakController — `/api/auth/**` (Public)

| Method | Path | Parameters | Response | Auth |
|---|---|---|---|---|
| `GET` | `/api/auth/authenticate` | `?username=&password=` (query params) | JWT access token string | Public |

> **Design note:** Using `GET` with credentials as query parameters is a security anti-pattern. Query parameters are logged in server access logs, browser history, and HTTP Referer headers. This should be changed to `POST` with credentials in the request body.

### 7.2 InternalKeyCloakController — `/internal/api/auth/**` (Service-only)

| Method | Path | Request Body | Response | Auth |
|---|---|---|---|---|
| `POST` | `/internal/api/auth/register/users` | `KeyCloakUser` JSON | `KeyCloakResponse` | `ROLE_INTERNAL_SERVICE` |

Called exclusively by `user-service/KeyCloakService` Feign client during user registration. The OAuth2 bearer token injected by `user-service`'s `OAuth2FeignConfig` must carry `ROLE_INTERNAL_SERVICE`.

---

## 8. External Service Integration

### UserService (Feign Client)

```java
@FeignClient(name = "ARYA-BANKING-USER-SERVICE", configuration = FeignConfiguration.class)
public interface UserService {

    @PutMapping("/internal/api/security-details/{userId}")
    ResponseEntity<Map<String, String>> updateLoginAttempts(
        @PathVariable String userId,
        @RequestParam boolean loginFailed);
}
```

| Property | Value | Notes |
|---|---|---|
| `name` | `ARYA-BANKING-USER-SERVICE` | Uppercase Eureka service ID — resolved via Eureka |
| `configuration` | `FeignConfiguration.class` | Applies `FeignClientErrorDecoder` from common library |
| Mapped to | `user-service InternalSecurityDetailsController` | `/internal/api/security-details/{userId}?loginFailed=true` |

**Cross-service call chain on login failure:**
```
Gateway → auth-service /api/auth/authenticate
    → Keycloak returns 401
    → auth-service Feign → user-service /internal/api/security-details/{userId}?loginFailed=true
        → user-service increments loginFailedAttempts
        → if >= 5: returns {disableUser: "true"}, sets User.status=BLOCKED
    → auth-service: if disableUser=true → Keycloak.setEnabled(false)
```

> **Username case handling:** `updateLoginAttempts(username.toUpperCase(), true)` — the username is uppercased before the Feign call. This assumes the `userId` stored in `SecurityDetails` is uppercase (e.g., `ARYAF3A2B1`). Verify consistency across registration and login flows.

---

## 9. Maven Build (pom.xml)

### 9.1 Coordinates

| Field | Value |
|---|---|
| `groupId` | `org.arya.banking` |
| `artifactId` | `arya-banking-auth-service` |
| `version` | `1.0.0` |
| Parent | `spring-boot-starter-parent : 3.5.4` |
| Spring Cloud BOM | `spring-cloud-dependencies : 2025.0.0` |
| Common library | `arya-banking-common : 1.1.7` (GitHub Packages) |

> ⚠️ **SCM block error:** `pom.xml` has `<scm>` pointing to `arya-banking-common` repo, not `arya-banking-auth-service`. This is a copy-paste error from another service's POM.

### 9.2 Full Dependency Table

| Dependency | Scope | Purpose |
|---|---|---|
| `spring-cloud-starter-netflix-eureka-client` | compile | Eureka registration and service discovery |
| `spring-boot-starter-actuator` | compile | Health and metrics endpoints |
| `spring-boot-starter-batch` | compile | Spring Batch — included, no jobs defined yet |
| `spring-cloud-starter-openfeign` | compile | Feign client to user-service |
| `spring-boot-starter-validation` | compile | Jakarta Bean Validation |
| `spring-boot-starter-web` | compile | Spring MVC (servlet) |
| `kafka-streams` | compile | Kafka Streams (future use) |
| `spring-kafka` | compile | Spring Kafka (future Kafka event publishing) |
| `arya-banking-common` | compile | Shared exceptions, DTOs, models, configs |
| `mapstruct` | compile | Type-safe mapper generation |
| `keycloak-admin-client` | `26.0.4` | Keycloak Admin REST API SDK — user management |
| `lombok` | provided | Boilerplate reduction |
| `spring-boot-starter-oauth2-client` | compile | `client_credentials` token for Feign calls |
| `spring-boot-starter-oauth2-resource-server` | compile | JWT validation for incoming requests |
| `httpclient` | `4.5.13` | Apache HttpClient 4 for `RestTemplate` pooling |
| `spring-cloud-starter-config` | compile | Config server client |
| `spring-cloud-starter-bootstrap` | compile | Enables `bootstrap.yml` for Vault + Config Server |
| `spring-cloud-starter-vault-config` | compile | HashiCorp Vault AppRole secret injection |
| `spring-boot-devtools` | runtime/optional | Hot reload |
| `spring-boot-starter-test` | test | JUnit 5 + Mockito + Spring Test |
| `spring-batch-test` | test | Spring Batch test utilities |
| `spring-kafka-test` | test | Embedded Kafka for integration tests |

> ⚠️ **HttpClient version conflict:** The POM declares `org.apache.httpcomponents:httpclient:4.5.13` (Apache HttpClient 4.x), but `HttpConfig.java` imports from `org.apache.hc.client5` (Apache HttpClient **5.x**). HttpClient 5 is a different artifact (`org.apache.httpcomponents.client5:httpclient5`) with a different package structure. The declared dependency will not satisfy the imports. Either update the dependency to `httpclient5` or update the code to use 4.x APIs.

### 9.3 Build Plugins

| Plugin | Version | Purpose |
|---|---|---|
| `jacoco-maven-plugin` | `0.8.13` | Code coverage |
| `spring-boot-maven-plugin` | from parent | Fat JAR + Paketo buildpack |
| `maven-compiler-plugin` | `3.10.1` | MapStruct + Lombok annotation processors |
| `spotbugs-maven-plugin` | `4.8.6.1` | Static bug analysis |

---

## 10. docker-compose.yaml (Local Dev)

```yaml
version: '1.0'

networks:
  arya-banking-keycloak:  driver: bridge
  arya-banking-config:    driver: bridge

services:
  postgres:      # Keycloak DB — port 5432
  keycloak:      # port 5433 → internal 8080
  service-registry: # port 8761
  config-server:    # port 8090
```

**Key observations:**

| Issue | Detail |
|---|---|
| `version: '1.0'` | Invalid Compose version string — valid values are `'3'`, `'3.8'`, etc. Docker Compose may ignore this or warn. |
| Two separate networks | `arya-banking-keycloak` for Keycloak+Postgres, `arya-banking-config` for registry+config. These networks are **isolated** — Keycloak and config-server cannot communicate directly. This is intentional if the networks don't need to interact. |
| Not the canonical infra | This is a legacy per-service Compose file. The canonical infra is in `arya-banking-infra` using the shared `arya-banking-net` network. |
| `keycloak-data` and `postgres-data` gitignored | Listed in `.gitignore` — bind mount directories are excluded from source control. ✅ |

---

## 11. Full Authentication Flow

```
Client → GET /api/auth/authenticate?username=ARYAF3A2B1&password=***
    ↓
Gateway (port 8085)
    ├─ Path matches /api/auth/authenticate → permitAll (no JWT required)
    └─ Routes to auth-service:8087

auth-service SecurityConfig → permitAll for /api/auth/authenticate
    ↓
KeyCloakController.authenticate(username, password)
    ↓
KeyCloakServiceImpl.authenticateUser(username, password)
    ↓
Build POST form: client_id=arya-banking-auth-client, client_secret=***, grant_type=password, username, password
    ↓
RestTemplate.exchange(keycloak-token-uri, POST, formData)
    ↓
    ├─ 200 OK → return access_token string → 200 to client
    │
    ├─ 401 Unauthorized (wrong credentials):
    │   ├─ Feign → user-service /internal/api/security-details/{USERNAME}?loginFailed=true
    │   │   └─ user-service: loginFailedAttempts++
    │   │       └─ if >= 5: User.status=BLOCKED, return {disableUser: "true"}
    │   ├─ if disableUser=true: Keycloak.setEnabled(false)
    │   └─ throw KeyCloakServiceException(401, SECURITY_INVALID_CREDENTIALS_401)
    │       └─ GlobalExceptionHandler → 401 ErrorResponse to client
    │
    └─ 400 + "Account disabled":
        └─ throw KeyCloakServiceException(403, ACCOUNT_LOCKED_403)
            └─ GlobalExceptionHandler → 403 ErrorResponse to client
```

---

## 12. Full User Registration Flow (auth-service perspective)

```
user-service registers a new user:
    ↓
user-service Feign (OAuth2FeignConfig adds Bearer token):
    POST /internal/api/auth/register/users
    Body: KeyCloakUser{username=ARYAF3A2B1, firstName, lastName, emailId, password}
    ↓
auth-service SecurityConfig: /internal/** requires ROLE_INTERNAL_SERVICE ← validated
    ↓
InternalKeyCloakController.registerUser(keyCloakUser)
    ↓
KeyCloakServiceImpl.createKeyCloakUser(keyCloakUser)
    ↓
Build UserRepresentation + CredentialRepresentation(password, temporary=false)
    ↓
usersResource.create(userRepresentation) → Keycloak Admin REST API
    ↓
    ├─ 201 Created → return KeyCloakResponse("201", body)
    ├─ Non-201 → throw KeyCloakServiceException(status, USER_CREATION_FAILED)
    └─ Exception → throw KeyCloakServiceException(500, INTERNAL_SERVER_ERROR)
```

---

## 13. GitHub Issues (.github/issues.json)

The issues file contains **two services merged in one JSON array** with a structural error (a raw array nested inside another JSON array). This is likely a parsing issue for the `auto-create-issues` workflow.

**Auth Service issues (15 total):**

| # | Task | Labels |
|---|---|---|
| 1 | Register credentials (Step 2 — username/password) | auth, registration |
| 2 | Save hashed password | auth, security |
| 3 | Set security questions & answers | auth, security |
| 4 | Login endpoint | auth, login |
| 5 | Track failed login attempts | auth, security |
| 6 | Lock account after 5 failed attempts | auth, security |
| 7 | JWT generation via Keycloak | auth, security, keycloak |
| 8 | Logout endpoint | auth, logout |
| 9 | Password reset (via token/email) | auth, security, reset |
| 10 | Change password | auth, security |
| 11 | Setup Realm | security, keycloak |
| 12 | Create client for Gateway | security, keycloak |
| 13 | Token lifespan configuration | security, keycloak |
| 14 | Map roles to APIs | security, keycloak |
| 15 | Add users via backend or console | security, keycloak |

**Cross-Cutting issues (9 total):** Exception handling, validation, Swagger/OpenAPI, logging, Kafka base config, MongoDB base repo, common entity annotations, correlation IDs, GitHub Actions CI/CD.

---

## 14. Known Issues & Improvement Suggestions

| # | Location | Issue | Recommendation |
|---|---|---|---|
| 1 | `bootstrap.yml` | Missing `kv-version: 2` | Add `kv: kv-version: 2` — without it, Vault KV v2 secrets will not be read correctly |
| 2 | `bootstrap.yml` | `role-id` and `secret-id` hardcoded in source | Inject via `VAULT_ROLE_ID` + `VAULT_SECRET_ID` env vars; never commit credentials |
| 3 | `bootstrap.yml` | `secret-id` will expire (Vault default TTL) | Use CI-injected dynamic secret IDs per deployment |
| 4 | `KeyCloakController.java` | `GET /api/auth/authenticate?username=&password=` — credentials in query params | Change to `POST` with credentials in JSON request body |
| 5 | `KeyCloakServiceImpl.authenticateUser()` | Uses deprecated `grant_type=password` (ROPC) | Migrate to Authorization Code + PKCE for browser clients; keep `client_credentials` for service-to-service |
| 6 | `pom.xml` | `httpclient 4.5.13` declared but code imports `org.apache.hc.client5` (HttpClient 5) | Replace dependency with `org.apache.httpcomponents.client5:httpclient5` (match code imports) |
| 7 | `pom.xml` | SCM block points to `arya-banking-common` repo | Fix to `arya-banking-auth-service` repo URLs |
| 8 | `KeyCloakManager.java` | `@Bean UsersResource` inside `@Component` | Move `UsersResource` `@Bean` to a dedicated `@Configuration` class for clarity |
| 9 | `KeyCloakServiceImpl.findUserByUserId()` | Returns `List.of()` — not implemented | Implement or remove from the interface until needed |
| 10 | `KeyCloakServiceImpl.authenticateUser()` | `response.getStatusCode().value() == 401` check uses raw int comparison with no null guard on response body | Add null check on `response.getBody()` before accessing `.get("error_description")` |
| 11 | `AryaBankingAuthServiceApplicationTests.java` | `@Test` annotation missing — context test never runs | Re-enable with mocked Vault + Keycloak for CI safety |
| 12 | `docker-compose.yaml` | `version: '1.0'` is invalid | Change to `version: '3.8'` or remove the version key entirely (Compose V2 ignores it) |
| 13 | `.github/issues.json` | Nested array structure is malformed JSON | Fix to a flat array of service objects so the `auto-create-issues` workflow can parse it correctly |
| 14 | `KeyCloakServiceImpl.updateLoginFailedAttempts()` | `username.toUpperCase()` — assumes userId is always uppercase | Document this contract clearly; verify that `SecurityDetails.userId` is always stored uppercase |

---

## 15. Quick Reference

### Common Commands

| Task | Command |
|---|---|
| Run locally | `mvn spring-boot:run` |
| Build JAR | `mvn -DskipTests package` |
| Run tests | `mvn clean verify` |
| SpotBugs check | `mvn spotbugs:check` |
| JaCoCo report | `mvn verify` → `target/site/jacoco/index.html` |

### API Endpoints

```
GET  /api/auth/authenticate?username=&password=   → Returns JWT access token [PUBLIC]
POST /internal/api/auth/register/users            → Create Keycloak user [ROLE_INTERNAL_SERVICE]
GET  /actuator/health                             → Health check
```

### Vault Secrets Required

| Secret Key | Purpose |
|---|---|
| `AUTH.SERVICE.CLIENT.SECRET` | OAuth2 `client_credentials` secret for `auth-service-client` (Feign token) |
| `ARYA.BANKING.AUTH.CLIENT.SECRET` | Keycloak Admin SDK secret for `arya-banking-auth-client` (user management) |

### Environment Variables / CI Secrets

| Variable | Purpose |
|---|---|
| `GH_PAT` | GitHub Packages access to `arya-banking-common` |
| `SONAR_TOKEN` | SonarCloud analysis |
| `SONAR_PROJECT_KEY` | SonarCloud project identifier |
| `SONAR_ORG` | SonarCloud organisation |
| `ORG_ISSUE_TOKEN` | GitHub issue creation across org |

### Keycloak Clients Required in Realm `event-based-banking-application`

| Client ID | Grant Type | Used By | Purpose |
|---|---|---|---|
| `arya-banking-auth-client` | `client_credentials` | `KeyCloakManager` / Admin SDK | Manage Keycloak users (create, search, update) |
| `auth-service-client` | `client_credentials` | `OAuth2FeignConfig` | Service-to-service token for Feign calls to user-service |
| `banking-service-client` | `authorization_code` | API Gateway | Browser-based login flow |
| `user-service-client` | `client_credentials` | user-service `OAuth2FeignConfig` | Service-to-service token for Feign calls to auth-service |
