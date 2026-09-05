# Event-Based Banking Application

Event-driven microservices platform modelling the core backend of a digital banking application.

**Stack**: Spring Boot 3.5.4 · Spring Cloud 2025.0.0 · Java 17 · MongoDB · Kafka · Keycloak · HashiCorp Vault · Eureka

## Repositories

| Repository | Description |
|---|---|
| [arya-banking-common](https://github.com/Event-Based-Banking-Application/arya-banking-common) | Multi-module shared library (core, mongo, kafka, feign, oauth2) |
| [arya-banking-bom](https://github.com/Event-Based-Banking-Application/arya-banking-bom) | Bill of Materials — centralized dependency versions |
| [arya-banking-common-metadata-loader](https://github.com/Event-Based-Banking-Application/arya-banking-common-metadata-loader) | Standalone schema versioning tool |
| [arya-banking-outbox-service](https://github.com/Event-Based-Banking-Application/arya-banking-outbox-service) | Transactional outbox pattern starter library |
| [arya-banking-maven-registry](https://github.com/Event-Based-Banking-Application/arya-banking-maven-registry) | GitHub Packages Maven endpoint |
| [arya-banking-service-registry](https://github.com/Event-Based-Banking-Application/arya-banking-service-registry) | Eureka service discovery |
| [arya-banking-config-server](https://github.com/Event-Based-Banking-Application/arya-banking-config-server) | Spring Cloud Config Server |
| [arya-banking-api-gateway](https://github.com/Event-Based-Banking-Application/arya-banking-api-gateway) | Reactive API gateway |
| [arya-banking-user-service](https://github.com/Event-Based-Banking-Application/arya-banking-user-service) | User domain service |
| [arya-banking-auth-service](https://github.com/Event-Based-Banking-Application/arya-banking-auth-service) | Identity bridge (Keycloak) |
| [arya-banking-admin-service](https://github.com/Event-Based-Banking-Application/arya-banking-admin-service) | Infrastructure administration |
| [arya-banking-infra](https://github.com/Event-Based-Banking-Application/arya-banking-infra) | Docker Compose infrastructure |
| [arya-banking-configs](https://github.com/Event-Based-Banking-Application/arya-banking-configs) | Centralized Git-backed configuration |
| [arya-banking](https://github.com/Event-Based-Banking-Application/arya-banking) | Documentation site (Hugo) |

## Architecture

```text
                    ┌─────────────┐
                    │ API Gateway │ :8085
                    └──────┬──────┘
           ┌───────────────┼───────────────┐
           │               │               │
    ┌──────┴──────┐ ┌──────┴──────┐ ┌──────┴──────┐
    │ User Service│ │ Auth Service│ │Admin Service│
    │    :8086    │ │    :8087    │ │    :8089    │
    └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
           │               │               │
           └───────┬───────┴───────┬───────┘
                   │               │
            ┌──────┴──────┐ ┌──────┴──────┐
            │    Kafka    │ │   MongoDB   │
            │   :9092     │ │   :27017    │
            └─────────────┘ └─────────────┘
```

## Getting Started

See the [Local Development Guide](https://event-based-banking-application.github.io/arya-banking/docs/local-development/) for full setup instructions.

```sh
# Clone infrastructure
git clone https://github.com/Event-Based-Banking-Application/arya-banking-infra.git
cd arya-banking-infra
make up

# Clone configs
git clone https://github.com/Event-Based-Banking-Application/arya-banking-configs.git
```

## Documentation

Full docs: [https://event-based-banking-application.github.io/arya-banking/](https://event-based-banking-application.github.io/arya-banking/)
