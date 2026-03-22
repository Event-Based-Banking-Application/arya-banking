---
title: "Security"
description: "Implementation details for JWT authentication, role extraction, and internal path security."
icon: "security"
weight: 5300
toc: true
---

## Overview

The `arya-banking-user-service` uses **Spring Security** with **OAuth2 Resource Server** support to secure its endpoints.

---

## JWT Authentication Converter

All incoming requests with a Bearer JWT are processed by a custom `JwtAuthenticationConverter`. This converter matches the Keycloak realm's role structure.

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

### Role Mapping
- Keycloak Role: `INTERNAL_SERVICE` → Spring Authority: `ROLE_INTERNAL_SERVICE`
- Keycloak Role: `USER` → Spring Authority: `ROLE_USER`

---

## Security Filter Chain

The `SecurityFilterChain` defines which paths are protected and what authorities are required.

```java {linenos=table, anchorlinenos=true}
@Bean
public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http.csrf(AbstractHttpConfigurer::disable)
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/api/**").permitAll()
            .requestMatchers("/internal/**").hasAnyAuthority("ROLE_INTERNAL_SERVICE")
            .anyRequest().authenticated())
        .oauth2ResourceServer(oauth2 -> oauth2.jwt(
            jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter())));
    return http.build();
}
```

{{< alert context="warning" text="Currently, <code>/api/**</code> is set to <code>permitAll()</code> to facilitate registration. In a production environment, this should be hardened to require <code>ROLE_USER</code> for all profile-related endpoints." />}}

---

## Internal Service Communication

The `/internal/**` paths are restricted to service-to-service calls. The **Auth Service** authenticates via `client_credentials` to obtain a JWT with the `INTERNAL_SERVICE` role before calling the User Service.

### Automated Account Locking
The internal security details controller allows the Auth Service to signal login failures. If the `loginFailedAttempts` reaches **5**, the User Service automatically:
1.  Updates the user's status to `BLOCKED`.
2.  Publishes a `user-create-event` with the state `BLOCKED`.
3.  Synchronizes this state if necessary with Keycloak.
