# Arya Banking Common
## Codebase Knowledge Document

| Field | Value |
|---|---|
| Repository | `arya-banking-common` |
| Artifact ID | `arya-banking-common` |
| Group ID | `org.arya.banking` |
| Version | `1.1.9` |
| Java | 17 (Eclipse Temurin) |
| Spring Boot | `3.5.3` |
| Spring Cloud | `2025.0.0` |
| License | Apache 2.0 |
| Published To | GitHub Packages (`maven.pkg.github.com`) |
| Developer | Karthik Kulkarni |

---

## 1. Overview

`arya-banking-common` is the **foundational shared library** for the entire Arya Banking microservices ecosystem. It is NOT a runnable microservice — it is a **Maven library** that every other service (`user-service`, `auth-service`, `admin-service`, `api-gateway`) depends on via GitHub Packages.

It provides six capabilities shared across all services:

| Capability | What It Gives Services |
|---|---|
| **Domain Models** | `User`, `Role`, `SecurityDetails`, `Audit`, `Address`, `RegistrationProgress`, `UserCredentials`, and supporting value objects |
| **MongoDB Integration** | Custom `LocalDateTime` converters, transaction manager, auditing via `AryaBase` |
| **Kafka / Avro** | Pre-built `KafkaTemplate`, consumer factory factory, Avro serialiser/deserialiser wiring, topic name constants |
| **Metadata Versioning** | `@TrackMetadata` annotation + `MetadataInitializer` — auto-tracks schema changes in MongoDB with semantic versioning |
| **Exception Framework** | `GlobalException` hierarchy, `GlobalExceptionHandler` (`@RestControllerAdvice`), `FeignClientErrorDecoder` |
| **Utilities** | `CommonUtils`, `MetaDataUtils`, `SpringContextHolder`, `BaseMapper` interface |

> **Key rule for microservice developers:** Always import types from this library — never re-define `User`, `Role`, `GlobalException`, or Kafka constants in individual services.

---

## 2. Repository Structure

```
arya-banking-common/
├── src/
│   ├── main/
│   │   ├── avro/
│   │   │   ├── AuditEvent.avsc             ← Avro schema for audit Kafka events
│   │   │   └── UserCreateEvent.avsc        ← Avro schema for user creation Kafka events
│   │   ├── java/org/arya/banking/common/
│   │   │   ├── AryaBankingCommonApplication.java   ← Entry point (metadata-loader only)
│   │   │   ├── config/
│   │   │   │   ├── FeignConfiguration.java         ← Feign error decoder wiring
│   │   │   │   ├── KafkaConfiguration.java         ← Producer/consumer factory beans
│   │   │   │   ├── MongoConfig.java                ← Custom converters + transaction mgr
│   │   │   │   ├── OAuth2ClientConfig.java         ← Client credentials OAuth2 manager
│   │   │   │   └── SpringContextHolder.java        ← Static ApplicationContext accessor
│   │   │   ├── constants/
│   │   │   │   ├── RegistrationConstants.java      ← Registration flow state machine enum
│   │   │   │   ├── ResponseCodes.java              ← API response code string constants
│   │   │   │   ├── ResponseKeys.java               ← API response key string constants
│   │   │   │   └── kafka/
│   │   │   │       └── KafkaConstants.java         ← Topic names, serialiser class names
│   │   │   ├── dto/
│   │   │   │   ├── KeyCloakResponse.java           ← Keycloak operation result record
│   │   │   │   └── UserResponse.java               ← Generic user operation result record
│   │   │   ├── exception/
│   │   │   │   ├── GlobalException.java            ← Base runtime exception (httpCode + errorCode + message)
│   │   │   │   ├── GlobalExceptionHandler.java     ← @RestControllerAdvice handler
│   │   │   │   ├── ExceptionCode.java              ← All exception code string constants
│   │   │   │   ├── ExceptionConstants.java         ← HTTP status code int constants
│   │   │   │   ├── ErrorResponse.java              ← Error response record
│   │   │   │   ├── FeignClientErrorDecoder.java    ← Deserialises cross-service errors
│   │   │   │   ├── InternalServerExceptionHandler.java
│   │   │   │   └── [12 typed exception classes]    ← One per domain error scenario
│   │   │   ├── loader/
│   │   │   │   ├── MetadataInitializer.java        ← Classpath scanner + MongoDB writer
│   │   │   │   └── MetadataInitializerRunner.java  ← CLI runner (metadata-loader profile only)
│   │   │   ├── mapper/
│   │   │   │   ├── BaseMapper.java                 ← Generic entity↔DTO mapper interface
│   │   │   │   ├── DateToLocalDateTimeMapper.java  ← MongoDB Date → LocalDateTime converter
│   │   │   │   └── LocalDateTimeToDateMapper.java  ← LocalDateTime → MongoDB Date converter
│   │   │   ├── metadata/
│   │   │   │   ├── ColumnMetadata.java             ← Per-field schema snapshot
│   │   │   │   ├── TableMetadata.java              ← Per-model schema snapshot (@Document)
│   │   │   │   └── annotation/
│   │   │   │       └── TrackMetadata.java          ← Custom annotation for tracked models
│   │   │   ├── model/                              ← All domain entities (detailed in §5)
│   │   │   ├── repository/
│   │   │   │   └── TableMetadataRepository.java    ← MongoRepository for TableMetadata
│   │   │   └── utils/
│   │   │       ├── CommonUtils.java                ← isEmpty, SHA-256 hash, classpath loader
│   │   │       └── MetaDataUtils.java              ← Schema hash + semantic version calculator
│   │   └── resources/
│   │       └── application.yaml
│   └── test/
│       └── AryaBankingCommonApplicationTests.java  ← Context load test (currently disabled)
├── .github/workflows/
│   ├── deploy.yml                                  ← Builds + publishes to GitHub Packages on master push
│   └── sonar-report.yaml                          ← SonarCloud analysis on all branches
├── docker-compose.yaml                             ← Local Kafka (KRaft) + Schema Registry
├── pom.xml
├── settings.xml                                    ← GitHub Packages auth (uses env vars)
└── README.md
```

---

## 3. Maven Build (pom.xml)

### 3.1 Coordinates & Distribution

| POM Field | Value |
|---|---|
| `groupId` | `org.arya.banking` |
| `artifactId` | `arya-banking-common` |
| `version` | `1.1.9` |
| Parent | `spring-boot-starter-parent : 3.5.3` |
| Spring Cloud BOM | `spring-cloud-dependencies : 2025.0.0` |
| Deploy target | `https://maven.pkg.github.com/Event-Based-Banking-Application/arya-banking-common` |

### 3.2 Full Dependency Table

| Dependency | Version / Source | Scope | Purpose |
|---|---|---|---|
| `spring-boot-starter-actuator` | via parent | compile | Health endpoints for any service importing this lib |
| `spring-boot-starter-data-mongodb` | via parent | compile | Spring Data MongoDB — `MongoRepository`, `@Document`, auditing |
| `spring-boot-starter-validation` | via parent | compile | Jakarta Bean Validation (`@NotNull`, `@Pattern`, `@Size`) on models |
| `spring-boot-starter-web` | via parent | compile | Spring MVC — needed for `@RestControllerAdvice` |
| `spring-cloud-starter-openfeign` | via BOM | compile | Feign HTTP clients for inter-service calls _(declared twice — duplicate)_ |
| `spring-boot-starter-oauth2-client` | via parent | compile | `OAuth2AuthorizedClientManager` for client credentials flows |
| `spring-boot-starter-oauth2-resource-server` | via parent | compile | JWT validation for resource server role |
| `lombok` | `1.18.36` (provided) | provided | Boilerplate reduction — `@Data`, `@Builder`, `@Slf4j` _(declared twice — duplicate)_ |
| `mapstruct` | `1.5.5.Final` | compile | Type-safe mapper generation (used via `BaseMapper` interface) |
| `spring-kafka` | via parent | compile | Spring Kafka template and listener container |
| `kafka-streams` | via parent | compile | Kafka Streams API (future use) |
| `kafka-clients` | `3.6.1` | compile | Low-level Kafka producer/consumer client |
| `kafka-avro-serializer` | `7.8.0` (Confluent) | compile | Avro serialiser/deserialiser for Confluent Schema Registry |
| `avro` | `1.11.4` | compile | Apache Avro runtime |
| `sonar-maven-plugin` | `3.10.0.2594` | compile | SonarCloud scanner (unusual as a compile dep — see §9) |
| `spring-boot-devtools` | via parent | runtime/optional | Hot reload in local dev |
| `spring-boot-starter-test` | via parent | test | JUnit 5 + Mockito + Spring Test |
| `spring-kafka-test` | via parent | test | Embedded Kafka for integration tests |

> **Extra repository:** `https://packages.confluent.io/maven/` is added for Confluent Avro artifacts not available on Maven Central.

### 3.3 Build Plugins

| Plugin | Version | Purpose |
|---|---|---|
| `maven-deploy-plugin` | `3.1.1` | Deploys the JAR to GitHub Packages on `mvn deploy` |
| `maven-compiler-plugin` | from parent | Wires Lombok + MapStruct annotation processors at compile time |
| `exec-maven-plugin` | `3.1.0` | Runs `AryaBankingCommonApplication` with `metadata-loader` profile during `mvn install` |
| `jacoco-maven-plugin` | `0.8.13` | Code coverage — report at `target/site/jacoco/jacoco.xml`, consumed by SonarCloud |
| `avro-maven-plugin` | `1.11.3` | Generates Java classes from `.avsc` files during `generate-sources` phase |

### 3.4 Maven Profile

| Profile | Active By Default | Effect |
|---|---|---|
| `metadata-loader` | No | Sets `spring.profiles.active=metadata-loader` so the `exec-maven-plugin` boots the app in loader mode during `mvn install -Pmetadata-loader` |

---

## 4. Configuration (application.yaml)

```yaml
spring:
  application:
    name: arya-banking-common
  data:
    mongodb:
      uri: mongodb+srv://admin:ka3k912719@bankingcluster.ayhvgpk.mongodb.net/metadata?...
  kafka:
    bootstrap-servers: localhost:9092
    properties:
      schema.registry.url: http://localhost:8081
app:
  metadata:
    versioning:
      enabled: true
```

> ⚠️ **CRITICAL SECURITY ISSUE:** The MongoDB URI contains a hardcoded plaintext password (`ka3k912719`). This connects to the `metadata` database used exclusively by the metadata loader. This credential **must be rotated and injected via Vault or an environment variable** before any public/production deployment. The URI should be `${MONGO_URI}` or injected via the config server.

| Property | Purpose |
|---|---|
| `spring.data.mongodb.uri` | Points at the Atlas `metadata` collection used by `MetadataInitializer` |
| `spring.kafka.bootstrap-servers` | Default Kafka broker — overridden by each consuming service via config server |
| `spring.kafka.properties.schema.registry.url` | Confluent Schema Registry — overridden per environment |
| `app.metadata.versioning.enabled` | Custom flag — intended for conditional metadata tracking (not yet wired to a `@ConditionalOnProperty`) |

---

## 5. Domain Models

### 5.1 Model Hierarchy

```
AryaBase (abstract)              ← Common audit fields for all root documents
├── User                         @Document("user")
├── Role                         @Document("role")
├── SecurityDetails              @Document("security_details")
├── RegistrationProgress         @Document("registration_progress")
└── UserCredentials              @Document("user_credentials")

Standalone (no AryaBase):
├── Audit                        @Document("audit")
├── Address                      (embedded in User)
├── ContactNumber                (embedded in User)
├── Permission                   (embedded in Role)
├── SecurityQuestions            (embedded in SecurityDetails)
└── KeyCloakUser                 (used as Feign request body — not a MongoDB document)
```

### 5.2 AryaBase

```java
@Data
@TrackMetadata(name = "AryaBase", description = "Acts as base model for all existing models")
public abstract class AryaBase {
    @Field("deleted")    private Boolean deleted = false;
    @CreatedDate         private LocalDateTime createdAt;
    @LastModifiedDate    private LocalDateTime updatedAt;
}
```

Every MongoDB root document extends `AryaBase`. This gives all documents:
- **Soft-delete** support via `deleted = false` default
- **`@CreatedDate` / `@LastModifiedDate`** auto-population (requires `@EnableMongoAuditing` on the consuming service — not in this library)

### 5.3 User

**Collection:** `user`  **Extends:** `AryaBase`  **Tracked:** ✅

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | String | `@Id` | MongoDB ObjectId |
| `userId` | String | `@NotNull`, `@Indexed(unique=true)` | Application-level UUID — separate from MongoDB `_id` |
| `firstName` | String | `@NotNull`, `@Pattern(^[A-Za-z]+$)` | Letters only |
| `lastName` | String | `@NotNull`, `@Pattern(^[A-Za-z]+$)` | Letters only |
| `emailId` | String | `@NotNull`, `@Pattern(email regex)` | Basic email format |
| `contactNumbers` | `List<ContactNumber>` | `@NotNull` | All contact numbers |
| `primaryContactNumber` | String | `@NotNull` | Denormalised primary number string |
| `addresss` | `List<Address>` | `@NotNull` | Note: field name has a typo (`addresss`) |
| `primaryAddress` | Address | `@NotNull` | Denormalised primary address |
| `status` | String | `@NotNull` | Use `UserStatus` enum values: `ACTIVE`, `BLOCKED`, `DORMANT` |
| `roleId` | String | `@NotNull` | FK reference to `Role._id` |

> ⚠️ **Typo:** The field `addresss` (three s's) should be `addresses`. This is a breaking rename in MongoDB if corrected — update carefully.

### 5.4 Role

**Collection:** `role`  **Extends:** `AryaBase`  **Tracked:** ✅

| Field | Type | Notes |
|---|---|---|
| `id` | String | `@Id` |
| `roleName` | String | Role identifier name |
| `description` | String | Human-readable role description |
| `permissions` | `List<Permission>` | List of module+actions pairs |

`Permission` is an embedded object (no `@Document`):
```java
public class Permission {
    private String module;        // use Modules enum: USERS, ACCOUNTS, TRANSACTIONS, LOANS
    private List<String> actions; // e.g. ["READ", "WRITE", "DELETE"]
}
```

### 5.5 SecurityDetails

**Collection:** `security_details`  **Extends:** `AryaBase`  **Tracked:** ✅

| Field | Type | Notes |
|---|---|---|
| `userId` | String | References `User.userId` |
| `securityQuestions` | `List<SecurityQuestions>` | Q&A pairs for identity verification |
| `twoFactorEnabled` | Boolean | 2FA toggle |
| `isEmailVerified` | Boolean | Email verification state |
| `isContactNumberVerified` | Boolean | Contact verification state |
| `loginFailedAttempts` | Integer | Failed login counter — drives `ACCOUNT_LOCKED_403` logic |

### 5.6 RegistrationProgress

**Collection:** `registration_progress`  **Extends:** `AryaBase`  **Tracked:** ✅

Tracks where a user is in the 3-step registration flow. Drive using `RegistrationConstants` enum.

| Field | Type | Example Value |
|---|---|---|
| `userId` | String | The user being registered |
| `status` | String | `REGISTRATION_IN_PROGRESS` / `REGISTRATION_COMPLETE` |
| `subStatus` | String | `BASIC_DETAILS_ADDITION_COMPLETED` |
| `lastStepCompleted` | String | `BASIC_DETAILS_ADDED` |
| `nextStep` | String | `ADD_SECURITY_DETAILS` |

### 5.7 Audit

**Collection:** `audit`  **No AryaBase**  **Tracked:** ✅

| Field | Type | Nullable | Notes |
|---|---|---|---|
| `actionType` | String | No | Type of action performed |
| `targetTable` | String | **Yes** (`@Nullable`) | The MongoDB collection affected |
| `targetId` | String | No | ID of the affected document |
| `userId` | String | No | Who performed the action |
| `changeType` | String | No | Nature of the change |
| `description` | String | No | Human-readable description |
| `auditTime` | LocalDateTime | No | `@CreatedDate` auto-set |

### 5.8 Enums

| Enum | Values | Used In |
|---|---|---|
| `UserStatus` | `ACTIVE`, `BLOCKED`, `DORMANT` | `User.status` field |
| `AddressType` | `PERMANENT`, `RESIDENTIAL` | `Address.addressType` |
| `ContactNumberType` | `PRIMARY`, `SECONDARY`, `OTHERS` | `ContactNumber.type` |
| `Modules` | `USERS`, `ACCOUNTS`, `TRANSACTIONS`, `LOANS` | `Permission.module` |

---

## 6. Avro Schemas

Both schemas live in `src/main/avro/` and are auto-compiled to Java classes during `mvn generate-sources` (output: `target/generated-sources/avro`). Namespace: `org.arya.banking.common.avro`.

### AuditEvent.avsc

```json
{
  "name": "AuditEvent",
  "fields": [
    "actionType", "targetTable", "targetId",
    "userId", "changeType", "details"
  ]
}
```

Sent on topic: `audit.event` (constant: `KafkaConstants.AUDIT_EVENT`)

### UserCreateEvent.avsc

```json
{
  "name": "UserCreateEvent",
  "fields": [
    "userId",
    "status",
    "isEmailVerified"  (default: false),
    "isContactVerified" (default: false)
  ]
}
```

Sent on topic: `user.create.event` (constant: `KafkaConstants.USER_CREATE_EVENT`)

> **Usage pattern in microservices:** Import the generated class from this library and use the shared `KafkaTemplate<String, Object>` bean from `KafkaConfiguration` to produce. Create a `ConcurrentKafkaListenerContainerFactory` via `kafkaListerFactory(groupId)` for consuming.

---

## 7. Configuration Classes

### 7.1 KafkaConfiguration

```java
@Configuration
@ConditionalOnProperty(name = "spring.kafka.bootstrap-servers")
public class KafkaConfiguration { ... }
```

**Only activates if `spring.kafka.bootstrap-servers` is set** — safe to include in services that don't use Kafka.

| Bean / Method | Type | Usage |
|---|---|---|
| `producerFactory()` | `ProducerFactory<String, Object>` | `@Bean` — auto-wired by `KafkaTemplate` |
| `kafkaTemplate()` | `KafkaTemplate<String, Object>` | `@Bean` — inject and call `.send(topic, key, value)` |
| `consumerFactory(groupId)` | `ConsumerFactory<K, V>` | **Not a `@Bean`** — call directly in service config to create per-group factories |
| `kafkaListerFactory(groupId)` | `ConcurrentKafkaListenerContainerFactory<K, V>` | **Not a `@Bean`** — call directly and register the result as a named `@Bean` in each service |

> **Design pattern for consumers:** In each microservice, extend or call `kafkaListerFactory(groupId)` and register the result as a `@Bean` with a name matching the `containerFactory` attribute of your `@KafkaListener`. Example:
> ```java
> @Bean
> public ConcurrentKafkaListenerContainerFactory<String, UserCreateEvent> userEventFactory() {
>     return kafkaConfiguration.kafkaListerFactory("user-service-group");
> }
> ```

**Serialisation config:**
- Producer: `StringSerializer` key + `KafkaAvroSerializer` value
- Consumer: `StringDeserializer` key + `KafkaAvroDeserializer` value + `specific.avro.reader=true` + `auto.offset.reset=earliest`

### 7.2 MongoConfig

```java
@Configuration
@EnableTransactionManagement
public class MongoConfig {
    @Bean MongoCustomConversions mongoCustomConversions() { ... }
    @Bean MongoTransactionManager transactionManager(...) { ... }
}
```

Registers two custom Spring Data converters so `LocalDateTime` fields survive MongoDB round-trips correctly:

| Converter | Direction | Why Needed |
|---|---|---|
| `LocalDateTimeToDateMapper` | `LocalDateTime` → `Date` | MongoDB stores dates as BSON `Date` (java.util.Date) |
| `DateToLocalDateTimeMapper` | `Date` → `LocalDateTime` | Converts back on read using system timezone |

Also registers `MongoTransactionManager` enabling `@Transactional` on MongoDB Atlas replica sets.

### 7.3 FeignConfiguration

```java
@Configuration
public class FeignConfiguration extends FeignClientProperties.FeignClientConfiguration {
    @Bean ErrorDecoder errorDecoder() { return new FeignClientErrorDecoder(); }
}
```

Replaces Feign's default error decoder with `FeignClientErrorDecoder`, which deserialises error responses from other Arya Banking services into `GlobalException` objects. This preserves `errorCode` and `httpErrorCode` across service boundaries.

**How to apply in a consuming service:**
```java
@FeignClient(name = "auth-service", configuration = FeignConfiguration.class)
public interface AuthServiceClient { ... }
```

### 7.4 OAuth2ClientConfig

```java
@Configuration
@ConditionalOnBean(ClientRegistrationRepository.class)
public class OAuth2ClientConfig {
    @Bean OAuth2AuthorizedClientManager authorizedClientManager(...) { ... }
}
```

Only activates when a `ClientRegistrationRepository` bean exists (i.e., when the consuming service has `spring.security.oauth2.client.registration.*` configured). Provides a `client_credentials` grant manager for service-to-service OAuth2 flows (e.g., calling Keycloak token endpoint programmatically).

### 7.5 SpringContextHolder

```java
@Component
public class SpringContextHolder implements ApplicationContextAware {
    private static ApplicationContext applicationContext;
    public static Resource getResource(String path) { ... }
}
```

Exposes the Spring `ApplicationContext` statically for use in non-Spring-managed utility classes. Used by `CommonUtils.loadConfig(path)` to read classpath resources without injecting beans.

---

## 8. Exception Framework

### 8.1 Class Hierarchy

```
RuntimeException
└── GlobalException  (httpErrorCode + errorCode + errorMessage)
    ├── UserNotFoundException
    ├── UserAlreadyExistsException
    ├── SecurityDetailsNotFoundException
    ├── KeyCloakServiceException
    ├── KeyCloakClientAlreadyExists
    ├── KeyCloakRealmRoleAlreadyExists       ← uses ExceptionCode + ExceptionConstants
    ├── KeyCloakRealmRoleNotFoundException   ← uses ExceptionCode + ExceptionConstants
    ├── UnAuthorizedException                ← uses ExceptionCode + ExceptionConstants
    ├── InvalidOAuth2Client
    ├── AppRoleCreationException             ← uses ExceptionCode + ExceptionConstants
    ├── RoleIdNotFoundException              ← uses ExceptionCode + ExceptionConstants
    ├── SecretIdNotFoundException            ← uses ExceptionCode + ExceptionConstants
    └── VaultSecretNotFoundException         ← uses ExceptionCode + ExceptionConstants

RuntimeException
└── InternalServerExceptionHandler  (status + error + message — for raw Spring error responses)
```

### 8.2 GlobalException

```java
@Data @NoArgsConstructor @AllArgsConstructor
public class GlobalException extends RuntimeException {
    private int httpErrorCode;   // HTTP status code (400, 403, 404, 409, 500)
    private String errorCode;    // Domain code from ExceptionCode interface
    private String errorMessage; // Human-readable message
}
```

Two constructor patterns exist:
1. `new GlobalException(httpCode, errorCode, message)` — used by exceptions needing explicit HTTP code
2. `super(ExceptionConstants.NOT_FOUND_ERROR_CODE, ExceptionCode.USER_NOT_FOUND_404, message)` — preferred pattern using the constants interfaces

### 8.3 Exception Codes Reference

**ExceptionConstants (HTTP codes as ints):**

| Constant | Value |
|---|---|
| `BAD_REQUEST_ERROR_CODE` | 400 |
| `UN_AUTHORIZED_ERROR_CODE` | 401 |
| `FORBIDDEN_ERROR_CODE` | 403 |
| `NOT_FOUND_ERROR_CODE` | 404 |
| `CONFLICT_ERROR_CODE` | 409 |

**ExceptionCode (domain error string codes):**

| Constant | Domain |
|---|---|
| `USER_NOT_FOUND_404` | User service |
| `USER_ALREADY_EXISTS_409` | User service |
| `SECURITY_DETAILS_NOT_FOUND_404` | Auth service |
| `SECURITY_INVALID_CREDENTIALS_401` | Auth service |
| `ACCOUNT_LOCKED_403` | Auth service |
| `AUTH_KEYCLOAK_USER_CREATION_FAILED_400` | Auth/Admin |
| `AUTH_KEYCLOAK_INTERNAL_SERVER_ERROR_500` | Auth/Admin |
| `ADMIN_KEYCLOAK_REALM_ROLE_ALREADY_EXISTS_409` | Admin service |
| `ADMIN_KEYCLOAK_REALM_ROLE_NOT_FOUND_404` | Admin service |
| `ADMIN_VAULT_APPROLE_CREATION_EXCEPTION_400` | Admin service |
| `ADMIN_VAULT_ROLE_ID_EXCEPTION_403` | Admin service |
| `ADMIN_VAULT_SECRET_ID_EXCEPTION_403` | Admin service |
| `VAULT_SECRET_NOT_FOUND_EXCEPTION_404` | Admin service |

### 8.4 GlobalExceptionHandler

`@RestControllerAdvice` — active in every service that imports this library. Handles three cases:

| Handler | Input | Response |
|---|---|---|
| `handleMehodArgumentNotValidException` | `MethodArgumentNotValidException` | `400 ErrorResponse` with all field-level validation errors joined |
| `handleGlobalExceptions(GlobalException)` | Any `GlobalException` subclass | `ErrorResponse(errorCode, errorMessage)` with `httpErrorCode` as status |
| `handleGlobalExceptions(InternalServerExceptionHandler)` | Internal server error | `ErrorResponse(status, message)` with status parsed as int |

> **Note:** There is a typo in the method name: `handleMehodArgumentNotValidException` (missing a 't'). This is functional but should be corrected.

### 8.5 FeignClientErrorDecoder

Intercepts non-2xx responses from Feign clients and deserialises the response body into a `GlobalException` using Jackson. This means when `user-service` calls `auth-service` via Feign and `auth-service` throws a `UserNotFoundException`, the exception propagates across the network boundary with its `errorCode` and `httpErrorCode` intact.

---

## 9. Metadata Versioning System

### 9.1 Overview

A custom schema tracking system that automatically detects changes to `@TrackMetadata`-annotated domain models and persists versioned metadata to MongoDB. Triggered manually via the `metadata-loader` Maven profile.

### 9.2 @TrackMetadata Annotation

```java
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.TYPE)
public @interface TrackMetadata {
    String name() default "";
    String description() default "";
}
```

Apply to any model class to opt it into schema tracking. Currently annotated on: `AryaBase`, `User`, `Role`, `SecurityDetails`, `RegistrationProgress`, `UserCredentials`, `Audit`, `Address`, `ContactNumber`.

### 9.3 MetadataInitializer — How It Works

```
1. ClassPathScanningCandidateComponentProvider scans org.arya.banking.common.model
2. For each class annotated with @TrackMetadata:
   a. Reflect over all declared fields
   b. Extract: columnName, dataType, isPrimaryKey (@Id), isNullable (@Nullable), validationRules
   c. Build a schema string and SHA-256 hash it
3. Compare hash with stored TableMetadata in MongoDB:
   - Not found → create new TableMetadata at version "1.0.0"
   - Found, hash different → calculate new semantic version, update record
   - Found, hash same → skip (no change)
4. Save updated TableMetadata to tableMetaData collection
```

### 9.4 Semantic Version Logic (MetaDataUtils.generateVersion)

| Change Type | Version Bump | Detection Rule |
|---|---|---|
| **MAJOR** | `X.0.0` | A column was removed OR a column's data type changed |
| **MINOR** | `x.Y.0` | A new column was added |
| **PATCH** | `x.y.Z` | A column's nullability changed, or hash differs for other reasons |

### 9.5 MongoDB Schema (tableMetaData collection)

**TableMetadata document:**
```
{
  _id:           ObjectId
  modelName:     string (unique index)
  description:   string
  schemaHash:    string (SHA-256 of field signatures)
  isLatest:      boolean
  version:       string (e.g. "1.2.0")
  columnMetadata: [ ColumnMetadata... ]
  createdAt:     ISODate
  updatedAt:     ISODate
}
```

**ColumnMetadata embedded:**
```
{
  columnName:     string
  dataType:       string (Java simple type name)
  isPrimary:      boolean
  isNullable:     boolean
  defaultValue:   any
  validationRules: { "NotNull": "true", "Regex Patter": "^[A-Za-z]+$" }
  createdAt:      ISODate
  updatedAt:      ISODate
}
```

> **Note:** `validationRules` has a typo — key is `"Regex Patter"` (missing 'n'). This affects any tooling that reads these rules by key name.

### 9.6 Running the Metadata Loader

```bash
# One-shot: build + run loader + close context
mvn install -Pmetadata-loader

# Or run directly
mvn spring-boot:run -Dspring-boot.run.profiles=metadata-loader
```

`MetadataInitializerRunner` implements `CommandLineRunner` and is only active on the `metadata-loader` Spring profile. After `initializeMetadata()` completes, it calls `applicationContext.close()` to shut down — it is a batch tool, not a long-running service.

---

## 10. Registration Flow Constants

`RegistrationConstants` enum drives the 3-step user registration state machine:

| Step | Status | SubStatus | NextStep | LastStepCompleted |
|---|---|---|---|---|
| `BASIC_DETAILS_ADDED` | `REGISTRATION_IN_PROGRESS` | `BASIC_DETAILS_ADDITION_COMPLETED` | `ADD_SECURITY_DETAILS` | `BASIC_DETAILS_ADDED` |
| `ADD_ADDRESS` | `REGISTRATION_IN_PROGRESS` | `ADDRESS_ADDED` | `ADD_SECURITY_CREDENTIALS` | `ADDRESS_ADDED` |
| `SECURITY_CREDENTIALS_ADDED` | `REGISTRATION_COMPLETE` | `SECURITY_CREDENTIALS_ADDED` | _(empty)_ | `SECURITY_CREDENTIALS_ADDED` |

> **Flow sequence:** `BASIC_DETAILS_ADDED` → `ADD_ADDRESS` → `SECURITY_CREDENTIALS_ADDED`

Each `RegistrationProgress` document in MongoDB mirrors these values. When a step completes, update the document's `status`, `subStatus`, `nextStep`, and `lastStepCompleted` using the matching enum constant.

---

## 11. Utilities

### CommonUtils

| Method | Signature | Purpose |
|---|---|---|
| `convertListIntoMap` | `<K,V> Map<K,V> convertListIntoMap(List<V>, Function<V,K>)` | Converts a list to a map using a key extractor — used heavily in MetaDataUtils |
| `isEmpty` | `boolean isEmpty(Object)` | Null-safe empty check for String, List, BigDecimal, Map |
| `isNotEmpty` | `boolean isNotEmpty(Object)` | Inverse of `isEmpty` |
| `generateSHA256hash` | `String generateSHA256hash(String)` | Apache Commons Codec SHA-256 hex hash |
| `loadConfig` | `String loadConfig(String path) throws IOException` | Reads a classpath resource to String via `SpringContextHolder` |

### BaseMapper Interface

```java
public interface BaseMapper<E, D> {
    D toDto(E entity);
    E toEntity(D dto);
    List<D> toDtoList(List<E> entityList);
    List<E> toEntityList(List<D> dtoList);
}
```

All MapStruct mappers in microservices should implement this interface for consistency.

---

## 12. CI/CD Workflows

### 12.1 deploy.yml — Build & Publish to GitHub Packages

**Trigger:** Push to `master` branch or manual `workflow_dispatch`

**Steps:**
1. Checkout → Java 17 setup → Maven dependency cache
2. `mvn clean deploy -s settings.xml` — builds, tests, and publishes JAR to GitHub Packages
3. Extracts version from `pom.xml` using `mvn help:evaluate`
4. Tags the commit as `v{version}` and pushes the tag

**Required secret:** `GH_PAT` — GitHub Personal Access Token with `write:packages` scope

**settings.xml** uses `${env.GITHUB_ACTOR}` and `${env.GH_PAT}` for the GitHub Packages auth:
```xml
<server>
  <id>github</id>
  <username>${env.GITHUB_ACTOR}</username>
  <password>${env.GH_PAT}</password>
</server>
```

### 12.2 sonar-report.yaml — SonarCloud Analysis

**Trigger:** Push to any branch, pull requests

**Steps:** Checkout → Java 17 → Maven cache → `mvn clean verify` → `mvn sonar:sonar`

**Required secrets:** `SONAR_TOKEN`, `SONAR_PROJECT_KEY`, `SONAR_ORG`

**SonarCloud coverage exclusions** (from pom.xml):
```
**/config/**, **/dto/**, **/constants/**, **/mapper/**,
**/repository/**, **/model/**, **/metadata/**, **/exception/**,
**/*Application.java
```
These packages are excluded from coverage metrics — only `loader/` and `utils/` are expected to have test coverage reported.

> ⚠️ **Bug in sonar-report.yaml:** The `env` block with `run` at the top level of the workflow is invalid YAML for GitHub Actions — `env` does not support a `run` key at workflow level. The token skip logic should be moved into a step `if` condition. This currently causes a workflow parse warning but may not fail depending on the Actions runner version.

---

## 13. Local Development Stack (docker-compose.yaml)

Provides a KRaft-mode (no Zookeeper) Confluent Kafka + Schema Registry for local development.

### Kafka (KRaft mode)

| Port | Listener | Purpose |
|---|---|---|
| `9092` | `PLAINTEXT_HOST` | **Host machine access** — use `localhost:9092` in `application.yaml` |
| `29092` | `PLAINTEXT` | **Docker internal** — use `kafka:29092` from other containers |
| `29093` | `CONTROLLER` | Raft controller port (KRaft consensus) |

**Key environment variables:**
- `KAFKA_PROCESS_ROLES: broker,controller` — single node acts as both broker and controller
- `CLUSTER_ID: 5hci6rGNQECCvCLOiFDKow` — fixed cluster ID (required for KRaft)
- `KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1` — single node, no replication
- Data persisted to named volume `kafka-data`

### Schema Registry

| Port | Purpose |
|---|---|
| `8081` | REST API for Avro schema registration and lookup |

Connects to Kafka via `PLAINTEXT://kafka:29092` (Docker internal listener). Data persisted to named volume `schema-registry-data`.

**Start command:**
```bash
docker-compose up -d
```

---

## 14. Known Issues & Improvement Suggestions

| # | Location | Issue | Recommendation |
|---|---|---|---|
| 1 | `application.yaml` | **Hardcoded MongoDB password** (`ka3k912719`) committed to source | Rotate immediately. Replace with `${MONGO_URI}` injected via Vault or env var. |
| 2 | `User.java` | Field name typo: `addresss` (3 s's) | Rename to `addresses` with a MongoDB migration script to rename the field in existing documents. |
| 3 | `MetaDataUtils.java` | `validationRules` key typo: `"Regex Patter"` | Fix to `"Regex Pattern"` — breaking change for any reader using the key name. |
| 4 | `GlobalExceptionHandler.java` | Method name typo: `handleMehodArgumentNotValidException` | Rename to `handleMethodArgumentNotValidException`. |
| 5 | `pom.xml` | `spring-cloud-starter-openfeign` declared twice | Remove the duplicate entry. |
| 6 | `pom.xml` | `lombok` declared twice (with explicit version and without) | Keep only the version-managed one (without explicit version). |
| 7 | `pom.xml` | `sonar-maven-plugin` declared as a compile-scope dependency | Should be a build plugin, not a dependency. Move to `<build><plugins>`. |
| 8 | `AryaBankingCommonApplicationTests.java` | `@Test` is commented out — context load test never runs | Re-enable. Use `@SpringBootTest(webEnvironment = NONE)` and mock MongoDB/Kafka for CI safety. |
| 9 | `sonar-report.yaml` | `env.run` block at workflow level is invalid GitHub Actions syntax | Move the token-check logic into a step with an `if` condition. |
| 10 | `MetadataInitializer.java` | Only scans `org.arya.banking.common.model` — hardcoded base package | Make the scan package configurable via `app.metadata.base-package` property. |
| 11 | `MetaDataUtils.getVersionString` | Throws bare `RuntimeException("")` when no change is detected but hashes differ | Replace with a named exception and a meaningful message for debuggability. |

---

## 15. How to Add This Library as a Dependency

### 15.1 pom.xml

```xml
<dependency>
    <groupId>org.arya.banking</groupId>
    <artifactId>arya-banking-common</artifactId>
    <version>1.1.9</version>
</dependency>
```

### 15.2 settings.xml (GitHub Packages auth)

```xml
<settings>
  <servers>
    <server>
      <id>github</id>
      <username>${env.GITHUB_ACTOR}</username>
      <password>${env.GH_PAT}</password>
    </server>
  </servers>
</settings>
```

### 15.3 Repository declaration in pom.xml

```xml
<repositories>
  <repository>
    <id>github</id>
    <url>https://maven.pkg.github.com/Event-Based-Banking-Application/arya-banking-common</url>
  </repository>
</repositories>
```

### 15.4 What consuming services get automatically

| Auto-configured | What activates it |
|---|---|
| `KafkaTemplate<String, Object>` bean | `spring.kafka.bootstrap-servers` property present |
| `MongoCustomConversions` + `MongoTransactionManager` | Always active |
| `GlobalExceptionHandler` (`@RestControllerAdvice`) | Always active — handles all `GlobalException` subclasses |
| `FeignConfiguration` error decoder | Must be referenced in `@FeignClient(configuration = FeignConfiguration.class)` |
| `OAuth2AuthorizedClientManager` | Only if `ClientRegistrationRepository` bean exists |

---

## 16. Quick Reference

### Common Commands

| Task | Command |
|---|---|
| Build and run tests | `mvn clean verify` |
| Generate Avro Java classes | `mvn generate-sources` |
| Run metadata loader | `mvn install -Pmetadata-loader` |
| Deploy to GitHub Packages | `mvn clean deploy -s settings.xml` |
| Run SonarCloud analysis locally | `mvn verify sonar:sonar -Dsonar.token=<token>` |
| Start local Kafka + Schema Registry | `docker-compose up -d` |
| View JaCoCo coverage report | `mvn verify` → open `target/site/jacoco/index.html` |

### Kafka Topic Constants

| Constant | Topic Name |
|---|---|
| `KafkaConstants.USER_CREATE_EVENT` | `user.create.event` |
| `KafkaConstants.AUDIT_EVENT` | `audit.event` |

### MongoDB Collections

| Collection | Java Class |
|---|---|
| `user` | `User` |
| `role` | `Role` |
| `security_details` | `SecurityDetails` |
| `registration_progress` | `RegistrationProgress` |
| `user_credentials` | `UserCredentials` |
| `audit` | `Audit` |
| `tableMetaData` | `TableMetadata` (metadata system) |
