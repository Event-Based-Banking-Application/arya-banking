---
title: "Configuration"
description: "Reference for application.yaml, Config Server, and ecosystem integration."
icon: "settings"
weight: 400
toc: true
---

## Config Server Integration

The gateway pulls its routing configuration from the **Spring Cloud Config Server** at startup. This is the primary mechanism for defining routes centrally.

```yaml
spring:
  config:
    import: 'configserver:'
  cloud:
    config:
      uri: http://localhost:8090
  application:
    name: arya-banking-api-gateway
```

{{< alert context="info" text="The <code>spring.application.name</code> determines which config file is fetched — <code>arya-banking-api-gateway.yml</code> from the Config Server." />}}

---

## Dockerized Deployment

The API Gateway runs as a container in the platform stack alongside the Service Registry and Config Server. It is defined in `compose/platform.yml`:

```yaml
api-gateway:
  image: karthikulkarni/arya-banking-api-gateway:latest
  container_name: api-gateway
  ports:
    - "8085:8085"
  environment:
    EUREKA_CLIENT_SERVICEURL_DEFAULTZONE: http://service-registry:8761/eureka/
    SPRING_CLOUD_CONFIG_URI: http://config-server:8090
  depends_on:
    service-registry:
      condition: service_started
    config-server:
      condition: service_healthy
  networks:
    - arya-banking-net
```

{{< alert context="info" text="See the [Infrastructure &rarr; Docker Compose]({{< ref \"/docs/infra/docker-compose\" >}}) page for the full platform stack." />}}

---

## Service Discovery

The gateway registers with Eureka for both advertisement and downstream route resolution.

```yaml
eureka:
  client:
    service-url:
      defaultZone: http://localhost:8761/eureka
```

---

## Keycloak Integration

The gateway acts as both an **OAuth2 Client** (browser login) and **OAuth2 Resource Server** (JWT validation).

```yaml
app:
  config:
    keycloak:
      url: http://localhost:5433/
      realm: event-based-banking-application

spring:
  security:
    oauth2:
      client:
        provider:
          keycloak:
            token-uri: ${app.config.keycloak.url}/realms/${app.config.keycloak.realm}/protocol/openid-connect/token
            authorization-uri: ${app.config.keycloak.url}/realms/${app.config.keycloak.realm}/protocol/openid-connect/auth
            jwk-set-uri: ${app.config.keycloak.url}/realms/${app.config.keycloak.realm}/protocol/openid-connect/certs
            user-info-uri: ${app.config.keycloak.url}/realms/${app.config.keycloak.realm}/protocol/openid-connect/userinfo
        registration:
          banking-service-client:
            provider: keycloak
            client-id: banking-service-client
            client-secret: ${KEYCLOAK_CLIENT_SECRET}
            authorization-grant-type: authorization_code
            scope: openid
      resourceserver:
        jwt:
          jwk-set-uri: ${app.config.keycloak.jwk-set-uri}
```

{{< alert context="info" text="Port `5433` is the standard host mapping for Keycloak in the Arya Banking infrastructure stack." />}}

---

## Maven Coordinates

{{< table "table-striped table-hover" >}}
| Setting | Value |
|---|---|
| **Parent** | `spring-boot-starter-parent : 3.5.4` |
| **BOM** | `spring-cloud-dependencies : 2025.0.0` |
| **Group ID** | `org.arya.banking` |
| **Artifact ID**| `arya-banking-api-gateway` |
| **Java** | 17 |
{{< /table >}}

---

## Dependencies

Key library focus:
* `spring-cloud-starter-gateway`: Reactive proxy core.
* `spring-cloud-starter-config`: Config Server client.
* `spring-boot-starter-oauth2-client`: Authorization Code flow support.
* `spring-boot-starter-oauth2-resource-server`: JWT validation.
* `spring-cloud-starter-netflix-eureka-client`: Service discovery registration.
* `spring-boot-starter-actuator`: Health checks and route inspection.
