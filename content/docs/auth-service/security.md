---
title: "Security"
description: "Implementation details for JWT role mapping and endpoint security."
icon: "security"
weight: 500
toc: true
---

## Overview

The `arya-banking-auth-service` utilizes **Spring Security** with **OAuth2 Resource Server** to protect its administrative and internal endpoints.

---

## JWT Role Mapping

The platform uses a custom `JwtAuthenticationConverter` to map Keycloak roles to Spring Security authorities.

```java {linenos=table, anchorlinenos=true}
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

## Authorization Rules

The security filter chain defines the access control policies for different parts of the API.

| Endpoint Pattern | Authority Required | Description |
|---|---|---|
| `/api/auth/authenticate` | `permitAll()` | The public login endpoint. |
| `/internal/**` | `ROLE_INTERNAL_SERVICE` | Internal endpoints used only for service-to-service communication. |
| `anyRequest()` | `authenticated()` | All other requests must provide a valid JWT. |

---

## Inter-Service Authentication

The Auth Service uses the `auth-service-client` to perform authenticated Feign calls to other services (like User Service). This is handled by a standard `OAuth2FeignConfig` interceptor, ensuring consistent security across the microservice mesh.

{{< alert context="warning" text="Ensure that the <code>ROLE_INTERNAL_SERVICE</code> is correctly assigned to the <code>auth-service-client</code> in Keycloak." />}}
