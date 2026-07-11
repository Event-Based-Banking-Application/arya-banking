---
title: "Start Infrastructure"
description: "Launch all Docker-based infrastructure services for the platform."
icon: "deployed_code"
weight: 400
toc: true
---

All infrastructure runs in Docker containers, orchestrated from the `arya-banking-infra` repository via a central Makefile.

---

## 1. Create the Shared Network

```powershell
cd arya-banking-infra
make network-create
# Or manually: docker network create arya-banking-net
```

{{< alert context="info" text="The network <code>arya-banking-net</code> must exist before any stack starts. It is an external bridge network shared by all containers." />}}

---

## 2. Start the Full Stack

```powershell
make up
```

This starts all four infrastructure stacks:

{{< table "table-striped table-sm" >}}
| Stack | Compose File | Services |
|-------|-------------|----------|
| Event Streaming | `compose/kafka.yml` | Kafka, Schema Registry, Kafka Connect |
| Identity & Access | `compose/keycloak.yml` | PostgreSQL, Keycloak |
| Secrets Management | `compose/vault.yml` | HashiCorp Vault |
| Platform Services | `compose/platform.yml` | Service Registry, Config Server, API Gateway |
{{< /table >}}

---

## 3. Verify Containers

```powershell
make ps
```

Wait until all containers show a `Running` status. The platform services may take 30-60 seconds to fully initialize.

---

## 4. Individual Stacks (Optional)

Start only what you need:

```powershell
make kafka       # Kafka + Schema Registry
make keycloak    # PostgreSQL + Keycloak
make vault       # HashiCorp Vault
make platform    # Eureka + Config Server + API Gateway
```

---

## 5. Stopping and Cleaning

```powershell
make down        # Stop all containers
make clean       # Stop and remove volumes
```

---

## Reference

- [Docker Compose Reference]({{< ref "/docs/infra/docker-compose" >}})
- [Port Reference]({{< ref "/docs/infra/port-reference" >}})
- [Network Topology]({{< ref "/docs/infra/networking" >}})
