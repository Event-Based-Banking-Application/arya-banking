---
title: "Configuration"
description: "Reference for application.yaml and ecosystem integration."
icon: "settings"
weight: 400
toc: true
---

## Keycloak Integration

The gateway's OAuth2 behavior is driven by the Keycloak configuration.

```yaml
app:
  config:
    keycloak:
      url: http://localhost:5433/
      realm: event-based-banking-application
```

{{< alert context="info" text="Port `5433` is the standard host mapping for Keycloak in the Arya Banking infrastructure stack." />}}

---

## Application Properties

### Eureka Client
```yaml
eureka:
  client:
    service-url:
      defaultZone: http://localhost:8761/eureka
```

### Spring Cloud Gateway
The gateway routes are primarily managed via the Config Server in production, but local defaults reside in `src/main/resources/application.yaml`.

---

## Maven Coordinates

{{< table "table-striped table-hover" >}}
| Setting | Value |
|---|---|
| **Parent** | `spring-boot-starter-parent : 3.5.4` |
| **BOM** | `spring-cloud-dependencies : 2025.0.0` |
| **Group ID** | `org.arya.banking` |
| **Artifact ID**| `arya-banking-api-gateway` |
{{< /table >}}

---

## Dependencies

Key library focus:
* `spring-cloud-starter-gateway`: Reactive proxy core.
* `spring-boot-starter-oauth2-client`: Auth Code flow support.
* `spring-boot-starter-oauth2-resource-server`: JWT validation.
* `netflix-eureka-client`: Registry participation.
