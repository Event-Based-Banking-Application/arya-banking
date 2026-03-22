---
title: "Entry Point"
description: "Dissection of the main application class and its configuration annotations."
icon: "code"
weight: 150
toc: true
---

## Main Application Class

The `AryaBankingAuthServiceApplication` class is the root of the microservice. It uses standard Spring Cloud annotations for service discovery and inter-service communication.

```java {linenos=table, anchorlinenos=true}
@SpringBootApplication(exclude = {
    DataSourceAutoConfiguration.class,
    DataSourceTransactionManagerAutoConfiguration.class,
    HibernateJpaAutoConfiguration.class
})
@EnableDiscoveryClient
@ComponentScan(basePackages = {"org.arya.banking.auth", "org.arya.banking.common"})
@EnableFeignClients(defaultConfiguration = OAuth2FeignConfig.class)
public class AryaBankingAuthServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(AryaBankingAuthServiceApplication.class, args);
    }
}
```

---

## Key Configurations

### 1. JPA Exclusion
Since the Auth Service does not directly interact with a relational database—all identity operations are proxied through Keycloak—standard JPA and transaction management auto-configurations are excluded.

### 2. Service Discovery
The `@EnableDiscoveryClient` annotation registers the microservice with the Eureka server as `arya-banking-auth-service`.

### 3. Feign Client Security
The `@EnableFeignClients` annotation is configured with `OAuth2FeignConfig.class` to ensure that all outgoing service calls are automatically authenticated using the platform's OAuth2 standards.

---

## Package Scanning

The application explicitly scans both its own package (`org.arya.banking.auth`) and the common package (`org.arya.banking.common`) to ensure all shared components, like the global exception handler, are correctly loaded.

{{< alert context="info" text="This service does not use MongoDB auditing or JPA, as it relies entirely on the Keycloak Admin API for persistence." />}}
