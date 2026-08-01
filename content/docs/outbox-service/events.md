---
title: "Events & Data Model"
description: "The OutboxEvent record model, the OutboxKafkaEvent Avro schema, and how services publish through the outbox."
icon: "database"
weight: 400
toc: true
---

## OutboxEvent (persisted model)

The abstract `OutboxEvent` model comes from `arya-banking-common` and is persisted in a **Mongo collection per concrete entity** (e.g., `user_outbox` in user-service):

{{< table "table-striped table-sm" >}}
| Field | Description |
|---|---|
| `id` | Record identifier |
| `aggregateId` | Business aggregate the event belongs to — also the Kafka message key |
| `eventType` | Logical event type (e.g., `USER_INSERT`) |
| `payload` | Event payload |
| `topic` | Target Kafka topic, stored per event on the record |
| `outboxStatus` | `OutboxStatus` enum: `PENDING`, `COMPLETED`, `FAILED`, `RETRY_PENDING` |
| `retryCount` | Number of publish attempts so far |
{{< /table >}}

## OutboxKafkaEvent (Avro schema)

The Avro message published to Kafka, defined in `org.arya.banking.common.avro`:

{{< table "table-striped table-sm" >}}
| Field | Type |
|---|---|
| `aggregateId` | `string` |
| `eventType` | `string` |
| `payload` | `string` |
{{< /table >}}

---

## Publishing Flow

The outbox record is written **inside the same `@Transactional` method** as the business write, so both commit or roll back together:

```java
@Transactional
public void createUser(User user) {
    mongoTemplate.save(user);

    UserOutboxEvent outboxEvent = UserOutboxEvent.builder()
        .aggregateId(user.getId())
        .eventType("USER_INSERT")
        .topic("arya-user-svc-usr-update")
        .payload(serialize(user))
        .outboxStatus(OutboxStatus.PENDING)
        .retryCount(0)
        .build();

    userOutboxRepository.save(outboxEvent);
}
```

## Concrete Repository

Services provide a concrete repository interface that narrows the generic contract to their entity:

```java
public interface UserOutboxRepository extends OutboxEventRepository<UserOutboxEvent> {
}
```

{{< alert context="info" text="The topic is stored per-event on the outbox record (event.getTopic()) — it is not a fixed constant. Current usage: user-service publishes eventType USER_INSERT to topic arya-user-svc-usr-update." />}}
