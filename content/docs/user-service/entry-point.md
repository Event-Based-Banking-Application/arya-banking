---
title: "Entry Point"
description: "Deep dive into the main application class and its configurations."
icon: "code"
weight: 150
toc: true
---

## Main Application Class

The service entry point is `AryaBankingUserServiceApplication.java`. It uses several annotations to wire together the platform-standard features.

```java {linenos=table, anchorlinenos=true}
@SpringBootApplication(exclude = {
    DataSourceAutoConfiguration.class,
    DataSourceTransactionManagerAutoConfiguration.class,
    HibernateJpaAutoConfiguration.class
})
@ComponentScan(basePackages = {"org.arya.banking.user", "org.arya.banking.common"})
@EnableMongoAuditing
@EnableDiscoveryClient
@EnableFeignClients(defaultConfiguration = OAuth2FeignConfig.class)
public class AryaBankingUserServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(AryaBankingUserServiceApplication.class, args);
    }
}
```

---

## Configuration Breakdown

### 1. JPA Exclusion
Since this service uses **MongoDB exclusively**, all JDBC/Hibernate auto-configurations are disabled to prevent startup failures.

### 2. Component Scanning
The application scans both its own package and `org.arya.banking.common`. This ensures that shared beans like the `GlobalExceptionHandler`, `KafkaConfiguration`, and `MongoConfig` are correctly registered.

### 3. MongoDB Auditing
`@EnableMongoAuditing` activates Spring Data's auditing features, automatically populating `@CreatedDate` and `@LastModifiedDate` fields in entities like `User` and `SecurityDetails`.

### 4. Feign & OAuth2
`@EnableFeignClients` is configured with `OAuth2FeignConfig` as the default, ensuring all inter-service communication (e.g., to the Auth Service) is automatically authenticated.

---

## Startup Warm-up

The service includes a `KafkaWarnUp` component that forces a connection to the Kafka broker during startup:

```java
@PostConstruct
public void init() {
    producerFactory.createProducer().close();
    log.info("Kafka connection established");
}
```

{{< alert context="success" text="This ensures that misconfigurations in Kafka connectivity are detected immediately upon service start, rather than failing on the first user registration." />}}
