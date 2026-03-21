---
title: "API Reference"
description: "Complete REST API reference for all five admin-service controllers — Keycloak clients, realm roles, Vault AppRoles, KV secrets, and HCL policies."
icon: "api"
weight: 500
toc: true
date: "2025-03-20T00:00:00Z"
lastmod: "2025-03-20T00:00:00Z"
tags: ["api", "rest", "endpoints", "swagger"]
---

## Authentication

All endpoints require a valid Keycloak-issued JWT passed as a Bearer token. Obtain a token from the Keycloak token endpoint before making requests.

```bash {linenos=table, anchorlinenos=true}
# Get a token (client credentials flow)
curl -X POST http://localhost:5433/realms/event-based-banking-application/protocol/openid-connect/token \
  -d "grant_type=client_credentials" \
  -d "client_id=admin-service-client" \
  -d "client_secret=<secret>"
```

{{< alert context="info" text="All admin endpoints additionally require the ROLE_ADMIN realm role to be present in the JWT's realm_access.roles claim. The /internal/** paths require ROLE_INTERNAL_SERVICE instead." />}}

---

## Swagger UI

The interactive API documentation is available at:

```text {linenos=table, anchorlinenos=true}
http://localhost:8089/swagger-ui/index.html
```

The OpenAPI JSON spec is available at:

```text {linenos=table, anchorlinenos=true}
http://localhost:8089/v3/api-docs
```

---

## Keycloak — Client Management

**Controller:** `ClientCreationController`  
**Base Path:** `/api/admin`

{{< table "table-striped table-sm" >}}
| Method | Path | Required Role | Description |
|---|---|---|---|
| `POST` | `/api/admin/inter-service-clients` | `create-client` (`ROLE_ADMIN`) | Creates a new confidential Keycloak client for inter-service OAuth2 |
{{< /table >}}

### POST /api/admin/inter-service-clients

Creates a new Keycloak OAuth2 client configured for the `client_credentials` (service accounts) flow.

**Request:**
```bash {linenos=table, anchorlinenos=true}
curl -X POST http://localhost:8089/api/admin/inter-service-clients?clientName=my-new-service \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json {linenos=table, anchorlinenos=true}
{
  "clientId": "my-new-service",
  "clientSecret": "generated-secret-value"
}
```

**Error cases:**

{{< table "table-striped table-sm" >}}
| HTTP Status | Condition |
|---|---|
| `409 Conflict` | Client with that name already exists |
| `403 Forbidden` | Caller does not have `ROLE_ADMIN` |
{{< /table >}}

**What it does internally:**
1. Checks if a client with the given name already exists — throws `KeyCloakClientAlreadyExists` (409) if so.
2. Builds a `ClientRepresentation` with service accounts enabled, standard flow disabled, access type confidential.
3. Creates the client via Keycloak REST; throws `KeyCloakServiceException` if the response is not 201.
4. Assigns the `INTERNAL_SERVICE` realm role to the newly created client's service account user.
5. Returns the `clientId` and generated `clientSecret`.

---

## Keycloak — Realm Roles

**Controller:** `KeyCloakRolesController`  
**Base Path:** `/api/admin`

{{< table "table-striped table-sm" >}}
| Method | Path | Required Role | Description |
|---|---|---|---|
| `GET` | `/api/admin/realm-roles` | `query-realm` (`ROLE_ADMIN`) | Lists all realm roles |
| `GET` | `/api/admin/realm-role?roleName=` | `query-realm` (`ROLE_ADMIN`) | Fetches a single realm role by name |
| `POST` | `/api/admin/realm-roles` | `query-realm` (`ROLE_ADMIN`) | Creates a new realm role |
{{< /table >}}

### GET /api/admin/realm-roles

```bash {linenos=table, anchorlinenos=true}
curl http://localhost:8089/api/admin/realm-roles \
  -H "Authorization: Bearer <token>"
```

Returns `List<KeycloakRole>`.

### GET /api/admin/realm-role

```bash {linenos=table, anchorlinenos=true}
curl "http://localhost:8089/api/admin/realm-role?roleName=ROLE_ADMIN" \
  -H "Authorization: Bearer <token>"
```

Returns a single `KeycloakRole` or `404` if the role does not exist.

### POST /api/admin/realm-roles

```bash {linenos=table, anchorlinenos=true}
curl -X POST http://localhost:8089/api/admin/realm-roles \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "ROLE_ANALYST", "description": "Read-only analyst role"}'
```

Returns a `KeyCloakResponse` with `responseCode: KEYCLOAK_ROLE_CREATED_200`.

---

## Vault — AppRole Management

**Controller:** `VaultAppRoleController`  
**Base Path:** `/api/admin`  
**Required Role:** `vault-ops` (`ROLE_ADMIN`) for all endpoints.

{{< table "table-striped table-sm" >}}
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/admin/vault-approle` | Lists all AppRole names |
| `GET` | `/api/admin/vault-approle/{role}` | Gets details for a specific AppRole |
| `POST` | `/api/admin/vault-approle` | Creates a new AppRole with policies |
| `DELETE` | `/api/admin/vault-approle?role=` | Deletes an AppRole |
| `GET` | `/api/admin/vault-approle/secrets?appRole=` | Generates fresh roleId + secretId credentials |
{{< /table >}}

### POST /api/admin/vault-approle

```bash {linenos=table, anchorlinenos=true}
curl -X POST http://localhost:8089/api/admin/vault-approle \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "roleName": "user-service",
    "policies": ["user-service-policy"]
  }'
```

Creates the AppRole with `token_ttl=1h` and `token_max_ttl=4h`. Returns an `AppRoleResponseDto` containing the generated `roleId` and `secretId`.

### GET /api/admin/vault-approle/secrets

```bash {linenos=table, anchorlinenos=true}
curl "http://localhost:8089/api/admin/vault-approle/secrets?appRole=user-service" \
  -H "Authorization: Bearer <token>"
```

Generates and returns a fresh `secretId` for an existing AppRole. Use this to rotate credentials after expiry.

---

## Vault — KV Secrets

**Controller:** `VaultOperationsController`  
**Base Path:** `/api/admin`

Secret path pattern: `secret/arya-banking/{service}/dev`

{{< table "table-striped table-sm" >}}
| Method | Path | Required Role | Description |
|---|---|---|---|
| `POST` | `/api/admin/vault-secrets` | `vault-ops` (`ROLE_ADMIN`) | Creates a KV secret |
| `PUT` | `/api/admin/vault-secrets` | `vault-ops` (`ROLE_ADMIN`) | Updates (patches) a KV secret |
| `GET` | `/api/admin/vault-secrets?service=` | `vault-ops` (`ROLE_ADMIN`) | Reads all secrets for a service |
| `DELETE` | `/api/admin/vault-secrets?service=` | ⚠️ **None** | Deletes all secrets for a service path |
{{< /table >}}

{{< alert context="danger" text="The DELETE /api/admin/vault-secrets endpoint is missing @PreAuthorize. Any authenticated user (not just ROLE_ADMIN) can call it. This is a known issue and must be fixed before any production use." />}}

### POST /api/admin/vault-secrets

```bash {linenos=table, anchorlinenos=true}
curl -X POST http://localhost:8089/api/admin/vault-secrets \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "service": "user-service",
    "secretKey": "db.password",
    "secretValue": "s3cr3tP@ss"
  }'
```

Writes the key-value pair to `secret/arya-banking/user-service/dev`.

### PUT /api/admin/vault-secrets

Uses KV v2 PATCH semantics — only the specified key is updated; other keys in the same path are preserved.

---

## Vault — Policy Management

**Controller:** `VaultPolicyController`  
**Base Path:** `/api/admin`  
**Required Role:** `vault-ops` (`ROLE_ADMIN`) for all endpoints.

{{< table "table-striped table-sm" >}}
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/admin/vault/policies` | Lists all ACL policy names from `sys/policies/acl/` |
| `POST` | `/api/admin/vault/policies?service=` | Uploads `{service}-policy.hcl` from classpath to Vault |
| `DELETE` | `/api/admin/vault/policies?service=` | Deletes the ACL policy for a service |
{{< /table >}}

### POST /api/admin/vault/policies

```bash {linenos=table, anchorlinenos=true}
# Upload the admin-service policy
curl -X POST "http://localhost:8089/api/admin/vault/policies?service=admin-service" \
  -H "Authorization: Bearer <token>"

# Upload the user-service policy
curl -X POST "http://localhost:8089/api/admin/vault/policies?service=user-service" \
  -H "Authorization: Bearer <token>"
```

The service resolves the policy file as `{service}-policy.hcl` from the classpath (`src/main/resources/`). The file is read via `CommonUtils.loadConfig(path)` and written to `/sys/policies/acl/{service}-policy` in Vault.

---

## DTOs

{{< table "table-striped table-sm" >}}
| DTO | Type | Fields |
|---|---|---|
| `AppRole` | `@Data` class | `roleId`, `secretId` |
| `AppRoleResponseDto` | Java record | `roleId`, `secretId` |
| `CreateAppRoleDto` | Java record | `roleName`, `policies: List<String>` |
| `KeyCloakClientResponse` | Java record | `clientId`, `clientSecret` |
| `KeycloakRole` | Java record | `composite`, `name`, `description`, `composites`, `attributes` |
| `VaultApiResponseDto` | Java record | `data: Map<String,Object>`, `leastDuration`, `leaseId`, `requestId` |
| `VaultResponseDto` | Java record | `responseCode`, `responseMessage` |
| `VaultSecretDto` | Java record | `service`, `secretKey`, `secretValue` |
{{< /table >}}

{{< alert context="info" text="All DTOs except AppRole are immutable Java records. AppRole is a @Data class because it is used as a configuration binding target, which requires a mutable JavaBean." />}}
