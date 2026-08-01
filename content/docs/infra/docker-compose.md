---
title: "Docker Compose"
description: "Detailed breakdown of the four core infrastructure stacks with images, healthchecks, and volumes."
icon: "deployed_code"
weight: 200
toc: true
---

## Infrastructure Stacks

The Arya Banking platform is orchestrated via four modular Docker Compose files located in the `compose/` directory of `arya-banking-infra`. All services join the external `arya-banking-net` network.

---

## 1. Event Streaming (`kafka.yml`)

Provides the Apache Kafka backbone for event-driven communication.

{{< alert context="info" text="This stack runs Kafka in **KRaft mode** (single node: broker + controller), eliminating the need for a separate Zookeeper ensemble. Cluster ID: <code>383d9e96-76e1-4441-bc4a-2102308d5e31</code>." />}}

{{< table "table-striped table-sm" >}}
| Service | Image | Host Port | Healthcheck |
|---|---|---|---|
| **Kafka** | `confluentinc/cp-kafka:latest` | `9092` (external) / `29092` (internal) | `kafka-broker-api-versions` (10s/10s, 10 retries, 30s start) |
| **Schema Registry** | `confluentinc/cp-schema-registry:latest` | `8081` | — |
| **Kafka Connect** | `confluentinc/cp-kafka-connect:latest` | `8083` | — |
| **Kafka UI (Kafbat)** | `ghcr.io/kafbat/kafka-ui:latest` | `8080` | — |
{{< /table >}}

### Listener Architecture
Kafka is configured with multiple listeners to support both internal (container) and external (host) clients:
* **`PLAINTEXT_INTERNAL`**: `kafka:29092` (used by Docker microservices)
* **`PLAINTEXT_EXTERNAL`**: `localhost:9092` (used for local IDE debugging)
* **`CONTROLLER`**: `kafka:9093` (KRaft controller quorum, single node `1@kafka:9093`)

### Kafka Connect
* Group: `compose-connect-group`
* Internal topics: `_connect_configs`, `_connect_offset`, `_connect_status` (RF=1)
* Key/Value converters: `StringConverter` (external), `JsonConverter` (internal)
* Schema Registry URL: `http://schema-registry:8081`

### Kafka UI (Kafbat)
* Cluster name: `banking-local`, Schema Registry + Kafka Connect linked
* URL: `http://localhost:8080`

### Volumes
`kafka-data` (`/var/lib/kafka/data`), `schema-data`, `pgdata` (named volumes).

---

## 2. Identity & Access (`keycloak.yml`)

Handles Authentication and Authorization via Keycloak 26.

{{< table "table-striped table-sm" >}}
| Service | Image | Host Port | Notes |
|---|---|---|---|
| **PostgreSQL** | `postgres:15` | `5432` | DB/user/pass: `keycloak`/`keycloak`/`keycloakpass` |
| **Keycloak** | `quay.io/keycloak/keycloak:26.0.2` | `5433` → `8080` | `start-dev` mode, admin/admin bootstrap |
{{< /table >}}

{{% alert icon="🔒" context="warning" %}}
Keycloak is configured with **Argon2id** password hashing by default. This is the current OWASP-recommended algorithm for secure credential storage.
{{% /alert %}}

### Volumes & Data
* `postgres-data` (host bind `./postgres-data`) — PostgreSQL persistence
* `keycloak-data` (host bind `./keycloak-data`) — realm export/import artifacts

---

## 3. Secrets Management (`vault.yml`)

Secures sensitive configuration (DB passwords, client secrets) using HashiCorp Vault.

* **Image**: `hashicorp/vault:1.21`
* **Mode**: File storage (`vault server -config=vault/config/vault.hcl`), `ui = true`, `tls_disable = 1`
* **UI**: Enabled at `http://localhost:8091/ui`
* **Port**: `8091` -> `8200`
* **Capabilities**: `cap_add: IPC_LOCK`
* **Volumes**: `./vault/data`, `./vault/config`

{{< alert context="danger" text="Vault starts in a **sealed** state. It must be manually unsealed after every container restart via <code>make vault-unseal</code> (initialized with 5 secret shares / threshold 3)." />}}

---

## 4. Platform Services (`platform.yml`)

Orchestrates the Spring Cloud infrastructure components (images published to Docker Hub as `karthikulkarni/arya-banking-*`).

{{< table "table-striped table-sm" >}}
| Service | Image | Port | Healthcheck / Depends |
|---|---|---|---|
| **Service Registry** | `karthikulkarni/arya-banking-service-registry:latest` | `8761` | restart `unless-stopped` |
| **Config Server** | `karthikulkarni/arya-banking-config-server:latest` | `8090` | `curl -f localhost:8090/actuator/health` (10s/5s/5 retries) |
| **API Gateway** | `karthikulkarni/arya-banking-api-gateway:latest` | `8085` | waits for config-server healthy |
{{< /table >}}

### Environment Variables

{{< table "table-striped table-sm" >}}
| Service | Variable | Value |
|---|---|---|
| Config Server | `SPRING_PROFILES_ACTIVE` | `default` |
| Config Server | `EUREKA_CLIENT_SERVICEURL_DEFAULTZONE` | `http://service-registry:8761/eureka/` |
| API Gateway | `SPRING_CLOUD_CONFIG_URI` | `http://config-server:8090` |
| API Gateway | `APP_CONFIG_KEYCLOAK_URL` | `http://keycloak:8080` |
| API Gateway | `EUREKA_CLIENT_SERVICEURL_DEFAULTZONE` | `http://service-registry:8761/eureka/` |
{{< /table >}}

---

## Network Map

All services are joined to the `arya-banking-net` network:

```mermaid
flowchart TD
    subgraph "External Access (Host)"
        C[Client / IDE]
    end

    subgraph "arya-banking-net"
        K[Kafka :29092]
        SR[Schema Registry :8081]
        KC[Keycloak :8080]
        VT[Vault :8200]
        EUR[Eureka :8761]
        CS[Config Server :8090]
        GW[API Gateway :8085]
    end

    C -->|:9092| K
    C -->|:5433| KC
    C -->|:8091| VT
    C -->|:8761| EUR
    C -->|:8085| GW
```
