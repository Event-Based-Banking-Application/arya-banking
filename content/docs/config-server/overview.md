---
title: "Overview"
description: "High-level introduction to the Config Server and its backing repository."
icon: "info"
weight: 100
toc: true
---

## Repositories

The configuration layer consists of two tightly coupled repositories:

{{< table "table-striped table-sm" >}}

| Repository | Role | Port |
|---|---|---|
| `arya-banking-configs` | Git repository holding all shared `application.yml` and per-service config files. | N/A |
| `arya-banking-config-server` | Spring Cloud Config Server that reads from the config repo and exposes properties over HTTP. | `8090` |

{{< /table >}}

`arya-banking-config-server` is a Spring Cloud Config Server that reads property files from the `arya-banking-configs` Git repository and serves them over HTTP to all microservices. It registers itself with Eureka, so clients can discover it by name instead of hardcoding a URL.
