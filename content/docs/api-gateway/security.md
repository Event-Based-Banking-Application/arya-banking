---
title: "Security"
description: "Security configuration and JWT validation in the API Gateway."
icon: "security"
weight: 410
toc: true
---

## Gateway Security Strategy

The API Gateway is the first line of defense. It acts as an **OAuth2 Resource Server**, validating every incoming request that targets a non-permitted path.

---

## 1. JWT Validation

The Gateway uses **Spring Security Reactive** to validate tokens against Keycloak.

### Signature & Issuer Validation
- **JWK Set**: Fetches public keys from `${app.config.keycloak.jwk-set-uri}`.
- **Issuer**: Ensures the `iss` claim matches the configured Keycloak realm URL.

### Security Configuration
The `SecurityConfig.java` defines the reactive filter chain:

```java {linenos=table, anchorlinenos=true}
@Bean
public SecurityWebFilterChain securityFilterChain(ServerHttpSecurity serverHttpSecurity) {
    serverHttpSecurity.authorizeExchange(authorize ->
            authorize.pathMatchers("/api/users/register", "/api/auth/authenticate").permitAll()
                    .pathMatchers("/internal/**").hasAuthority("ROLE_INTERNAL_SERVICE")
                    .anyExchange().authenticated())
            .csrf(ServerHttpSecurity.CsrfSpec::disable)
            .oauth2ResourceServer(oauth -> oauth.jwt(Customizer.withDefaults()));
    return serverHttpSecurity.build();
}
```

### Route-Level Access

{{< table "table-striped table-sm" >}}
| Path Pattern | Access Rule | Purpose |
|---|---|---|
| `/api/users/register` | `permitAll` | User self-registration |
| `/api/auth/authenticate` | `permitAll` | Login endpoint |
| `/internal/**` | `ROLE_INTERNAL_SERVICE` | Service-to-service calls |
| All other paths | Authenticated (JWT required) | Standard API access |
{{< /table >}}

---

## 2. Global CORS Configuration

To allow cross-origin requests from the banking frontend, the Gateway is configured with a global CORS policy.

{{< table "table-striped table-hover table-sm" >}}
| Setting | Value |
|---|---|
| **Allowed Origins** | `*` (Development) / Specified frontend URL |
| **Allowed Methods** | `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS` |
| **Allowed Headers** | `*` |
| **Allow Credentials** | `true` |
{{< /table >}}

---

## 3. JWT Authority Mapping

Similar to the microservices, the Gateway extracts roles from the `realm_access.roles` claim. This allows the Gateway to potentially perform path-based RBAC (e.g., restricting `/api/admin/**` to `ROLE_ADMIN`) before the request even leaves the ingress layer.

{{< alert context="tip" text="For a detailed breakdown of how roles are mapped, see the [Global Security Model]({{< ref \"/docs/system/security-model\" >}})." />}}

---

## Security Observability

Failed authentication attempts are logged at the Gateway level, providing early visibility into potential brute-force or unauthorized access patterns.
