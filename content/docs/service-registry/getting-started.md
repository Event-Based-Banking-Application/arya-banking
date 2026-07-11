---
title: "Getting Started"
description: "Instructions for building, running, and managing the Service Registry locally."
icon: "rocket_launch"
weight: 400
toc: true
---

## Running Locally

You can run the Service Registry using Maven directly or via the standalone Docker Compose file.

{{< tabs tabTotal="2" >}}
{{% tab tabName="Maven / Local" %}}
Requires Java 17 and Maven installed.

```bash {linenos=table, anchorlinenos=true}
# Clone the repository
git clone https://github.com/Event-Based-Banking-Application/arya-banking-service-registry.git
cd arya-banking-service-registry

# Run via Spring Boot plugin
mvn spring-boot:run
```
{{% /tab %}}

{{% tab tabName="Docker Compose (Platform Stack)" %}}
Requires Docker and Docker Compose. The Service Registry is deployed as part of the platform stack via `arya-banking-infra`.

```bash {linenos=table, anchorlinenos=true}
# From the arya-banking-infra directory
make platform

# Or directly:
docker compose -f compose/platform.yml up -d

# View live logs
docker compose -f compose/platform.yml logs -f
```
{{% /tab %}}
{{< /tabs >}}

---

## Important Endpoints

Once the service is running, it binds to port `8761` by default.

{{< table "table-striped table-sm" >}}

| URL | Description |
|-----|-------------|
| `http://localhost:8761` | **Eureka Dashboard** — UI listing all registered instances and lease status. |
| `http://localhost:8761/eureka/apps` | REST endpoint returning the full registry in XML/JSON format. |
| `http://localhost:8761/actuator/health` | Spring Actuator health check (returns `{"status":"UP"}`). |
| `http://localhost:8761/actuator` | Lists all available actuator management endpoints. |
{{< /table >}}
