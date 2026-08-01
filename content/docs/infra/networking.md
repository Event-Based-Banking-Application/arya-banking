---
title: "Networking"
description: "Internal Docker networking and service connectivity in Arya Banking."
icon: "router"
weight: 310
toc: true
---

## Shared Platform Network

The Arya Banking platform relies on a single, shared Docker bridge network named **`arya-banking-net`**.

### Role of `arya-banking-net`
- **Isolation**: All platform containers are restricted to this network, preventing accidental exposure of internal services.
- **Service Discovery**: Eureka and the Config Server use container hostnames (e.g., `arya-banking-service-registry`) to communicate within the bridge.
- **Inter-service Traffic**: Non-public traffic (e.g., Kafka to microservices) flows entirely through this network.

---

## Port Mapping Reference

The platform uses consistent port mapping (Host → Container) to maintain predictability during development.

{{< table "table-striped table-hover table-sm" >}}
| Service | Host Port | Container Port | Protocol | Purpose |
|---|---|---|---|---|
| `api-gateway` | 8085 | 8085 | HTTP | Public Ingress |
| `user-service` | 8086 | 8086 | HTTP | Microservice |
| `auth-service` | 8087 | 8087 | HTTP | Microservice |
| `admin-service` | 8089 | 8089 | HTTP | Microservice |
| `config-server` | 8090 | 8090 | HTTP | Property Server |
| `service-registry`| 8761 | 8761 | HTTP | Eureka Dashboard |
| `keycloak` | 5433 | 8080 | HTTP | IAM console |
| `vault` | 8091 | 8200 | HTTP | Secrets Engine |
| `kafka` | 9092 | 9092 | PLAINTEXT | Event Broker |
{{< /table >}}

---

## Mixed Docker + Local Connectivity

When the platform stack (Service Registry, Config Server, API Gateway) runs in Docker but business services (User, Auth, Admin) run **locally** via Maven, the business services must register with Eureka using an address reachable from Docker containers. The shared config in `arya-banking-configs` sets:

```yaml
eureka:
  instance:
    hostname: host.docker.internal
```

This ensures locally-run services advertise themselves as `host.docker.internal:<port>`, which the Docker gateway container can reach.

{{< alert context="info" text="<code>host.docker.internal</code> resolves to the host machine from inside Docker containers. On Linux, add <code>--add-host host.docker.internal:host-gateway</code> to your Docker run command." />}}

---

## Traffic Flow

1. **North-South Traffic**: Enters through Port `8085` (API Gateway) and is routed to individual services on `8086-8089`.
2. **East-West Traffic**: Inter-service Feign calls bypass the Gateway and communicate directly via container hostnames on their respective host ports (configured via Eureka).

{{< alert context="warning" text="Ensure that the <code>arya-banking-net</code> is created manually (<code>make up</code> handles this) before starting individual services directly via Maven." />}}
