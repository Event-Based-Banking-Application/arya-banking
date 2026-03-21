---
title: "Architecture"
description: "Position of the Service Registry in the broader Arya Banking system architecture."
icon: "hub"
weight: 200
toc: true
---

## Ecosystem Position

`arya-banking-service-registry` sits at the heart of the dynamic routing and discovery mechanism. It is the **first service in the startup sequence**. Nothing else can communicate without it.

### Startup Order Dependency

{{< alert context="warning" text="Services **must** be started in this sequence to ensure successful discovery and configuration." />}}

```mermaid
flowchart TD
    SR((1. Service Registry))
    CS(2. Config Server)
    GW(3. API Gateway)
    US(4. Core Services<br/>User / Auth / Admin)
    
    SR -->|Registers with| CS
    SR -->|Registers with| GW
    SR -->|Registers with| US
```

### Client Service Connections

Every client microservice in the platform points its `eureka.client.service-url.defaultZone` configuration to this server.

```mermaid
sequenceDiagram
    participant AS as Admin Service
    participant SR as Service Registry
    participant GW as API Gateway

    AS->>SR: POST /eureka/apps/ADMIN-SERVICE (Register)
    SR-->>AS: 204 No Content
    loop Heartbeat (every 30s)
        AS->>SR: PUT /eureka/apps/ADMIN-SERVICE
    end
    GW->>SR: GET /eureka/apps (Fetch Registry)
    SR-->>GW: XML/JSON full registry
    GW->>AS: Route API Request
```
