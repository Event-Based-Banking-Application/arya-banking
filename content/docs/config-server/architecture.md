---
title: "Architecture"
description: "End-to-End flow and startup order for the centralized configuration layer."
icon: "hub"
weight: 200
toc: true
---

## End-to-End Config Flow

Config Server serves properties to all microservices at startup. Microservices never read active configs from their own JAR in production; they retrieve them dynamically via the config server.

```mermaid
sequenceDiagram
    participant Repo as arya-banking-configs (Git)
    participant CS as Config Server (:8090)
    participant Service as Microservice (e.g. user-service)

    CS->>Repo: git clone / pull (Startup & per request)
    Service->>CS: HTTP GET /{application}/{profile} (Startup)
    CS-->>Service: Merged application.yml + service.yml properties
    Note over Service: Service boots up using fetched config
```

## Dockerized Platform Stack

The Config Server runs as a Docker container in the platform stack. The `compose/platform.yml` configures it with health checks against `/actuator/health` and an environment override for the Eureka URL:

```yaml
config-server:
  image: karthikulkarni/arya-banking-config-server:latest
  ports:
    - "8090:8090"
  environment:
    EUREKA_CLIENT_SERVICEURL_DEFAULTZONE: http://service-registry:8761/eureka/
  depends_on:
    service-registry:
      condition: service_started
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8090/actuator/health"]
```

{{< alert context="info" text="See the [Infrastructure &rarr; Docker Compose]({{< ref \"/docs/infra/docker-compose\" >}}) page for the full platform.yml details." />}}

---

## Startup Order

Since services depend on remote properties to connect to databases and message brokers, the startup order is critical:

1. **Service Registry (`8761`)**: Must start first to allow discovery.
2. **Config Server (`8090`)**: Registers with Eureka, clones the Git repo, and begins serving configs.
3. **All other Microservices**: Fetch their configs from `8090`, then self-register with `8761`.
