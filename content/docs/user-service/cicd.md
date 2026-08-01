---
title: "CI/CD"
description: "GitHub Actions workflows for the User Service repository."
icon: "build"
weight: 1000
toc: true
---

## Overview

The `arya-banking-user-service` repository defines its CI/CD workflows under `.github/workflows/`.

---

## Workflows

### 1. Service Deployment (`deploy.yml`)
Builds and pushes the service as a JAR and Docker image to GitHub Packages.
- **Goal**: Artifact creation and versioned tagging.
- **Triggers**: Push to `main`.
- **Pre-requisite**: Success of unit/integration tests.

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
