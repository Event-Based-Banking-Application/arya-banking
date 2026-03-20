---
title: "Data Models & Common Library"
description: "Domain models, DTOs, MapStruct mappers, exceptions, and utilities from arya-banking-common used by the admin-service."
icon: "schema"
weight: 900
toc: true
date: "2025-03-20T00:00:00Z"
lastmod: "2025-03-20T00:00:00Z"
tags: ["models", "common", "mongodb", "mapstruct", "exceptions"]
---

## Common Library

**Artifact:** `org.arya.banking:arya-banking-common:1.1.9`  
**Hosted on:** GitHub Packages (`Event-Based-Banking-Application`)  
**Package base:** `org.arya.banking.common`

The admin-service depends on `arya-banking-common` for shared MongoDB domain models, exception hierarchy, utility classes, Avro schemas, Kafka topic constants, and the `BaseMapper` interface. The main class scans `org.arya.banking.common` explicitly, so all common `@Component` beans (exception handlers, mappers) are loaded automatically.

---

## Domain Models (MongoDB Documents)

{{< table "table-striped table-sm" >}}
| Model | Collection | Key Fields |
|---|---|---|
| `User` | `user` | `userId` (unique index), `firstName`, `lastName`, `emailId`, `contactNumbers`, `addresses`, `primaryAddress`, `status`, `roleId` |
| `RegistrationProgress` | `registration_progress` | `userId`, `status`, `subStatus`, `lastStepCompleted`, `nextStep` |
| `SecurityDetails` | `security_details` | `userId`, `securityQuestions`, `twoFactorEnabled`, `isEmailVerified`, `isContactNumberVerified`, `loginFailedAttempts` |
| `UserCredentials` | `user_credentials` | `userId`, `passwordHash` |
| `Role` | `role` | `roleName`, `description`, `permissions: List<Permission>` |
| `Audit` | `audit` | `actionType`, `targetTable`, `targetId`, `userId`, `changeType`, `description`, `auditTime` |
{{< /table >}}

All document classes extend `AryaBase`, which provides `deleted`, `createdAt`, and `updatedAt` fields populated automatically via `@EnableMongoAuditing`.

### Embedded Models

{{< table "table-striped table-sm" >}}
| Model | Fields |
|---|---|
| `Address` | `street`, `city`, `state`, `zipCode`, `country`, `addressType` |
| `ContactNumber` | `contactNumber`, `type`, `isVerified` |
| `Permission` | `module`, `actions: List<String>` |
| `SecurityQuestions` | `question`, `answer` |
| `KeyCloakUser` | Builder DTO for Keycloak user creation |
{{< /table >}}

---

## Enums

{{< table "table-striped table-sm" >}}
| Enum | Values |
|---|---|
| `UserStatus` | `ACTIVE`, `BLOCKED`, `DORMANT` |
| `AddressType` | `PERMANENT`, `RESIDENTIAL` |
| `ContactNumberType` | `PRIMARY`, `SECONDARY`, `OTHERS` |
| `Modules` | `USERS`, `ACCOUNTS`, `TRANSACTIONS`, `LOANS` |
| `RegistrationConstants` | `BASIC_DETAILS_ADDED`, `SECURITY_CREDENTIALS_ADDED`, `ADD_ADDRESS` |
{{< /table >}}

`RegistrationConstants` carries state metadata: `status`, `subStatus`, `nextStep`, and `lastStepCompleted` — used to track where a user is in the three-step registration flow.

---

## Exception Hierarchy

All exceptions extend `GlobalException`, which carries an HTTP error code, an application error code, and a message. The `GlobalExceptionHandler` (`@RestControllerAdvice`) catches all `GlobalException` subclasses and returns a standardised `ErrorResponse(errorCode, errorMessage)`.

```text {linenos=table, anchorlinenos=true}
RuntimeException
└── GlobalException (httpErrorCode, errorCode, errorMessage)
    ├── UserAlreadyExistsException           (409)
    ├── UserNotFoundException                (404)
    ├── SecurityDetailsNotFoundException     (varies)
    ├── InvalidOAuth2Client                  (varies)
    ├── KeyCloakClientAlreadyExists          (409)
    ├── KeyCloakRealmRoleAlreadyExists       (409)
    ├── KeyCloakRealmRoleNotFoundException   (404)
    ├── KeyCloakServiceException             (varies)
    ├── UnAuthorizedException                (403)
    ├── RoleIdNotFoundException              (403)
    ├── SecretIdNotFoundException            (403)
    ├── AppRoleCreationException             (403)
    └── VaultSecretNotFoundException         (404)
```

---

## Response Codes

Standardised response code constants used as values in `VaultResponseDto.responseCode` and `KeyCloakResponse.responseCode`:

{{< table "table-striped table-sm" >}}
| Constant | HTTP Meaning |
|---|---|
| `USER_CREATED_201` | User resource created |
| `USER_UPDATED_200` | User resource updated |
| `SECURITY_DETAILS_UPDATED_200` | Security details updated |
| `KEYCLOAK_ROLE_CREATED_200` | Keycloak realm role created |
| `VAULT_SECRET_CREATED_200` | Vault KV secret written |
| `VAULT_SECRET_DELETED_200` | Vault KV secret deleted |
| `VAULT_SECRET_UPDATED_200` | Vault KV secret patched |
{{< /table >}}

---

## BaseMapper Interface

All MapStruct mappers in both the admin-service and the common library extend this contract:

```java {linenos=table, anchorlinenos=true}
public interface BaseMapper<E, D> {
    D toDto(E entity);
    E toEntity(D dto);
    List<D> toDtoList(List<E> entityList);
    List<E> toEntityList(List<D> dtoList);
}
```

The admin-service provides two implementations:

{{< table "table-striped table-sm" >}}
| Mapper | Entity | DTO |
|---|---|---|
| `KeycloakRoleMapper` | `RoleRepresentation` (Keycloak) | `KeycloakRole` (record) |
| `VaultResponseMapper` | `VaultResponse` (Spring Vault) | `VaultApiResponseDto` (record) |
{{< /table >}}

---

## Utilities

### CommonUtils

{{< table "table-striped table-sm" >}}
| Method | Description |
|---|---|
| `isEmpty(Object)` | Null/blank/empty check for `String`, `List`, `BigDecimal`, `Map` |
| `isNotEmpty(Object)` | Inverse of `isEmpty` |
| `generateSHA256hash(String)` | SHA-256 hex digest via Apache Commons |
| `loadConfig(String path)` | Loads a classpath resource as a UTF-8 string via `SpringContextHolder` |
| `convertListIntoMap(List, keyExtractor)` | Converts a list into a `Map<K, V>` |
{{< /table >}}

`loadConfig` is used by `VaultPolicyServiceImpl` to read `.hcl` policy files from the classpath.

### MetaDataUtils

Handles automatic schema versioning for MongoDB documents annotated with `@TrackMetadata`. It compares old vs new `ColumnMetadata` lists and increments version numbers:

- **MAJOR** bump — column removed
- **MINOR** bump — column added
- **PATCH** bump — nullability changed

---

## Avro Schemas

Two Avro schemas are defined in `arya-banking-common` for future Kafka event publishing:

{{< table "table-striped table-sm" >}}
| Schema | Namespace | Fields |
|---|---|---|
| `AuditEvent.avsc` | `org.arya.banking.common.avro` | `actionType`, `targetTable`, `targetId`, `userId`, `changeType`, `details` |
| `UserCreateEvent.avsc` | `org.arya.banking.common.avro` | `userId`, `status`, `isEmailVerified`, `isContactVerified` |
{{< /table >}}

### Kafka Topic Constants

{{< table "table-striped table-sm" >}}
| Constant | Topic Name |
|---|---|
| `USER_CREATE_EVENT` | `user.create.event` |
| `AUDIT_EVENT` | `audit.event` |
{{< /table >}}

{{< alert context="info" text="Kafka infrastructure (spring-kafka, kafka-streams, Avro) is declared as a dependency but no producers or consumers are implemented in the admin-service yet." />}}
