---
title: "Configuration Reference"
description: "Complete reference for application.yaml, bootstrap.yml, and all configuration beans."
icon: "settings"
weight: 400
toc: true
date: "2025-03-20T00:00:00Z"
lastmod: "2025-03-20T00:00:00Z"
tags: ["configuration", "yaml", "vault", "bootstrap"]
---

## application.yaml

The main application configuration file loaded by Spring Boot on startup.

```yaml {linenos=table, anchorlinenos=true}
spring:
  application:
    name: arya-banking-admin-service
    database: admin-service

  config:
    import:
      - configserver:http://localhost:8090
      - file:${user.home}/.config/${spring.application.name}/vault-param.yml

  security:
    oauth2:
      resourceserver:
        jwt:
          jwk-set-uri: ${app.config.keycloak.jwk-set-uri}

app:
  config:
    keycloak:
      url: http://localhost:5433
      realm: event-based-banking-service
      client-id: admin-service-client
      client-secret: ${ADMIN_SERVICE_CLIENT_SECRET}
      token-uri: ${app.config.keycloak.token-uri}

server:
  port: 8089

security:
  api-roles:
    create-client:
      - ROLE_ADMIN
    query-realm:
      - ROLE_ADMIN
    vault-ops:
      - ROLE_ADMIN
```

### Key Properties Reference

{{< table "table-striped table-sm" >}}
| Property | Value | Notes |
|---|---|---|
| `server.port` | `8089` | Service HTTP port |
| `app.config.keycloak.url` | `http://localhost:5433` | Non-standard port — local Docker Keycloak |
| `app.config.keycloak.realm` | `event-based-banking-service` | Target Keycloak realm |
| `app.config.keycloak.client-id` | `admin-service-client` | OAuth2 client for admin-service |
| `app.config.keycloak.client-secret` | `${ADMIN_SERVICE_CLIENT_SECRET}` | Injected from Vault at startup |
| `security.api-roles.*` | `ROLE_ADMIN` | All ops currently require `ROLE_ADMIN` |
{{< /table >}}

{{< alert context="info" text="The ADMIN_SERVICE_CLIENT_SECRET property is resolved from Vault's KV store at the path secret/arya-banking/admin-service/dev during Spring Cloud Vault bootstrap." />}}

---

## bootstrap.yml

Loaded before `application.yaml`. Configures Vault and the Config Server connection — both of which are required to resolve properties used in `application.yaml`.

```yaml {linenos=table, anchorlinenos=true}
spring:
  application:
    name: arya-banking-admin-service
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
        role-id: <role-id>
        secret-id: <secret-id>
      kv:
        enabled: true
        backend: secret
        default-context: ""
        application-name: arya-banking/admin-service
        profile-separator: /
```

### Vault Path Resolution

With `profile-separator: /` and `profiles.active: dev`, the service resolves secrets from:

```text {linenos=table, anchorlinenos=true}
secret/arya-banking/admin-service/dev
```

{{< alert context="danger" text="The role-id and secret-id in bootstrap.yml are currently hardcoded. They must be externalised — either via the vault-param.yml local file or environment variables — before any production or shared-environment deployment." />}}

---

## Configuration Beans

### `ApiProperties`

Binds the `security.api-roles` map into a typed POJO. Used by `RolePermissionValidator` to look up which roles are permitted for a given operation string.

```java {linenos=table, anchorlinenos=true}
@ConfigurationProperties(prefix = "security")
public class ApiProperties {
    private Map<String, List<String>> apiRoles;
}
```

### `VaultConfigs`

Binds `vault.*` properties (URI and AppRole credentials) into a POJO. Injected into `AppRoleConfig` to build the programmatic Vault client.

```java {linenos=table, anchorlinenos=true}
@ConfigurationProperties(prefix = "vault")
public class VaultConfigs {
    private String vaultUri;
    private AppRole appRole;   // holds roleId + secretId
}
```

### `AppRoleConfig`

Extends `AbstractVaultConfiguration` to provide a custom `VaultTemplate` bean authenticated via AppRole. The `@Primary RestTemplateFactory` stub satisfies the abstract class contract without overriding HTTP behaviour.

```java {linenos=table, anchorlinenos=true}
@Configuration
public class AppRoleConfig extends AbstractVaultConfiguration {

    @Bean
    public VaultTemplate vaultTemplate() { ... }

    @Override
    public VaultEndpoint vaultEndpoint() {
        return VaultEndpoint.from(URI.create(vaultConfigs.getVaultUri()));
    }

    @Bean @Primary
    public RestTemplateFactory restTemplateFactory() { ... }

    @Override
    public ClientAuthentication clientAuthentication() {
        AppRoleAuthenticationOptions options = AppRoleAuthenticationOptions.builder()
            .roleId(AppRoleAuthenticationOptions.RoleId.provided(roleId))
            .secretId(AppRoleAuthenticationOptions.SecretId.provided(secretId))
            .build();
        return new AppRoleAuthentication(options, restOperations());
    }
}
```

### `MethodSecurityConfig`

Activates Spring Method Security so that `@PreAuthorize` annotations on controller methods are enforced by the security proxy.

```java {linenos=table, anchorlinenos=true}
@Configuration
@EnableMethodSecurity(prePostEnabled = true)
public class MethodSecurityConfig {}
```

### `SecurityConfig`

Configures the HTTP security filter chain:

```java {linenos=table, anchorlinenos=true}
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http.csrf(AbstractHttpConfigurer::disable)
        .authorizeHttpRequests(req ->
            req.requestMatchers("/internal/**").hasAnyAuthority("ROLE_INTERNAL_SERVICE")
               .anyRequest().authenticated())
        .oauth2ResourceServer(oauth2 ->
            oauth2.jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter())));
    return http.build();
}
```

{{< table "table-striped table-sm" >}}
| Path Pattern | Required Authority | Notes |
|---|---|---|
| `/internal/**` | `ROLE_INTERNAL_SERVICE` | Reserved for service-to-service calls |
| All other paths | Any valid JWT | Further method-level RBAC applied by `@PreAuthorize` |
{{< /table >}}

The JWT converter extracts `realm_access.roles` from the Keycloak token and prefixes each value with `ROLE_` (e.g., `ADMIN` → `ROLE_ADMIN`).
