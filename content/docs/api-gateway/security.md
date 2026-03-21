---
title: "Security & JWT"
description: "OAuth2 configuration, Resource Server details, and path-based authorization."
icon: "security"
weight: 300
toc: true
---

## Security Configuration

The security layer is implemented in `SecurityConfig.java` using Spring's **EnableWebFluxSecurity**.

### Authorization Rules

{{< table "table-striped table-sm" >}}
| Matcher | Rule |
|---|---|
| `/api/users/register` | `permitAll()` |
| `/api/auth/authenticate` | `permitAll()` |
| `/internal/**` | `hasAuthority("ROLE_INTERNAL_SERVICE")` |
| `anyExchange()` | `authenticated()` |
{{< /table >}}

---

## JWT Resource Server

The gateway validates every incoming JWT signature using Keycloak's public keys (JWKS).

* **Validation Style**: Asymmetric (RS256)
* **JWK Set URI**: `.../realms/event-based-banking-application/protocol/openid-connect/certs`

{{< alert context="success" text="No shared secrets are required on the gateway for JWT validation. It fetches public keys dynamically from Keycloak." />}}

---

## OAuth2 Client Flow

To support browser-based login, the gateway is also an OAuth2 Client.

### Registration Details
* **Client ID**: `banking-service-client`
* **Grant Type**: `authorization_code`
* **Scope**: `openid`

{{< alert context="warning" text="The `client-secret` is currently provided via the Config Server or direct application properties. Ensure this is managed securely in production." />}}

---

## CSRF Protection

CSRF is **disabled** (`csrf().disable()`).

Since the Arya Banking platform is a stateless API architecture using JWTs rather than session cookies, CSRF protection (which targets session-cookie-based hijacking) is not required for the Gateway's API routes.
