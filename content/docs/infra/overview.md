---
title: "Overview"
description: "High-level architecture and repository structure of the arya-banking-infra project."
icon: "info"
weight: 100
toc: true
---

## Introduction

The `arya-banking-infra` repository is the **single source of truth** for all infrastructure in the Arya Banking platform. It contains no application code — only Docker Compose definitions, configuration files, and automation scripts.

Every third-party service (Kafka, Keycloak, Vault) and every platform service (Service Registry, Config Server) is orchestrated from this central location.

---

## Repository Structure

The infrastructure is organized into a modular set of Docker Compose files, allowing you to start individual concerns or the entire stack as needed.

```text
arya-banking-infra/
├── Makefile                        ← Single entry point for all operations
├── compose/
│   ├── kafka.yml                   ← Kafka + Schema Registry + Kafka Connect
│   ├── keycloak.yml                ← PostgreSQL + Keycloak
│   ├── platform.yml                ← Service Registry + Config Server
│   ├── vault.yml                   ← HashiCorp Vault
│   └── vault/
│       └── config/
│           └── vault.hcl           ← Vault server configuration
└── .gitignore
```

{{< alert context="warning" text="Runtime data directories like `postgres-data/`, `keycloak-data/`, and `vault/data/` are explicitly ignored via `.gitignore` and should never be committed." />}}

---

## Core Components

The stack is divided into four primary concerns:

{{< table "table-striped" >}}
| Component | Concern | Key Services |
|---|---|---|
| **Event Streaming** | Messaging & Schemas | Apache Kafka, Schema Registry |
| **Identity & Access** | IAM | Keycloak, PostgreSQL |
| **Secrets Management** | Security | HashiCorp Vault |
| **Spring Platform** | Service Coordination | Eureka, Config Server |
{{< /table >}}

---

## Shared Network

All containers communicate over a dedicated external bridge network named **`arya-banking-net`**.

{{< alert context="primary" text="This network must exist before starting any stack. It is not created automatically by the individual Compose files." />}}

```bash
# Create the network manually
docker network create arya-banking-net

# Or use the provided Makefile
make network-create
```

Every service in the platform references others using their **container hostname** (e.g., `http://keycloak:8080` or `kafka:29092`).
