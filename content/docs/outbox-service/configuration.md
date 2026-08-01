---
title: "Configuration"
description: "All arya.outbox.* properties, a full application.yaml example, and required infrastructure endpoints."
icon: "tune"
weight: 300
toc: true
---

## Properties

All configuration is namespaced under `arya.outbox.*`:

{{< table "table-striped table-sm" >}}
| Property | Default | Description |
|---|---|---|
| `arya.outbox.enabled` | `true` | Set `false` to disable auto-configuration **and** the scheduler. |
| `arya.outbox.publish-interval-ms` | `5000` | Fixed delay (ms) between poll attempts. `user-service` uses `10000`. |
| `arya.outbox.max-retries` | `3` | Max publish attempts before a record is marked `FAILED`. `user-service` uses `5`. |
{{< /table >}}

---

## Example

```yaml
arya:
  outbox:
    enabled: true
    publish-interval-ms: 10000
    max-retries: 5
```

---

## Required Infrastructure

The starter publishes Avro records, so it assumes the consuming service already provides:

- `spring.kafka.bootstrap-servers` — Kafka broker addresses.
- `schema.registry.url` — the Confluent Schema Registry, because the producer uses the **Confluent `KafkaAvroSerializer`**.
- `spring.data.mongodb.uri` — Mongo connection for the outbox collection.

{{< alert context="info" text="Only enable the outbox starter in services that actually publish events. For plain consumers, set arya.outbox.enabled=false to avoid a pointless scheduler loop and unused Kafka producer." />}}
