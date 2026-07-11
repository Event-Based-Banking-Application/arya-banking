---
title: "Configuration"
description: "Detailed breakdown of the Auth Service's configuration and properties."
icon: "settings"
weight: 400
toc: true
---

## Overview

The `arya-banking-auth-service` manages its configuration through a combination of local `application.yaml` properties, shared properties from the **Config Server**, and sensitive secrets from **Vault**.

---

## application.yaml

The primary configuration file defines the service's port, application name, and OAuth2 security settings.

```yaml {linenos=table, anchorlinenos=true}
server:
  port: 8087

spring:
  application:
    name: arya-banking-auth-service
  config:
    import: configserver:http://localhost:8090
  security:
    oauth2:
      client:
        registration:
          auth-service-client:
            client-id: auth-service-client
            client-secret: ${AUTH.SERVICE.CLIENT.SECRET}
            authorization-grant-type: client_credentials
```

### Key Properties

- **`server.port`**: Set to `8087` to match the platform's routing standards.
- **`spring.config.import`**: Imports shared Keycloak URLs and realm settings from the centralized Config Server.
- **`auth-service-client.client-secret`**: Injected from Vault at startup.

---

## Pooled RestTemplate Configuration

The Auth Service uses a custom `HttpConfig` to initialize a high-performance, pooled `RestTemplate`.

```java {linenos=table, anchorlinenos=true}
@Bean
public RestTemplate restTemplate() {
    PoolingHttpClientConnectionManager connManager = new PoolingHttpClientConnectionManager();
    connManager.setMaxTotal(100);
    connManager.setDefaultMaxPerRoute(20);
    // ...
}
```

{{< alert context="info" text="The pooled <code>RestTemplate</code> is specifically configured with a custom error handler to allow the service to manually inspect 401 Unauthorized responses during authentication." />}}

---

## Environment Variables

For production deployments, ensure the following environment variables are set:

| Variable / File | Description |
|---|---|---|
| `vault-credentials.yml` | AppRole Role ID + Secret ID for Vault auth (local gitignored file) |
| `AUTH.SERVICE.CLIENT.SECRET` | Secret for service-to-service Feign calls. |
| `ARYA.BANKING.AUTH.CLIENT.SECRET` | Secret for the Keycloak Admin Client SDK. |
