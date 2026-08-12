---
title: "Port Reference"
description: "A complete map of all ports used by the infrastructure and platform services."
icon: "schema"
weight: 600
toc: true
---

## Infrastructure Ports

The following ports are mapped from the Docker containers to your host machine.

{{< table "table-striped table-hover" >}}
| Port | Service | Protocol | Role |
|---|---|---|---|
| **5432** | PostgreSQL | TCP | Keycloak Database |
| **5433** | Keycloak | HTTP | IAM Admin & Auth API |
| **8080** | Kafka UI (Kafbat) | HTTP | Kafka cluster web UI |
| **8081** | Schema Registry | HTTP | Avro Schema Management |
| **8083** | Kafka Connect | HTTP | Connector REST API |
| **8090** | Config Server | HTTP | Centralized Configuration |
| **8091** | Vault | HTTP | Secrets Management & UI |
| **8761** | Eureka | HTTP | Service Discovery Dashboard |
| **9092** | Kafka | TCP | Messaging (External Access) |
{{< /table >}}

---

## Internal Network Hostnames

When services communicate **inside** the Docker network (`arya-banking-net`), they should use the container hostnames instead of `localhost`.

{{< table "table-striped table-hover table-sm" >}}
| Destination Service | Hostname | Port |
|---|---|---|
| **Kafka** | `kafka` | `29092` |
| **Schema Registry** | `schema-registry` | `8081` |
| **Kafka Connect** | `kafka-connect` | `8083` |
| **Keycloak** | `keycloak` | `8080` |
| **Vault** | `vault` | `8200` |
| **Eureka** | `service-registry` | `8761` |
| **Config Server** | `config-server` | `8090` |
| **API Gateway** | `api-gateway` | `8085` |
{{< /table >}}

---

## Application Ports (Microservices)

For reference, the following ports are used by the Spring Boot microservices (usually run on the host):

{{< table "table-striped table-hover table-sm" >}}
| Port | Service |
|---|---|
| **8085** | API Gateway |
| **8086** | User Service |
| **8087** | Auth Service |
| **8089** | Admin Service |
{{< /table >}}
