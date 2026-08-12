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
public ConcurrentKafkaListenerContainerFactory<String, UserCreateEvent> userEventFactory(
        KafkaConfiguration kafkaConfiguration) {
    return kafkaConfiguration.kafkaListerFactory("your-service-group");
}
```

### Reusing the Shared Producer & Consumer

The `KafkaConfiguration` beans are registered for **every** service that has `arya-banking-common` on the classpath and sets `spring.kafka.bootstrap-servers` — do not define a second producer or consumer stack in that case:

- **Producer**: inject the pre-wired `KafkaTemplate<String, Object>` (or the outbox starter's `OutboxEventProducer`) directly. One `ProducerFactory` per JVM is enough; the [outbox starter]({{< ref "/docs/outbox-service/getting-started" >}}) reuses this same factory to build its typed `KafkaTemplate<String,OutboxKafkaEvent>`.
- **Consumer**: create one `ConcurrentKafkaListenerContainerFactory` per consumer group via `kafkaListerFactory("<groupId>")` — this is a cheap factory wrapper, not a second connection.

### If the Beans Are Not Present

The library's `KafkaConfiguration` is inactive when `spring.kafka.bootstrap-servers` is not set, and services that intentionally exclude `arya-banking-common` have no beans at all. In that case, wire the serializer classes manually (`KafkaConstants` provides the fully-qualified names):

```java
@Configuration
public class KafkaFallbackConfig {

    @Value("${spring.kafka.bootstrap-servers}")
    private String bootstrapServers;

    @Value("${spring.kafka.properties.schema.registry.url}")
    private String schemaRegistryUrl;

    @Bean
    public ProducerFactory<?, ?> producerFactory() {
        Map<String, Object> props = new HashMap<>();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put("schema.registry.url", schemaRegistryUrl);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, KafkaAvroSerializer.class);
        return new DefaultKafkaProducerFactory<>(props);
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<?, ?> listenerFactory() {
        Map<String, Object> props = new HashMap<>();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, "your-service-group");
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, KafkaAvroDeserializer.class);
        props.put(KafkaAvroDeserializerConfig.SPECIFIC_AVRO_READER_CONFIG, true);
        props.put("schema.registry.url", schemaRegistryUrl);

        ConcurrentKafkaListenerContainerFactory<?, ?> factory =
            new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(new DefaultKafkaConsumerFactory<>(props));
        return factory;
    }
}
```

{{< alert context="warning" text="Define a setting bean only once per application context — multiple <code>ProducerFactory</code>/<code>KafkaTemplate</code> beans for the same cluster waste connections and can confuse <code>@ConditionalOnMissingBean</code> logic. Prefer reusing the shared beans over re-defining them." />}}

### Key Configuration Properties
* `spring.kafka.bootstrap-servers` — `localhost:9092` (host) / `kafka:29092` (Docker)
* `spring.kafka.properties.schema.registry.url` — `http://localhost:8081` (Confluent Schema Registry, BACKWARD compatibility)

---

## Topic Constants

Always use `KafkaConstants` for topic names to avoid typos:
* `KafkaConstants.AUDIT_EVENT` -> `"audit.event"`
* `KafkaConstants.USER_CREATE_EVENT` -> `"user.create.event"`

{{< alert context="warning" text="Ensure the Confluent Schema Registry URL is correctly configured in your `application.yaml` for Avro serialisation to work." />}}
