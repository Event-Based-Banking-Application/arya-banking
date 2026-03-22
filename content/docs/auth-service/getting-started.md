---
title: "Getting Started"
description: "Setup and local development guide for the Auth Service."
icon: "rocket_launch"
weight: 200
toc: true
---

## Prerequisites

The Auth Service relies on the following infrastructure to be operational:

1.  **Shared Library**: Build `arya-banking-common` (`mvn clean install`).
2.  **Infrastructure Stacks**: Run `make up` in `arya-banking-infra` to start:
    -   **Eureka**: For service discovery.
    -   **Vault**: Must be unsealed and contain auth-service secrets.
    -   **Keycloak**: The primary identity provider.
    -   **Config Server**: To provide environment-specific properties.

---

## Local Setup

### 1. Build the Project
```bash
mvn clean install -DskipTests
```

### 2. Configure Vault Secrets
Ensure the following keys exist in Vault at `secret/arya-banking/auth-service/dev`:
- `AUTH.SERVICE.CLIENT.SECRET`
- `ARYA.BANKING.AUTH.CLIENT.SECRET`

### 3. Run the Application
```bash
mvn spring-boot:run
```

The service will start on port **8087**.

---

## Health and Validation

Verify the service status using the following endpoints:

- **Actuator Health**: `http://localhost:8087/actuator/health`
- **Keycloak Status**: Verify connection in `KeyCloakManager` logs.
- **Service Registry**: Check that `arya-banking-auth-service` appears in Eureka (`http://localhost:8761`).

{{< alert context="info" text="The Auth Service uses a pooled <code>RestTemplate</code> with a custom error handler to prevent automatic throwing of 401 Unauthorized errors during credential validation." />}}
