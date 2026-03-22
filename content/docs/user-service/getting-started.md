---
title: "Getting Started"
description: "How to set up and run the arya-banking-user-service locally."
icon: "rocket_launch"
weight: 100
toc: true
---

## Prerequisites

Before running the User Service, ensure you have the following infrastructure components running:

1.  **Shared Library**: The `arya-banking-common` library must be built and available in your local Maven repository (`mvn clean install`).
2.  **Infrastructure Stacks**: Run `make up` in `arya-banking-infra` to start:
    -   Kafka & Schema Registry
    -   Keycloak & PostgreSQL
    -   HashiCorp Vault (must be unsealed)
    -   Eureka (service-registry)
    -   Config Server

---

## Local Development Setup

### 1. Clone the Repository
```bash
git clone https://github.com/Event-Based-Banking-Application/arya-banking-user-service.git
cd arya-banking-user-service
```

### 2. Configure Vault Secrets
Ensure the following secrets are present in Vault at `secret/arya-banking/user-service/dev`:
- `MONGO.PASSWORD`
- `USER.SERVICE.CLIENT.SECRET`

### 3. Build and Run
```bash
mvn clean spring-boot:run
```

The service will start on port **8086**.

---

## Health Check

Verify the service is running and registered with Eureka:

- **Actuator Health**: `http://localhost:8086/actuator/health`
- **Eureka Dashboard**: `http://localhost:8761`
- **Swagger UI**: `http://localhost:8086/swagger-ui.html`

{{< alert context="info" text="The service will register as <code>user-service</code> in Eureka." />}}
