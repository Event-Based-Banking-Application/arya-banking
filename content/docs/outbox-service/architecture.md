---
title: "Architecture"
description: "How the outbox starter relays atomic Mongo writes to Kafka — components, status lifecycle, and wiring."
icon: "hub"
weight: 200
toc: true
---

## System Flow

```mermaid
flowchart TD
    BS["Business Service"] -->|"1. TX: write business + outbox record"| MG[("MongoDB")]
    OP["OutBoxPublisherService<br/>(@Scheduled)"] -->|"2. poll PENDING / RETRY_PENDING"| MG
    OP -->|"3. publish to Kafka, mark COMPLETED"| KF["Kafka Cluster"]
```

1. A business write and its outbox record are committed **in the same Mongo transaction**.
2. `OutBoxPublisherService` polls records in `PENDING` / `RETRY_PENDING` status on a fixed delay.
3. Records are published to Kafka via the `OutboxEventProducer`; success marks them `COMPLETED`.

---

## Components

{{< table "table-striped table-sm" >}}
| Component | Responsibility |
|---|---|
| `OutboxAutoConfiguration` | Registers `KafkaTemplate<String,OutboxKafkaEvent>`, `OutboxEventProducer`, and `@EnableScheduling`. Conditional on `arya.outbox.enabled=true`. Registered via `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`. |
| `OutboxProperties` | `@ConfigurationProperties("arya.outbox")` — interval, retries, enable flag. |
| `OutBoxPublisherService<T>` | Generic relay. `@Scheduled(fixedDelayString = "${arya.outbox.publish-interval-ms:5000}")`. `publishPendingAndRetry()` fetches `findByOutboxStatusIn([PENDING, RETRY_PENDING])`, sends via the producer **keyed by `aggregateId`**. Success → `COMPLETED`; exception → `RETRY_PENDING`. `handleEventUpdate` increments `retryCount` and marks `FAILED` when retries reach `maxRetries`. |
| `OutboxEventProducer` | Thin wrapper around `KafkaTemplate<String,OutboxKafkaEvent>`. |
| `OutboxEventRepository<T>` | `@NoRepositoryBean` MongoRepository contract exposing `findByOutboxStatusIn(...)`. |
{{< /table >}}

---

## Status Lifecycle

```mermaid
flowchart LR
    P["PENDING"] -->|"publish OK"| C["COMPLETED"]
    P -->|"publish failed"| R["RETRY_PENDING"]
    R -->|"retry < maxRetries"| P
    R -->|"retries >= maxRetries"| F["FAILED"]
```

- The producer **keys messages by `aggregateId`**, so all events for one aggregate land in the same Kafka partition — preserving per-aggregate ordering.
- Retries are bounded: a record loops `PENDING ↔ RETRY_PENDING` until `retryCount` hits `maxRetries`, then becomes `FAILED`.

{{< alert context="warning" text="FAILED records are terminal — they are no longer polled. Monitor the Mongo outbox collection (or add alerting) for records stuck in FAILED, since they represent events that were never published." />}}
