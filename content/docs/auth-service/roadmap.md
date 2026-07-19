---
title: "Roadmap"
description: "Current development status and future features for the Auth Service."
icon: "map"
weight: 1100
toc: true
---

## Feature Status

The Auth Service provides the foundational authentication and identity integration for the Arya Banking platform.

### Implemented Features
- [x] Keycloak Admin SDK integration for user management.
- [x] Secure `client_credentials` delegation for inter-service communication.
- [x] Pooled `RestTemplate` for high-performance authentication.
- [x] Cross-service account locking orchestration.
- [x] Centralized identity registration bridge.

---

## Technical Debt and Roadmap

The following enhancements are prioritized for upcoming development cycles:

| Feature | Description | Priority |
|---|---|---|
| **OAuth2 Code Grant** | Transition from `password` grant to Authorization Code + PKCE for browser-based logins. | High |
| **Multi-Factor Auth** | Integration of OTP verification during the authentication flow. | High |
| **Token Introspection** | Implementing a localized token introspection cache for better performance. | Medium |
| **Audit Integration** | Publishing authentication success/failure events to the platform's audit trail. | Medium |

---

## Issue Backlog (`issues.json`)

The development roadmap is maintained within the repository as a structured JSON file, which can be automatically converted into trackable GitHub Issues.

- **Authentication Logic**: 15 planned tasks.
- **Cross-Cutting Concerns**: 9 integration and infrastructure tasks.

{{< alert context="info" text="Refer to the <code>auto-create-issues.yaml</code> workflow documentation to sync the backlog with GitHub Issues." />}}
