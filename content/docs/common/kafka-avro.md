---
title: "Kafka & Avro Messaging"
description: "Shared event schemas and Kafka configuration patterns."
icon: "send"
weight: 300
toc: true
---

## Messaging Architecture

The Arya Banking platform uses **Apache Kafka** with **Avro** for all asynchronous inter-service communication. This ensures type safety and schema compatibility across the ecosystem.

---

## Avro Schemas

Schemas are defined in the common library and auto-compiled into Java classes.

### 1. Audit Event (`Audit.avsc`)
Used to track system-wide actions for auditing purposes.
* **Topic**: `audit.event`
* **Key Fields**: `actionType`, `targetTable`, `targetId`, `userId`, `details`.

### 2. User Create Event (`UserCreateEvent.avsc`)
Triggered when a new user finishes the registration flow.
* **Topic**: `user.create.event`
* **Key Fields**: `userId`, `status`, `isEmailVerified`.

---

## Kafka Configuration

The library provides a pre-configured `KafkaConfiguration` class that activates if a bootstrap server is provided in the properties.

### Producer Pattern
Use the shared `KafkaTemplate<String, Object>` for sending events. It is pre-wired with the `KafkaAvroSerializer`.

### Consumer Pattern
To consume events, services should use the `kafkaListerFactory(groupId)` helper:

```java
@Bean
public ConcurrentKafkaListenerContainerFactory<String, UserCreateEvent> userEventFactory() {
    return kafkaConfiguration.kafkaListerFactory("your-service-group");
}
```

---

## Topic Constants

Always use `KafkaConstants` for topic names to avoid typos:
* `KafkaConstants.AUDIT_EVENT` -> `"audit.event"`
* `KafkaConstants.USER_CREATE_EVENT` -> `"user.create.event"`

{{< alert context="warning" text="Ensure the Confluent Schema Registry URL is correctly configured in your `application.yaml` for Avro serialisation to work." />}}
