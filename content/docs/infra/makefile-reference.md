---
title: "Makefile Reference"
description: "CLI reference for managing the infrastructure lifecycle."
icon: "build"
weight: 300
toc: true
---

## Command Interface

The `Makefile` in the root of the `arya-banking-infra` repository is the primary interface for all infrastructure operations. It encapsulates complex Docker Compose commands into simple, memorable targets.

---

## Core Lifecycle Commands

{{< table "table-striped table-hover" >}}
| Target | Action |
|---|---|
| `make up` | **Starts the entire stack** (creates network first). |
| `make down` | Stops all containers (preserves volumes). |
| `make restart` | Restarts all containers. |
| `make clean` | **Destructive**: Stops all + removes all volumes + orphans. |
{{< /table >}}

---

## Targeted Operations

If you only need a specific subset of the infrastructure, use these scoped commands:

### Event Batch (Kafka)
* `make kafka`: Start Kafka, Schema Registry, and Connect.
* `make kafka-down`: Stop the Kafka stack.

### Identity Batch (Keycloak)
* `make keycloak`: Start Keycloak and PostgreSQL.
* `make keycloak-down`: Stop the Keycloak stack.

### Platform Batch (Eureka/Config)
* `make platform`: Start Service Registry and Config Server.
* `make platform-down`: Stop the platform services.

---

## Diagnostic Commands

Use these targets to inspect the health and logs of the running infrastructure:

```bash
# Show status of all containers
make ps

# Tail logs from all containers
make logs

# View logs for a specific service (native docker compose)
docker compose -f compose/keycloak.yml logs -f keycloak
```

---

## Network Management

The `arya-banking-net` network must exist for the services to link correctly.

* `make network-create`: Idempotent creation of the bridge network.
* `make network-remove`: Removes the bridge network.
