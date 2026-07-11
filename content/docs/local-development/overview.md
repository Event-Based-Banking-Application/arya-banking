---
title: "Overview"
description: "Introduction to the local development environment for the Arya Banking platform."
icon: "info"
weight: 100
toc: true
---

This guide walks you through setting up the entire Arya Banking platform on your local machine. The platform consists of **9 interconnected repositories** and depends on several infrastructure services (Kafka, Keycloak, Vault) that run in Docker.

---

## Quick Start

```powershell
# 1. Clone the infra repo and start all Docker services
git clone https://github.com/Event-Based-Banking-Application/arya-banking-infra.git
cd arya-banking-infra
make up
make vault-unseal

# 2. Build the shared library
cd ../arya-banking-common
mvn clean install -DskipTests

# 3. Build and run a business service
cd ../arya-banking-user-service
mvn clean spring-boot:run -DskipTests
```

For full instructions, use the navigation sidebar or follow the numbered pages in order.

---

## Prerequisites

{{< table "table-striped" >}}
| Tool | Version | Purpose |
|------|---------|---------|
| **Java** | 17+ | Runtime for all Spring Boot services |
| **Maven** | 3.9+ | Build and dependency management |
| **Docker Desktop** | Latest | Run infrastructure containers |
| **Git** | Latest | Clone repositories |
| **PowerShell** | 5.1+ | Automation scripts (Vault unseal, etc.) |
{{< /table >}}

### Verify Installations

```powershell
java -version
mvn -version
docker --version
git --version
```

---

## Startup Order

```text
1. Docker Infrastructure (make up)                     ─┐
2. Vault unseal (make vault-unseal)                    ─┤ Docker
3. Common library build (mvn install)                  ─┤ Host
4. Service Registry (Docker)          → port 8761      ─┤
5. Config Server (Docker)             → port 8090      ─┤
6. API Gateway (Docker)               → port 8085      ─┘
7. User Service (local)               → port 8086      ─┐
8. Auth Service (local)               → port 8087      ─┤ Host
9. Admin Service (local)              → port 8089      ─┘
```

---

## Reference Links

- [Clone Repositories]({{< ref "clone-repos" >}})
- [GitHub Packages Authentication]({{< ref "github-auth" >}})
- [Start Infrastructure]({{< ref "start-infra" >}})
- [Bootstrap Vault]({{< ref "vault-bootstrap" >}})
- [Configure Keycloak]({{< ref "keycloak-config" >}})
- [Create Vault Credentials]({{< ref "vault-credentials" >}})
- [Build and Run Services]({{< ref "build-and-run" >}})
- [Verify the Platform]({{< ref "verify" >}})
- [Troubleshooting]({{< ref "troubleshooting" >}})
