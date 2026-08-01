---
title: "CI/CD & Deployment"
description: "GitHub Actions workflows for the Auth Service."
icon: "build"
weight: 1000
toc: true
---

## GitHub Actions Workflows

The `arya-banking-auth-service` utilizes standardized CI/CD pipelines defined within the organization.

---

## Deployment Strategy

The service is deployed as a Docker container image, integrated into the platform's microservice mesh.

| Environment | Mechanism |
|---|---|
| **Development** | Manual `mvn spring-boot:run` or local Docker Compose. |
| **Testing/Staging** | CI-triggered deployment to environment-specific clusters. |

---

## Required Deployment Secrets

Ensure the following secrets are configured in the repository's settings:

| Secret | Description |
|---|---|
| `GH_PAT` | Personal Access Token for GitHub Packages access. |

{{< alert context="info" text="Deployment workflows typically handle version tagging and JAR production following successful execution of the test suite." />}}
