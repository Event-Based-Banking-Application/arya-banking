---
title: "CI/CD"
description: "GitHub Actions workflows for the User Service repository."
icon: "build"
weight: 1000
toc: true
---

## Overview

The `arya-banking-user-service` utilizes shared workflows defined in the `arya-banking-workflows` repository.

---

## Workflows

### 1. SonarCloud Analysis (`sonar-report.yml`)
Runs on every push or pull request to the `main` branch.
- **Goal**: Code quality, test coverage, and security hotspot analysis.
- **Triggers**: Automated.
- **Artifacts**: Reports published to SonarCloud.

### 2. Service Deployment (`deploy.yml`)
Builds and pushes the service as a JAR and Docker image to GitHub Packages.
- **Goal**: Artifact creation and versioned tagging.
- **Triggers**: Push to `main`.
- **Pre-requisite**: Success of unit/integration tests.

### 3. Issue Management (`auto-create-issues.yaml`)
Automates the creation of GitHub items from `issues.json`.
- **Goal**: Synchronize project backlog with repo issues.
- **Triggers**: Manual dispatch.

---

## Bulk Cleanup Utility

The User Service repository includes a specialized workflow for cleaning up project history:

### `delete-all-issues.yaml`
A utility workflow that deletes all issues and milestones via the GitHub REST API.

{{% alert icon="🔥" context="danger" %}}
**Warning:** This is a destructive action. It requires a manual confirmation by typing `DELETE-ALL-ISSUES` as a workflow input.
{{% /alert %}}

---

## Required Secrets

For the pipelines to function, the following secrets must be configured in the GitHub repository:

| Secret | Description |
|---|---|
| `GH_PAT` | Personal Access Token for GitHub Packages and tag pushing |
| `SONAR_TOKEN` | Token for SonarCloud authentication |
| `ORG_ISSUE_TOKEN` | Token with permissions to create/delete issues across the org |
