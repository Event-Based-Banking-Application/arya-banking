---
title: "Clone Repositories"
description: "Clone all repositories required for the Arya Banking platform."
icon: "download"
weight: 200
toc: true
---

Create a root folder and clone all repositories:

```powershell
mkdir arya-banking-platform
cd arya-banking-platform

# Core platform
git clone https://github.com/Event-Based-Banking-Application/arya-banking.git
git clone https://github.com/Event-Based-Banking-Application/arya-banking-infra.git
git clone https://github.com/Event-Based-Banking-Application/arya-banking-common.git

# Shared libraries
git clone https://github.com/Event-Based-Banking-Application/arya-banking-outbox-service.git
git clone https://github.com/Event-Based-Banking-Application/arya-banking-maven-registry.git

# Platform services
git clone https://github.com/Event-Based-Banking-Application/arya-banking-service-registry.git
git clone https://github.com/Event-Based-Banking-Application/arya-banking-config-server.git
git clone https://github.com/Event-Based-Banking-Application/arya-banking-api-gateway.git

# Business services
git clone https://github.com/Event-Based-Banking-Application/arya-banking-user-service.git
git clone https://github.com/Event-Based-Banking-Application/arya-banking-auth-service.git
git clone https://github.com/Event-Based-Banking-Application/arya-banking-admin-service.git

# Configs (centralized Spring Cloud Config repository)
git clone https://github.com/Event-Based-Banking-Application/arya-banking-configs.git
```

{{< alert context="info" text="To build and run services locally you only need: <code>arya-banking-infra</code>, <code>arya-banking-common</code>, <code>arya-banking-outbox-service</code>, and the business services. The <code>arya-banking-maven-registry</code> repo is required only when publishing artifacts." />}}

---

## Repository Map

```text
arya-banking-platform/
│
├── arya-banking-infra/              ← Docker Compose infra (Kafka, Keycloak, Vault)
├── arya-banking-configs/            ← Centralized Git-backed configuration
│
├── arya-banking-common/             ← Shared Maven library (published to GitHub Packages)
├── arya-banking-outbox-service/     ← Outbox pattern starter library
├── arya-banking-maven-registry/     ← GitHub Packages Maven registry anchor
│
├── arya-banking-service-registry/   ← Eureka Server (Discovery)
├── arya-banking-config-server/      ← Spring Cloud Config Server
├── arya-banking-api-gateway/        ← Reactive entry point
│
├── arya-banking-user-service/       ← User domain
├── arya-banking-auth-service/       ← Identity bridge
└── arya-banking-admin-service/      ← Infrastructure admin
```

---

## Branch Recommendations

Use the **default branch** for each repository unless you are working on a specific feature. Keep all repositories on the same branch to avoid compatibility issues.
