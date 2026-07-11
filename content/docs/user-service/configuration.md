---
title: "Configuration"
description: "Reference for User Service application properties and bootstrap secrets."
icon: "settings"
weight: 400
toc: true
---

## YAML Configuration

The `arya-banking-user-service` uses a dual-file configuration strategy with **Spring Cloud Config** and **HashiCorp Vault**.

### `application.yaml` (Shared Config)

This file defines non-sensitive properties, including Kafka topics and OAuth2 client settings.

```yaml
spring:
  application:
    name: arya-banking-user-service
    topic: user-create-event
    database: user-service

  security:
    oauth2:
      client:
        registration:
          user-service-client:
            client-id: user-service-client
            client-secret: ${USER.SERVICE.CLIENT.SECRET}
            authorization-grant-type: client_credentials
      resourceserver:
        jwt:
          jwk-set-uri: ${app.config.keycloak.jwk-set-uri}
```

### `bootstrap.yml` (Startup Secrets)

Processed before the main application context to fetch secrets from Vault. Credentials come from the gitignored `vault-credentials.yml` file via `spring.config.import`.

```yaml
spring:
  config:
    import: "optional:file:./vault-credentials.yml"
  cloud:
    vault:
      uri: http://localhost:8091
      authentication: APPROLE
      app-role:
        role-id: placeholder
        secret-id: placeholder
      kv:
        application-name: arya-banking/user-service
```

---

## Configuration Beans

### `SecurityConfig` (JWT Roles)

The service extracts Keycloak roles from the `realm_access` claim and maps them to Spring Security authorities.

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

### `OAuth2FeignConfig` (Inter-service Auth)

Enables automatic Bearer token injection for all outgoing Feign calls.

```java {linenos=table, anchorlinenos=true}
@Bean
public RequestInterceptor oauth2RequestInterceptor() {
    return requestTemplate -> {
        OAuth2AuthorizeRequest request = OAuth2AuthorizeRequest
            .withClientRegistrationId(clientRegistrationId)
            .principal(clientRegistrationId).build();

        OAuth2AuthorizedClient client = authorizedClientManager.authorize(request);
        requestTemplate.header(HttpHeaders.AUTHORIZATION, 
            "Bearer " + client.getAccessToken().getTokenValue());
    };
}
```

---

## Environment Variables

| Variable / File | Description | Source |
|---|---|---|---|
| `vault-credentials.yml` | AppRole Role ID + Secret ID for Vault auth | Local file (gitignored) |
| `MONGO.PASSWORD` | Password for MongoDB Atlas | Vault KV `secret/arya-banking/user-service` |
| `USER.SERVICE.CLIENT.SECRET` | Client secret for Feign auth | Vault KV `secret/arya-banking/user-service` |
