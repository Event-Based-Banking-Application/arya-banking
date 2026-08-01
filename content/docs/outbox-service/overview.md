---
title: "Overview"
description: "What arya-banking-outbox-service is, why the transactional outbox pattern matters, and its feature set."
icon: "info"
weight: 100
toc: true
---

## What is the Outbox Service?

The `arya-banking-outbox-service` is a **Spring Boot starter library** that implements the **Transactional Outbox Pattern** for reliable, at-least-once Kafka publishing across the Arya Banking ecosystem. It is a shared building block consumed by services that need to publish events without sacrificing data consistency.

It depends on `arya-banking-common`, which provides the core domain types:

- `OutboxEvent` — the abstract outbox record model
- `OutboxKafkaEvent` — the Avro message published to Kafka
- `OutboxStatus` — the record lifecycle enum (`PENDING`, `COMPLETED`, `FAILED`, `RETRY_PENDING`)

---

## Why the Outbox Pattern?

Without an outbox, a service that writes business state to MongoDB and then publishes to Kafka faces the **dual-write problem** — if one write succeeds and the other fails, the system is left inconsistent.

The outbox pattern solves this:

- Business state and the outbox record are written **atomically in the same Mongo transaction**.
- A background scheduler relays pending outbox records to Kafka.
- **No distributed transaction** is required — Kafka delivery is retried independently of the business write.

The result is a simple, crash-safe guarantee: **at-least-once** event publishing with no dual-write window.

---

## Coordinates

{{< table "table-striped table-sm" >}}
| Property | Value |
|---|---|
| **Artifact** | `org.arya.banking:arya-banking-outbox-service` |
| **Version** | `1.0.0` |
| **Java** | `17` |
| **Spring Boot** | `3.5.4` |
| **Common Library** | `arya-banking-common:1.2.3` |
| **Distribution** | `arya-banking-maven-registry` (GitHub Packages) |
{{< /table >}}

---

## Features

- **Spring Boot auto-configuration** — zero wiring required; the starter registers everything on the classpath.
- **Generic `OutboxEventRepository<T>`** — works with any concrete outbox entity.
- **`@Scheduled` relay** — polls pending records on a fixed interval and publishes to Kafka.
- **Bounded retry** — failed publishes are retried up to `max-retries`, then marked `FAILED`.
- **Avro `OutboxKafkaEvent`** — structured, schema-versioned Kafka messages.
- **Property-driven** — all knobs exposed via `arya.outbox.*` properties.
- **Opt-out** — disable entirely with `arya.outbox.enabled=false`.

{{< alert context="info" text="The library is published to GitHub Packages via the arya-banking-maven-registry, so services import it through the shared BOM and repositories block." />}}
