# Arya Banking Infra
## Codebase Knowledge Document

| Field | Value |
|---|---|
| Repository | `arya-banking-infra` |
| Type | Infrastructure-only (no Java, no build file) |
| Purpose | Docker Compose definitions for the entire Arya Banking platform |
| Shared Network | `arya-banking-net` (external bridge) |
| Orchestration | `Makefile` + individual `compose/*.yml` files |

---

## 1. Overview

`arya-banking-infra` is the **single source of truth for all infrastructure** in the Arya Banking platform. It contains no application code — only Docker Compose files, a Makefile, and Vault configuration. Every third-party service (Kafka, Keycloak, Vault) and every platform service (Service Registry, Config Server) is defined and launched from here.

The design separates infrastructure into **four independent Compose files**, each representing a concern:

| File | Concern | Services |
|---|---|---|
| `compose/kafka.yml` | Event streaming | Kafka (KRaft), Schema Registry, Kafka Connect |
| `compose/keycloak.yml` | Identity & Access Management | PostgreSQL, Keycloak |
| `compose/vault.yml` | Secrets management | HashiCorp Vault |
| `compose/platform.yml` | Spring Boot platform | Service Registry (Eureka), Config Server |

All four share a single Docker bridge network: **`arya-banking-net`**.

---

## 2. Repository Structure

```
arya-banking-infra/
├── Makefile                        ← Single entry point for all operations
├── compose/
│   ├── kafka.yml                   ← Kafka + Schema Registry + Kafka Connect
│   ├── keycloak.yml                ← PostgreSQL + Keycloak
│   ├── platform.yml                ← Service Registry + Config Server
│   ├── vault.yml                   ← HashiCorp Vault
│   ├── postgres-data/              ← .gitignored — Keycloak PG data volume mount
│   ├── keycloak-data/              ← .gitignored — Keycloak realm/theme data
│   └── vault/
│       ├── data/                   ← .gitignored — Vault encrypted storage
│       └── config/
│           └── vault.hcl           ← Vault server configuration
├── vault/
│   └── config/
│       └── vault.hcl               ← Duplicate Vault config (root-level copy)
└── .gitignore
```

> **Note:** `compose/vault`, `compose/keycloak-data`, and `compose/postgres-data` are explicitly `.gitignored` — these directories contain runtime data that must never be committed.

---

## 3. Shared Network

All services communicate over a single external Docker bridge network named `arya-banking-net`. This network is **not created by any Compose file** — it must exist before any stack is started.

```bash
# Create (idempotent — safe to run multiple times)
docker network create arya-banking-net

# Or via Makefile
make network-create
```

Every Compose file declares the network as external:
```yaml
networks:
  arya-banking-net:
    external: true
```

Services reference each other by **container hostname** across this network. Key hostnames:

| Hostname | Service | Port (internal) |
|---|---|---|
| `kafka` | Kafka broker | `29092` |
| `schema-registry` | Confluent Schema Registry | `8081` |
| `kafka-connect0` | Kafka Connect REST | `8082` |
| `postgres` | Keycloak PostgreSQL | `5432` |
| `keycloak` | Keycloak IAM | `8080` |
| `vault` | HashiCorp Vault | `8200` |
| `service-registry` | Eureka (Spring Boot) | `8761` |
| `config-server` | Spring Cloud Config Server | `8090` |

---

## 4. Makefile

The `Makefile` is the **single CLI interface** for operating the entire infrastructure. It wraps `docker compose` with the four file flags pre-assembled.

### 4.1 Core Variables

```makefile
COMPOSE = docker compose
FILES   = -f compose/kafka.yml -f compose/keycloak.yml -f compose/platform.yml -f compose/vault.yml
```

### 4.2 Full Target Reference

| Target | Command | Description |
|---|---|---|
| `make network-create` | `docker network create arya-banking-net` | Creates the shared network (idempotent — skips if exists) |
| `make network-remove` | `docker network rm arya-banking-net` | Removes the network (skips if not found) |
| `make up` | `docker compose [all files] up -d` | **Starts the full stack** (creates network first) |
| `make down` | `docker compose [all files] down` | Stops all containers (volumes preserved) |
| `make restart` | `docker compose [all files] restart` | Restarts all running containers |
| `make logs` | `docker compose [all files] logs -f` | Tails logs from all containers |
| `make ps` | `docker compose [all files] ps` | Shows status of all containers |
| `make kafka` | `docker compose -f compose/kafka.yml up -d` | Starts Kafka stack only |
| `make kafka-down` | `docker compose -f compose/kafka.yml down` | Stops Kafka stack only |
| `make keycloak` | `docker compose -f compose/keycloak.yml up -d` | Starts Keycloak stack only |
| `make keycloak-down` | `docker compose -f compose/keycloak.yml down` | Stops Keycloak stack only |
| `make platform` | `docker compose -f compose/platform.yml up -d` | Starts platform services only |
| `make platform-down` | `docker compose -f compose/platform.yml down` | Stops platform services only |
| `make vault` | `docker compose -f compose/vault.yml up -d` | Starts Vault only |
| `make vault-down` | `docker compose -f compose/vault.yml down` | Stops Vault only |
| `make clean` | `docker compose [all files] down -v --remove-orphans` | **Destructive** — stops all + removes all volumes |

> ⚠️ **`make clean` is destructive.** It removes all named volumes including Kafka data, Keycloak PostgreSQL data, and Schema Registry data. Keycloak realm configuration will be lost unless exported first.

### 4.3 Recommended Startup Sequence

```bash
# 1. Create network (once)
make network-create

# 2. Start full stack
make up

# OR start individual concerns in dependency order:
make vault        # 1st — secrets needed by other services
make keycloak     # 2nd — identity needed by microservices
make kafka        # 3rd — event bus
make platform     # 4th — Spring Boot platform services (registry + config)
```

---

## 5. compose/kafka.yml — Event Streaming

### 5.1 Services Overview

| Service | Image | Container | Host Port | Internal Port |
|---|---|---|---|---|
| Kafka | `confluentinc/cp-kafka:latest` | `kafka-banking` | `9092` | `29092` |
| Schema Registry | `confluentinc/cp-schema-registry:latest` | `schema-registry-banking` | `8081` | `8081` |
| Kafka Connect | `confluentinc/cp-kafka-connect:latest` | `kafka-connect-banking` | `8082` | `8082` |

### 5.2 Kafka (KRaft Mode)

Runs as a **combined broker + controller** node — no Zookeeper required.

```yaml
KAFKA_PROCESS_ROLES: broker,controller
KAFKA_NODE_ID: 1
CLUSTER_ID: 383d9e96-76e1-4441-bc4a-2102308d5e31
```

**Listener architecture:**

| Listener Name | Address | Purpose |
|---|---|---|
| `PLAINTEXT_EXTERNAL` | `0.0.0.0:9092` | Spring Boot apps on host machine |
| `PLAINTEXT_INTERNAL` | `0.0.0.0:29092` | Docker containers on `arya-banking-net` |
| `CONTROLLER` | `0.0.0.0:9093` | KRaft Raft consensus (internal only) |

**Advertised listeners (what clients connect to):**

| Listener | Advertised As | Used By |
|---|---|---|
| `PLAINTEXT_INTERNAL` | `kafka:29092` | All Docker services (Schema Registry, Connect, microservices) |
| `PLAINTEXT_EXTERNAL` | `localhost:9092` | Local Spring Boot dev (IDE / `mvn spring-boot:run`) |

**Key settings:**
- `KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1` — single-node, no replication
- `KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 1` — supports `@Transactional` Kafka producers
- `KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka:9093` — single voter, self-elected controller
- Data persisted to named volume `kafka-data`

**Health check:**
```yaml
healthcheck:
  test: ["CMD", "kafka-broker-api-versions", "--bootstrap-server", "localhost:9092"]
  interval: 10s
  timeout: 10s
  retries: 10
  start_period: 30s
```
Kafka is the only service with a healthcheck defined. Other services should add `depends_on: kafka: condition: service_healthy`.

### 5.3 Schema Registry

| Setting | Value | Notes |
|---|---|---|
| Bootstrap server | `PLAINTEXT://kafka:29092` | Uses internal Docker listener |
| Compatibility level | `BACKWARD` | New schema versions must be backward-compatible with previous versions |
| Replication factor | `1` | Single-node |
| Host port | `8081` | Used by Avro producers/consumers and `arya-banking-common` Kafka config |

> **Compatibility rule:** `BACKWARD` means a new schema can read data written with the previous schema. Fields must have defaults when added. Removing fields is not allowed without a compatibility level change.

### 5.4 Kafka Connect

Kafka Connect is included for future CDC (Change Data Capture) or sink connectors. Currently configured with String converters (no Avro at the connector level).

| Setting | Value |
|---|---|
| Bootstrap server | `PLAINTEXT://kafka:29092` |
| REST port | `8082` |
| Config/Offset/Status topics | `_connect_configs`, `_connect_offset`, `_connect_status` |
| Plugin path | `/usr/share/java,/usr/share/confluent-hub-components` |
| Advertised hostname | `kafka-connect0` |

> No connectors are pre-installed. Install via: `docker exec kafka-connect-banking confluent-hub install <connector>`

### 5.5 Spring Boot Integration

Services importing `arya-banking-common` connect to Kafka using these values:

```yaml
# application.yaml (served from arya-banking-configs)
spring:
  kafka:
    bootstrap-servers: localhost:9092          # local dev
    # OR for Docker:
    bootstrap-servers: kafka:29092             # containerised microservice
    properties:
      schema.registry.url: http://localhost:8081    # local dev
      # OR for Docker:
      schema.registry.url: http://schema-registry:8081
```

---

## 6. compose/keycloak.yml — Identity & Access Management

### 6.1 Services Overview

| Service | Image | Container | Host Port | Internal Port |
|---|---|---|---|---|
| PostgreSQL | `postgres:15` | `keycloak-db` | `5432` | `5432` |
| Keycloak | `quay.io/keycloak/keycloak:26.0.2` | `keycloak` | `5433` | `8080` |

### 6.2 PostgreSQL (Keycloak backend)

| Config | Value |
|---|---|
| Database | `keycloak` |
| Username | `keycloak` |
| Password | `keycloakpass` |
| Volume | `./postgres-data` (bind mount, gitignored) |

> ⚠️ **Bind mount, not named volume.** PostgreSQL data is stored in `compose/postgres-data/` as a bind mount. This survives `docker compose down` but is wiped by `make clean` only if the directory is deleted manually. However, if this directory is not initialised correctly (e.g., permissions issue), Postgres fails to start.

### 6.3 Keycloak

| Config | Value | Notes |
|---|---|---|
| Image | `quay.io/keycloak/keycloak:26.0.2` | Pinned version — do not use `latest` for Keycloak |
| Mode | `start-dev` | Development mode — TLS disabled, relaxed security |
| Admin username | `admin` | Change for any non-local environment |
| Admin password | `admin` | Change for any non-local environment |
| Host port | `5433` | Maps to Keycloak's internal `8080` |
| DB backend | PostgreSQL via JDBC | `jdbc:postgresql://postgres:5432/keycloak` |
| Data volume | `./keycloak-data:/opt/keycloak/data` | Bind mount, gitignored |

**Password hashing — Argon2id tuning:**

```yaml
KC_SPI_PASSWORD_HASHING_PROVIDER: argon2
KC_SPI_PASSWORD_HASHING_ARGON2_MEMORY: 65536     # 64 MB
KC_SPI_PASSWORD_HASHING_ARGON2_PARALLELISM: 2
KC_SPI_PASSWORD_HASHING_ARGON2_ITERATIONS: 3
KC_SPI_PASSWORD_HASHING_ARGON2_TYPE: id          # enforces Argon2id (not Argon2i or Argon2d)
```

This explicitly hardens password storage with Argon2id, which is the current OWASP-recommended algorithm. The memory, parallelism, and iteration parameters are tuned for moderate security — increase memory for production.

**Important URLs:**

| URL | Purpose |
|---|---|
| `http://localhost:5433` | Keycloak Admin Console |
| `http://localhost:5433/realms/event-based-banking-application` | Banking realm base |
| `http://localhost:5433/realms/event-based-banking-application/protocol/openid-connect/token` | Token endpoint (used in `arya-banking-configs`) |
| `http://localhost:5433/realms/event-based-banking-application/protocol/openid-connect/certs` | JWK Set endpoint for JWT validation |

**Realm name:** `event-based-banking-application` (defined in `arya-banking-configs/application.yml` under `app.config.keycloak.realm`)

**Data durability concern:**  
Keycloak realm config (realm settings, clients, roles, users) is stored in PostgreSQL, which is bind-mounted. If `compose/postgres-data` is deleted or the volume is corrupted, all Keycloak configuration is lost. **Best practice:** export realm config regularly:

```bash
docker exec keycloak /opt/keycloak/bin/kc.sh export \
  --dir /tmp/realm-export \
  --realm event-based-banking-application
docker cp keycloak:/tmp/realm-export ./keycloak-realm-export
```

---

## 7. compose/vault.yml — Secrets Management

### 7.1 Service Overview

| Config | Value |
|---|---|
| Image | `hashicorp/vault:1.21` |
| Container | `vault` |
| Host port | `8091` → internal `8200` |
| Data volume | `./vault/data:/vault/data` (bind mount, gitignored) |
| Config volume | `./vault/config:/vault/config` |
| Config file | `vault server -config=vault/config/vault.hcl` |
| Capability | `IPC_LOCK` — prevents secrets from being swapped to disk |

### 7.2 vault.hcl Configuration

```hcl
ui = true

storage "file" {
  path = "/vault/data"
}

listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = 1
}

disable_mlock = false
```

| Setting | Value | Notes |
|---|---|---|
| `ui = true` | Enables Vault Web UI | Accessible at `http://localhost:8091/ui` |
| `storage "file"` | File-based storage at `/vault/data` | Suitable for dev/test only — use Consul or integrated storage for prod |
| `tls_disable = 1` | TLS off | **Never disable TLS in production** |
| `disable_mlock = false` | mlock enabled | Combined with `IPC_LOCK` cap — prevents secrets from being paged to disk |

> **Note:** There are two copies of `vault.hcl` — one at `compose/vault/config/vault.hcl` (used by the container volume mount) and a duplicate at `vault/config/vault.hcl` (root-level copy). The Docker Compose volume mount path `./vault/data` in `compose/vault.yml` resolves relative to the `compose/` directory, so the container uses `compose/vault/config/vault.hcl`.

### 7.3 Vault Lifecycle (Required Manual Steps)

Vault starts **sealed** every time the container restarts. It requires manual initialisation (first run only) and unsealing (every restart).

**First-time initialisation:**
```bash
# Initialise (run once — save the output!)
docker exec vault vault operator init \
  -key-shares=1 \
  -key-threshold=1 \
  -format=json > vault-init.json

# Unseal
UNSEAL_KEY=$(cat vault-init.json | jq -r '.unseal_keys_b64[0]')
docker exec vault vault operator unseal $UNSEAL_KEY
```

**After every container restart:**
```bash
# Check status
docker exec vault vault status

# Unseal (if sealed)
docker exec vault vault operator unseal <UNSEAL_KEY>
```

> **PowerShell equivalent (Windows):**
> ```powershell
> $init = docker exec vault vault operator init -key-shares=1 -key-threshold=1 -format=json | ConvertFrom-Json
> docker exec vault vault operator unseal $init.unseal_keys_b64[0]
> ```

### 7.4 AppRole Setup for admin-service

The `arya-banking-admin-service` uses AppRole authentication. After unsealing, set up:

```bash
# Login with root token
docker exec vault vault login <ROOT_TOKEN>

# Enable AppRole auth
docker exec vault vault auth enable approle

# Enable KV v2 secrets engine
docker exec vault vault secrets enable -path=secret kv-v2

# Create policy
docker exec vault vault policy write admin-policy - <<EOF
path "secret/data/*" {
  capabilities = ["read", "list"]
}
EOF

# Create AppRole
docker exec vault vault write auth/approle/role/admin-role \
  token_policies="admin-policy" \
  token_ttl=1h \
  token_max_ttl=4h

# Get role-id and secret-id
docker exec vault vault read auth/approle/role/admin-role/role-id
docker exec vault vault write -f auth/approle/role/admin-role/secret-id
```

### 7.5 Accessing Vault

| URL | Purpose |
|---|---|
| `http://localhost:8091/ui` | Vault Web UI |
| `http://localhost:8091` | Vault API (used by Spring Vault in `admin-service`) |
| `http://vault:8200` | Vault API from other Docker containers |

---

## 8. compose/platform.yml — Spring Boot Platform Services

### 8.1 Services Overview

| Service | Image | Container | Host Port | Internal Port |
|---|---|---|---|---|
| Service Registry | `karthikulkarni/arya-banking-service-registry:latest` | `service-registry` | `8761` | `8761` |
| Config Server | `karthikulkarni/arya-banking-config-server:latest` | `config-server` | `8090` | `8090` |

Both use **published Docker Hub images** (`karthikulkarni/*`). No local builds are triggered by this file.

### 8.2 Service Registry (Eureka)

```yaml
service-registry:
  image: karthikulkarni/arya-banking-service-registry:latest
  container_name: service-registry
  ports:
    - "8761:8761"
  restart: unless-stopped
  networks:
    - arya-banking-net
```

- No environment overrides — relies entirely on the image's default `application.yaml` (port `8761`, `register-with-eureka: false`)
- Accessible from other containers as `http://service-registry:8761/eureka`
- Eureka dashboard: `http://localhost:8761`

### 8.3 Config Server

```yaml
config-server:
  image: karthikulkarni/arya-banking-config-server:latest
  ports:
    - "8090:8090"
  environment:
    SPRING_PROFILES_ACTIVE: default
    EUREKA_CLIENT_SERVICEURL_DEFAULTZONE: http://service-registry:8761/eureka/
  depends_on:
    - service-registry
```

- `EUREKA_CLIENT_SERVICEURL_DEFAULTZONE` overrides the typo in `config-server/application.yaml` (`localhosat`) — this is the correct Docker hostname reference
- `depends_on: service-registry` — starts after the registry container is created (not necessarily healthy)
- Serves config from `arya-banking-configs` GitHub repo to all microservices

### 8.4 Startup Dependency Across Files

When running the full stack with `make up`, Docker Compose handles dependencies within each file but **not across files**. The correct start order must be respected manually or via healthchecks:

```
vault          → Unsealed manually after start
keycloak       → Depends on postgres (within keycloak.yml)
kafka          → Has healthcheck; schema-registry/connect depend on it
platform:
  service-registry  → Must be ready before config-server registers
  config-server     → depends_on: service-registry (within platform.yml)
microservices  → Started separately; depend on all of the above
```

---

## 9. Port Map — Full Stack

| Port | Service | Protocol | Notes |
|---|---|---|---|
| `5432` | PostgreSQL (Keycloak DB) | TCP | Direct DB access for debugging |
| `5433` | Keycloak | HTTP | Admin Console + OAuth2 endpoints |
| `8081` | Schema Registry | HTTP | Avro schema REST API |
| `8082` | Kafka Connect | HTTP | Connector management REST API |
| `8090` | Config Server | HTTP | Spring Cloud Config HTTP API |
| `8091` | HashiCorp Vault | HTTP | Vault API + Web UI |
| `8761` | Service Registry | HTTP | Eureka dashboard + registration API |
| `9092` | Kafka | TCP | External (host/localhost) access |
| `29092` | Kafka | TCP | Internal Docker network access |

**Application service ports (not in this repo — for reference):**

| Port | Service |
|---|---|
| `8086` | `arya-banking-user-service` |
| `8087` | `arya-banking-auth-service` |
| `8089` | `arya-banking-admin-service` |

---

## 10. .gitignore Analysis

```gitignore
compose/vault
compose/keycloak-data
compose/postgres-data
```

These three directories are gitignored because they contain runtime data generated by running services:

| Ignored Path | Contains | Risk if Committed |
|---|---|---|
| `compose/vault` | Vault encrypted secrets, unseal keys | **Catastrophic** — secrets exposure |
| `compose/keycloak-data` | Keycloak H2/file data, themes | Realm config if not using Postgres properly |
| `compose/postgres-data` | PostgreSQL WAL + data files | Database dump, potentially user credentials |

---

## 11. Known Issues & Improvement Suggestions

| # | Location | Issue | Recommendation |
|---|---|---|---|
| 1 | `compose/keycloak.yml` | Admin credentials `admin`/`admin` hardcoded | Use environment variables from a `.env` file (gitignored): `KEYCLOAK_ADMIN=${KC_ADMIN}` |
| 2 | `compose/keycloak.yml` | PostgreSQL password `keycloakpass` hardcoded | Move to `.env` file |
| 3 | `compose/keycloak.yml` | `start-dev` mode used | Only acceptable for local dev. Use `start` with proper TLS for staging/prod |
| 4 | `compose/keycloak.yml` | PostgreSQL uses bind mount (`./postgres-data`) | Switch to a named Docker volume for better portability and to prevent permissions issues on Windows |
| 5 | `compose/kafka.yml` | `confluentinc/cp-kafka:latest` — no pinned version | Pin to a specific version (e.g., `7.8.0`) to prevent unexpected upgrades breaking consumers |
| 6 | `compose/kafka.yml` | Schema Registry has no healthcheck | Add healthcheck so downstream services can use `condition: service_healthy` |
| 7 | `compose/vault.yml` | No healthcheck on Vault container | Add: `healthcheck: test: ["CMD", "vault", "status"] interval: 10s` |
| 8 | `compose/platform.yml` | `service-registry` has no healthcheck | Add actuator healthcheck; config-server `depends_on` should use `condition: service_healthy` |
| 9 | `compose/platform.yml` | Uses `latest` tag for both images | Pin to specific versions or use SHA digests for reproducible deployments |
| 10 | `vault.hcl` | `tls_disable = 1` | Never use in production — add TLS certificates and set `tls_cert_file` / `tls_key_file` |
| 11 | `vault.hcl` | `storage "file"` | File storage is not HA or production-grade. Use Vault Integrated Storage (Raft) for prod |
| 12 | Root-level `vault/config/vault.hcl` | Duplicate of `compose/vault/config/vault.hcl` | Remove the root-level copy to avoid configuration drift |
| 13 | `Makefile` | `network-create` uses `>nul` (Windows CMD syntax) | Replace with cross-platform: `docker network inspect arya-banking-net >/dev/null 2>&1 \|\| docker network create arya-banking-net` |
| 14 | All compose files | No `.env` file support for secrets | Add a `.env.example` file documenting required variables; add `.env` to `.gitignore` |

---

## 12. Quick Reference

### Start/Stop Commands

```bash
# Full stack
make up                    # Start everything
make down                  # Stop everything (keep volumes)
make clean                 # ⚠️ Stop + delete all volumes

# Individual concerns
make vault                 # Start Vault only
make keycloak              # Start Keycloak + Postgres
make kafka                 # Start Kafka + Schema Registry + Connect
make platform              # Start Service Registry + Config Server

# Diagnostics
make logs                  # Tail all logs
make ps                    # Show container status
```

### Key Service URLs

```bash
# Keycloak Admin Console
http://localhost:5433  (admin / admin)

# Vault UI
http://localhost:8091/ui

# Eureka Dashboard
http://localhost:8761

# Config Server
curl http://localhost:8090/arya-banking-user-service/default

# Schema Registry
curl http://localhost:8081/subjects

# Kafka Connect
curl http://localhost:8082/connectors
```

### Vault Unseal (every restart)

```bash
docker exec vault vault operator unseal <UNSEAL_KEY>
```

### Keycloak Realm Export

```bash
docker exec keycloak /opt/keycloak/bin/kc.sh export \
  --dir /tmp/export \
  --realm event-based-banking-application
docker cp keycloak:/tmp/export ./keycloak-realm-export
```

### Adding a New Microservice to the Infra

1. Add a service block to `compose/platform.yml` with the Docker Hub image
2. Add `EUREKA_CLIENT_SERVICEURL_DEFAULTZONE: http://service-registry:8761/eureka/` to its environment
3. Add `networks: - arya-banking-net`
4. Add `depends_on: - service-registry` (and `- config-server` if it uses config server)
5. Add a route entry in `arya-banking-configs/application.yml` under `spring.cloud.gateway.server.webflux.routes`
