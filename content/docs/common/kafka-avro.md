---
title: "Kafka & Avro Messaging"
description: "Shared event schemas, Kafka topic catalog, and producer/consumer configuration patterns."
icon: "send"
weight: 300
toc: true
---

## Messaging Architecture

The Arya Banking platform uses **Apache Kafka** with **Confluent Avro** for all asynchronous inter-service communication. This ensures type safety and schema compatibility across the ecosystem via the **Confluent Schema Registry**.

All schemas are defined in `arya-banking-common` (`src/main/avro`, namespace `org.arya.banking.common.avro`) and auto-compiled into Java classes by the `avro-maven-plugin` during `generate-sources`.

---

## Topic Catalog

Topic names are centralized in `KafkaConstants` (`org.arya.banking.common.constants.kafka`):

{{< table "table-striped table-sm" >}}
| Constant | Topic | Schema | Current Producer | Consumers |
|---|---|---|---|---|
| `USER_CREATE_EVENT` | `user.create.event` | `UserCreateEvent` | — (defined, not yet sent) | None yet |
| `AUDIT_EVENT` | `audit.event` | `AuditEvent` | — (defined, not yet sent) | None yet |
| *(per-event)* | `arya-user-svc-usr-update` | `OutboxKafkaEvent` | **user-service** (outbox relay) | None yet |
{{< /table >}}

{{< alert context="warning" text="The platform is currently <b>producer/outbox-only</b>. No <code>@KafkaListener</code> consumers exist yet, and <code>user.create.event</code>/<code>audit.event</code> are reserved constants. The only topic actually written today is the user-service outbox topic <code>arya-user-svc-usr-update</code>. Note the outbox topic name is stored <b>per event</b> on the outbox record (<code>event.topic</code>), not in <code>KafkaConstants</code>." />}}

---

## Avro Schemas

### 1. Audit Event (`AuditEvent.avsc`)
Tracks system-wide actions for auditing purposes.
* **Topic**: `audit.event`
* **Fields**: `actionType`, `targetTable`, `targetId`, `userId`, `changeType`, `details` (all strings)

### 2. User Create Event (`UserCreateEvent.avsc`)
Triggered when a new user finishes the registration flow.
* **Topic**: `user.create.event`
* **Fields**: `userId` (string), `status` (string), `isEmailVerified` (boolean, default `false`), `isContactVerified` (boolean, default `false`)

### 3. Outbox Kafka Event (`OutboxKafkaEvent.avsc`)
Envelope used by the **outbox pattern** relay (`arya-banking-outbox-service`) to publish pending events to Kafka.
* **Topic**: per-event (`event.topic` — e.g. `arya-user-svc-usr-update`)
* **Fields**: `aggregateId` (string), `eventType` (string), `payload` (string — serialized payload, e.g. JSON of `UserCreateEvent`)

---

## Kafka Configuration

The library provides a pre-configured `KafkaConfiguration` class (`@ConditionalOnProperty("spring.kafka.bootstrap-servers")`) that wires producers and consumers:

* **Producer**: `StringSerializer` key + Confluent `KafkaAvroSerializer` value; reads `spring.kafka.bootstrap-servers` and `spring.kafka.properties.schema.registry.url`.
* **Consumer factory**: `kafkaListerFactory(groupId)` helper returning a `ConcurrentKafkaListenerContainerFactory` with `StringDeserializer` + `KafkaAvroDeserializer`, `AUTO_OFFSET_RESET=earliest`, `SPECIFIC_AVRO_READER=true`, and the given consumer group.

### Producer Pattern
Use the shared `KafkaTemplate<String, Object>` for sending events — it is pre-wired with the `KafkaAvroSerializer`:

```java
kafkaTemplate.send("user.create.event", aggregateId, event);
```

### Consumer Pattern
To consume events, services use the `kafkaListerFactory(groupId)` helper:

```java
@Bean
public ConcurrentKafkaListenerContainerFactory<String, UserCreateEvent> userEventFactory() {
    return kafkaConfiguration.kafkaListerFactory("your-service-group");
}
```

### Key Configuration Properties
* `spring.kafka.bootstrap-servers` — `localhost:9092` (host) / `kafka:29092` (Docker)
* `spring.kafka.properties.schema.registry.url` — `http://localhost:8081` (Confluent Schema Registry, BACKWARD compatibility)

---

## Topic Constants

Always use `KafkaConstants` for topic names to avoid typos:
* `KafkaConstants.AUDIT_EVENT` -> `"audit.event"`
* `KafkaConstants.USER_CREATE_EVENT` -> `"user.create.event"`

{{< alert context="warning" text="Ensure the Confluent Schema Registry URL is correctly configured in your `application.yaml` for Avro serialisation to work." />}}
