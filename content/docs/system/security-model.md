---
title: "Security Model"
description: "Comprehensive overview of the Arya Banking security architecture: Keycloak, Vault, and JWT."
icon: "security"
weight: 130
toc: true
---

## Security Architecture

Arya Banking implements a **Zero Trust** security model for microservices, centered around centralized identity management and secure secret orchestration.

---

## 1. Identity Management (Keycloak)

**Keycloak** serves as the primary Identity Provider (IdP) and Authorization Server.

### Keycloak Realm: `event-based-banking-application`
The platform uses a dedicated realm to segregate banking users and services.

#### Core Clients
{{< table "table-striped table-hover table-sm" >}}
| Client ID | Grant Type | Role |
|---|---|---|
| `banking-service-client` | `authorization_code` | Browser/Mobile Login |
| `auth-service-client` | `client_credentials` | Auth Service M2M |
| `user-service-client` | `client_credentials` | User Service M2M |
| `admin-service-client` | `client_credentials` | Admin Service (Keycloak API) |
| `arya-banking-auth-client` | `password` (ROPC) | Direct internal authentication |
{{< /table >}}

### RBAC Authorities
The standard `realm_access.roles` claim in the Keycloak JWT is extracted and converted into Spring Security authorities:
- `ADMIN` → `ROLE_ADMIN`
- `INTERNAL_SERVICE` → `ROLE_INTERNAL_SERVICE`
- `USER` → `ROLE_USER`

---

## 2. Secrets Management (HashiCorp Vault)

**HashiCorp Vault** is used to store sensitive configuration (database passwords, external API keys, etc.).

### AppRole Authentication
Instead of static tokens, microservices use **Vault AppRole** to authenticate at startup.
- **Role ID**: Unique ID for the service (configured per-service in `.gitignore`-d `vault-credentials.yml`).
- **Secret ID**: A sensitive credential used to generate a temporary Vault token (same file).

### Secret Paths
Secrets are organized by service and environment:
- `secret/data/arya-banking/user-service/dev`
- `secret/data/arya-banking/auth-service/dev`
- `secret/data/arya-banking/admin-service/dev`

### Configuration Flow
```mermaid
flowchart LR
    BT["bootstrap.yml"] -->|"AppRole Auth"| VT["Vault Server"]
    VT -->|"Fetch Secrets"| SVC["Microservice Context"]
    SVC -->|"Resolve Placeholders"| APP["application.yaml"]
```

---

## 3. JWT Validation & Processing

The **API Gateway** and each **Microservice** operate as OAuth2 Resource Servers.

### Validation Strategy
1. **Signature Verification**: Services fetch the public keys (JWKs) from Keycloak's `jwk-set-uri`.
2. **Issuer Check**: Validates that the token was issued by the trusted Keycloak realm.
3. **Expiry Check**: Rejects expired tokens.

### Common JWT Converter
Every service shares a consistent logic to extract roles from the `realm_access` claim:

```java {linenos=table, anchorlinenos=true}
// Found in SecurityConfig.java across services
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
```

---

## 4. Security Observations & Hardening

{{< alert context="info" text="Each service now externalizes Vault credentials via a gitignored <code>vault-credentials.yml</code> file. The <code>bootstrap.yml</code> contains only <code>placeholder</code> values that are overridden by the local file or environment variables." />}}

{{< table "table-striped table-hover table-sm" >}}
| Area | Current Implementation | Recommendation |
|---|---|---|
| **Passwords** | Argon2id (Keycloak) | Keep as-is (industry standard). |
| **Secrets** | Vault AppRole | Rotate Secret IDs frequently using a sidecar or Vault Agent. |
| **Internal APIs** | `ROLE_INTERNAL_SERVICE` | Implement Mutual TLS (mTLS) for added transport-layer trust. |
| **User APIs** | `permitAll()` in User Service | Narrow scope to `ROLE_USER` or `authenticated()` after initial dev. |
{{< /table >}}
