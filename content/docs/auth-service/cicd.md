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

### 1. Quality Control (`sonar-report.yml`)
Runs on every push or pull request to the `main` branch.

- **Goal**: Perform static code analysis and test coverage reporting.
- **Triggers**: Automated.
- **Artifacts**: Reports are pushed to SonarCloud.

---

### 2. Backlog Sync (`auto-create-issues.yaml`)
Automates the synchronization of the project's development tasks from `issues.json`.

- **Goal**: Ensure the GitHub Issues backlog is in sync with the repository's roadmap.
- **Triggers**: Manual dispatch or automated intervals.

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
| `SONAR_TOKEN` | Authentication token for SonarCloud reporting. |
| `ORG_ISSUE_TOKEN` | Token with permissions to create issues across the GitHub organization. |
| `GH_PAT` | Personal Access Token for GitHub Packages access. |

{{< alert context="info" text="Deployment workflows typically handle version tagging and JAR production following successful execution of the test suite." />}}
