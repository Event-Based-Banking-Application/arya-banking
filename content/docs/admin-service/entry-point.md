---
title: "Entry Point & Annotations"
description: "The main application class, Spring Boot exclusions, component scan strategy, and the two custom annotations — @AdminRestController and @AllowedRoles."
icon: "code"
weight: 150
toc: true
date: "2025-03-20T00:00:00Z"
lastmod: "2025-03-20T00:00:00Z"
tags: ["spring-boot", "annotations", "entry-point", "rbac"]
---

## Application Entry Point

**File:** `org.arya.banking.admin.AryaBankingAdminServiceApplication`

{{< prism lang="java" linkable-line-numbers="true" line-numbers="true" >}}
@SpringBootApplication(exclude = {
    DataSourceAutoConfiguration.class,
    DataSourceTransactionManagerAutoConfiguration.class,
    HibernateJpaAutoConfiguration.class
})
@ComponentScan(basePackages = {
    "org.arya.banking.admin",
    "org.arya.banking.common"
})
@EnableMongoAuditing
@EnableDiscoveryClient
public class AryaBankingAdminServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(AryaBankingAdminServiceApplication.class, args);
    }
}
{{< /prism >}}

---

## Annotation Breakdown

### `@SpringBootApplication(exclude = ...)`

The admin-service is **MongoDB-only** — it has no relational database. The three excluded auto-configurations prevent Spring Boot from attempting to set up a DataSource (JDBC), a transaction manager backed by a DataSource, and Hibernate JPA. Without these exclusions, the application would fail on startup because no `javax.sql.DataSource` bean is present on the classpath.

{{< table "table-striped table-sm" >}}
| Excluded Class | Why |
|---|---|
| `DataSourceAutoConfiguration` | Prevents JDBC DataSource bean creation |
| `DataSourceTransactionManagerAutoConfiguration` | Prevents JDBC transaction manager setup |
| `HibernateJpaAutoConfiguration` | Prevents JPA/Hibernate EntityManagerFactory setup |
{{< /table >}}

{{< alert context="info" text="MongoDB's own auto-configuration (MongoAutoConfiguration, MongoDataAutoConfiguration) is NOT excluded — it runs normally and wires up the MongoClient, MongoTemplate, and all MongoRepository beans." />}}

---

### `@ComponentScan(basePackages = {...})`

By default, Spring Boot scans only the package of the main class and its sub-packages (`org.arya.banking.admin`). The explicit `@ComponentScan` extends the scan to include `org.arya.banking.common`, which means:

- `GlobalExceptionHandler` (`@RestControllerAdvice`) is registered — all `GlobalException` subclasses are handled automatically.
- `MetadataInitializer` (active under `metadata-loader` profile) is picked up without any additional import.
- Common `@Component`, `@Service`, and `@Mapper` beans from the shared library are wired into the application context.

{{< alert context="warning" text="If you add a new shared component to arya-banking-common and it does not appear in the context, verify that its package is under org.arya.banking.common — components in other packages will not be scanned." />}}

---

### `@EnableMongoAuditing`

Activates Spring Data MongoDB's auditing infrastructure. Any document class annotated with `@CreatedDate` and `@LastModifiedDate` (inherited from `AryaBase` in the common library) will have those fields populated automatically on insert and update.

```java {linenos=table, anchorlinenos=true}
// From AryaBase in arya-banking-common
public abstract class AryaBase {
    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;

    private boolean deleted;
}
```

---

### `@EnableDiscoveryClient`

Registers the service with **Netflix Eureka** on startup. The service appears in the Eureka dashboard as `ARYA-BANKING-ADMIN-SERVICE` and can be resolved by other services using its logical name through the gateway or Feign clients.

---

## Custom Annotations

### `@AdminRestController`

**File:** `org.arya.banking.admin.annotation.AdminRestController`

A composed annotation that bundles `@RestController` and `@RequestMapping("/api/admin")` into a single declaration. All controllers except `ClientCreationController` use it.

```java {linenos=table, anchorlinenos=true}
@Target({ElementType.TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@RestController
@RequestMapping("/api/admin")
public @interface AdminRestController {}
```

**Usage on a controller:**

```java {linenos=table, anchorlinenos=true}
@AdminRestController   // replaces @RestController + @RequestMapping("/api/admin")
public class VaultAppRoleController {

    @GetMapping("/vault-approle")
    public ResponseEntity<List<String>> getAppRoles() { ... }
}
```

**Why it matters:** Without this annotation, every controller would need to repeat `@RequestMapping("/api/admin")` individually. A single change to the base path requires touching only the annotation definition, not every controller.

{{< alert context="warning" text="ClientCreationController does not use @AdminRestController — it declares @RequestMapping(\"/api/admin\") directly. This is a known inconsistency flagged for cleanup." />}}

---

### `@AllowedRoles`

**File:** `org.arya.banking.admin.annotation.AllowedRoles`

A method-level meta-annotation that wraps the `RolePermissionValidator` SpEL expression behind a clean, declarative interface.

```java {linenos=table, anchorlinenos=true}
@Target({ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@PreAuthorize("@rolePermissionValidator.hasAnyRole(authentication, #allowedRoles.value())")
public @interface AllowedRoles {
    String value();
}
```

**Intended usage:**

```java {linenos=table, anchorlinenos=true}
// Instead of this (current approach):
@PreAuthorize("@rolePermissionValidator.hasAnyRole(authentication, 'vault-ops')")
@GetMapping("/vault-approle")
public ResponseEntity<?> getAppRoles() { ... }

// You would write:
@AllowedRoles("vault-ops")
@GetMapping("/vault-approle")
public ResponseEntity<?> getAppRoles() { ... }
```

**How it works:**

The `#allowedRoles.value()` in the SpEL expression is a parameter reference — `#allowedRoles` refers to the annotation instance itself, and `.value()` returns the `String` passed to the annotation. Spring Security evaluates this expression at method interception time, passing the resolved string to `RolePermissionValidator.hasAnyRole(authentication, operation)`.

{{< alert context="warning" text="@AllowedRoles is defined but currently unused. All five controllers use inline @PreAuthorize expressions. Adopting @AllowedRoles consistently would reduce repetition and make role changes easier to trace. Either migrate all controllers to use it or remove it to avoid dead code." />}}

---

## Startup Sequence

```mermaid
sequenceDiagram
    participant JVM
    participant SC  as Spring Cloud Vault
    participant CS  as Config Server
    participant KC  as KeyCloakManager
    participant EU  as Eureka

    JVM->>SC: Read bootstrap.yml → authenticate AppRole
    SC-->>JVM: Inject Vault secrets (ADMIN_SERVICE_CLIENT_SECRET, etc.)
    JVM->>CS: Fetch remote config from localhost:8090
    CS-->>JVM: Merge remote properties into environment
    JVM->>JVM: Start application context\n(ComponentScan admin + common)
    JVM->>KC: @PostConstruct init()\n(build Keycloak Admin Client)
    KC-->>JVM: Keycloak client ready
    JVM->>EU: Register with Eureka\n(ARYA-BANKING-ADMIN-SERVICE)
    EU-->>JVM: Registration confirmed
    JVM->>JVM: HTTP server starts on :8089
```

{{< alert context="info" text="Vault bootstrap happens before the application context is created. If the role-id or secret-id is invalid or expired, the JVM exits before Spring even begins wiring beans." />}}
