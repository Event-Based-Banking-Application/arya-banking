---
title: "Roadmap & Known Issues"
description: "Planned features, GitHub issue backlog, and known bugs or technical debt in the current v1.0.0 release."
icon: "help"
weight: 1100
toc: true
date: "2025-03-20T00:00:00Z"
lastmod: "2025-03-20T00:00:00Z"
tags: ["roadmap", "issues", "technical-debt"]
---

## Planned Features

The following items are defined in `.github/issues.json` and will be auto-created as GitHub Issues via the `auto-create-issues` workflow.

{{< table "table-striped table-sm" >}}
| # | Feature | Description | Labels |
|---|---|---|---|
| 1 | **List all users** | Paginated admin API to fetch list of users | `admin`, `api` |
| 2 | **Block / unblock users** | Admin API to block or unblock user accounts | `admin`, `user-management` |
| 3 | **Update roles** | Modify user roles using Keycloak RBAC | `admin`, `keycloak` |
| 4 | **View audit logs** | Access audit logs for compliance and investigation | `admin`, `audit` |
| 5 | **Trigger user notifications** | Manually trigger notifications to users | `admin`, `notification` |
| 6 | **View system-wide stats** | Dashboard for system statistics such as total user count | `admin`, `analytics` |
{{< /table >}}

---

## Known Issues & Technical Debt

### Security

{{% alert icon="🚨" context="danger" %}}
**Missing `@PreAuthorize` on `DELETE /api/admin/vault-secrets`**

The `deleteVaultSecret` method in `VaultOperationsController` is not annotated with `@PreAuthorize`. Any authenticated user — regardless of role — can delete a Vault secret path. This is a critical gap and should be patched immediately:

```java {linenos=table, anchorlinenos=true}
@PreAuthorize("@rolePermissionValidator.hasAnyRole(authentication, 'vault-ops')")
@DeleteMapping("/vault-secrets")
public ResponseEntity<?> deleteVaultSecret(@RequestParam String service) { ... }
```
{{% /alert %}}

### Configuration

{{< alert context="warning" text="The bootstrap.yml currently has role-id and secret-id hardcoded. These credentials expire and must be rotated manually. Externalise them into the vault-param.yml local config file or inject via environment variables before any shared deployment." />}}

### Code Consistency

{{< alert context="warning" text="ClientCreationController does not use @AdminRestController — it declares @RequestMapping(\"/api/admin\") directly. This inconsistency should be corrected to match all other controllers." />}}

{{< alert context="warning" text="The @AllowedRoles annotation is defined but unused. All controllers use inline @PreAuthorize expressions instead. Either adopt @AllowedRoles consistently or remove it to avoid confusion." />}}

### Unused Dependencies

{{< table "table-striped table-sm" >}}
| Dependency | Status | Notes |
|---|---|---|
| `spring-kafka` + `kafka-streams` | Declared, not used | Avro schemas and topic constants exist; producers/consumers not yet implemented |
| `spring-boot-starter-batch` | Declared, not used | No batch jobs implemented |
{{< /table >}}

### Test Coverage

{{< alert context="warning" text="Only a context-load stub test exists (AryaBankingAdminServiceApplication). No unit or integration tests have been written. JaCoCo is configured but will report near-zero coverage until tests are added." />}}

### Code Quality

{{< alert context="info" text="VaultPolicyServiceImpl has an unused import: org.apache.kafka.common.protocol.types.Field.Field. This should be cleaned up to avoid SpotBugs warnings." />}}

---

## Dependency Versions Reference

{{< table "table-striped table-sm" >}}
| Dependency | Version |
|---|---|
| Spring Boot | `3.5.4` |
| Spring Cloud | `2025.0.0` |
| Keycloak Admin Client | `26.0.4` |
| SpringDoc OpenAPI | `2.8.9` |
| MapStruct | `1.5.5.Final` |
| Lombok | `1.18.36` |
| Avro | `1.11.4` |
| arya-banking-common | `1.1.9` |
| JaCoCo | `0.8.13` |
| SpotBugs Plugin | `4.8.6.1` |
{{< /table >}}
