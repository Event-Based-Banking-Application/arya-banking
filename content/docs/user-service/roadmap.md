---
title: "Roadmap"
description: "Current development status and future enhancement roadmap for the User Service."
icon: "map"
weight: 1100
toc: true
---

## Development Status

The User Service is currently in its core development phase. Most primary life-cycle features are implemented.

### Implemented Features
- [x] Basic user registration (Step 1)
- [x] Email and Contact form validation
- [x] Duplicate email/phone checks
- [x] Multi-step registration state tracking
- [x] Persistent address management
- [x] Keycloak synchronization via Auth Service
- [x] Kafka event publishing (`user-create-event`)
- [x] Account locking after 5 failed login attempts

---

## Future Roadmap

The following tasks are planned for upcoming sprints:

| Feature | Description | Priority |
|---|---|---|
| **Email Verification** | Integration with a mail service to verify user emails. | High |
| **Contact Verification** | OTP-based verification for mobile numbers. | High |
| **Soft Deletion** | Implementation of GDPR-compliant user soft-delete. | Medium |
| **Hard Deletion** | Complete removal of user data after a grace period. | Low |
| **Audit Log Consumer** | Consuming audit events to provide a user activity dashboard. | Medium |
| **User Profile UI** | A dedicated frontend page for managing the profile. | Medium |
