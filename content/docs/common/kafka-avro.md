---
title: "Kafka & Avro Messaging"
description: "Shared event schemas, Kafka topic catalog, and producer/consumer configuration patterns."
icon: "send"
weight: 300
toc: true
---

## Messaging Architecture

The Arya Banking platform uses **Apache Kafka** with **Confluent Avro** for all asynchronous inter-service communication. This ensures type safety and schema compatibility across the ecosystem via the **Confluent Schema Registry**.

All schemas are defined in the `kafka` module of `arya-banking-common` (`src/main/avro`, namespace `org.arya.banking.common.avro`) and auto-compiled into Java classes by the `avro-maven-plugin` during `generate-sources`.

---

## Topic Catalog

Topic names are centralized in `KafkaConstants` (`org.arya.banking.common.constants.kafka`):

{{< table "table-striped table-sm" >}}
| Constant | Topic | Schema | Current Producer | Consumers |
|---|---|---|---|---|
| `USER_CREATE_EVENT` | `user.create.event` | `UserCreateEvent` | **auth-service** (UserEventProducer) | **auth-service** (UserUpdateEventListener) |
| `AUDIT_EVENT` | `audit.event` | `AuditEvent` | — (defined, not yet sent) | None yet |
| `USER_UPDATE_EVENT` | `user.update.event` | `OutboxKafkaEvent` (wrapping `UserCreateEvent`) | **user-service** (outbox relay) | **auth-service** (UserUpdateEventListener) |
| `AUTH_FAILED_EVENT` | `auth.failed.event` | `LoginFailedEvent` | **auth-service** (UserEventProducer) | **user-service** (UserEventListeners) |
| *(per-event)* | `arya-user-svc-usr-update` | `OutboxKafkaEvent` | **user-service** (outbox relay) | **auth-service** |
{{< /table >}}

{{< alert context="success" text="The platform now has <b>active producers and consumers</b>. Auth Service produces `UserCreateEvent` and `LoginFailedEvent`, and consumes `UserCreateEvent` from the User Service outbox topic. User Service consumes `LoginFailedEvent` for account locking logic." />}}

---

## Avro Schemas

### 1. Audit Event (`AuditEvent.avsc`)
Tracks system-wide actions for auditing purposes.
* **Topic**: `audit.event`
* **Fields**: `actionType`, `targetTable`, `targetId`, `userId`, `changeType`, `details` (all strings)

### 2. User Create Event (`UserCreateEvent.avsc`)
Triggered when a new user finishes the registration flow.
* **Topic**: `user.create.event` / `user.update.event` (via outbox envelope)
* **Fields**: `userId` (string), `status` (string), `isEmailVerified` (boolean, default `false`), `isContactVerified` (boolean, default `false`), `metadata` (`EventMetadata`)

### 3. Login Failed Event (`LoginFailedEvent.avsc`)
Published when authentication fails, enabling downstream services to track and act on failed login attempts.
* **Topic**: `auth.failed.event`
* **Fields**: `userId` (string), `isLockUser` (boolean), `metadata` (`EventMetadata`)

### 4. User Lock Event (`UserLockEvent.avsc`)
Published when a user account is locked/unlocked.
* **Topic**: `user.lock.event`
* **Fields**: `userId` (string), `isLocked` (boolean), `metadata` (`EventMetadata`)

### 5. Event Metadata (`EventMetadata.avsc`)
Standardized metadata attached to all events for tracing and causality.
* **Fields**: `correlationId` (string — tracks request across services), `eventId` (string — unique event identifier), `causationId` (string, optional — ID of the event that caused this one)

### 6. Outbox Kafka Event (`OutboxKafkaEvent.avsc`)
Envelope used by the **outbox pattern** relay (`arya-banking-outbox-service`) to publish pending events to Kafka.
* **Topic**: per-event (`event.topic` — e.g. `arya-user-svc-usr-update`)
* **Fields**: `aggregateId` (string), `eventType` (string), `payload` (string — serialized payload, e.g. JSON of `UserCreateEvent`)

---

## Kafka Configuration

The `kafka` module provides a pre-configured `KafkaConfiguration` class (`@ConditionalOnProperty("spring.kafka.bootstrap-servers")`) that wires producers and consumers:

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

The `kafka` module's `KafkaConfiguration` beans are registered for **every** service that has the `kafka` module on the classpath and sets `spring.kafka.bootstrap-servers` — do not define a second producer or consumer stack in that case:

- **Producer**: inject the pre-wired `KafkaTemplate<String, Object>` (or the outbox starter's `OutboxEventProducer`) directly. One `ProducerFactory` per JVM is enough; the [outbox starter]({{< ref "/docs/outbox-service/getting-started" >}}) reuses this same factory to build its typed `KafkaTemplate<String,OutboxKafkaEvent>`.
- **Consumer**: create one `ConcurrentKafkaListenerContainerFactory` per consumer group via `kafkaListerFactory("<groupId>")` — this is a cheap factory wrapper, not a second connection.

### If the Beans Are Not Present

The `kafka` module's `KafkaConfiguration` is inactive when `spring.kafka.bootstrap-servers` is not set. In that case, wire the serializer classes manually (`KafkaConstants` provides the fully-qualified names):

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

## Correlation ID & Event Context Utilities

The `kafka` module provides thread-local utilities for distributed tracing and event causality tracking across the microservice ecosystem.

### `CorrelationIdContext`
Thread-local holder for the correlation ID that flows through the entire request chain (gateway → services → Kafka).

```java
// Set at entry point (e.g., Gateway filter or Feign interceptor)
CorrelationIdContext.set(correlationId);

// Retrieve anywhere in the call stack
String correlationId = CorrelationIdContext.get();
```

**Integration**: The API Gateway's `CorrelationIdGlobalFilter` extracts/generates `X-Correlation-ID` and sets it in MDC and thread-local context.

### `EventContext`
Holds both the correlation ID and the current event ID during event processing (consumer side).

```java
// In @KafkaListener, before processing
EventContext.setEventContext(
    event.getMetadata().getCorrelationId().toString(),
    event.getMetadata().getEventId().toString()
);

// Later in the call chain
String correlationId = EventContext.getCorrelationId();
String causedEventId = EventContext.getCausedEventId();

// Cleanup after processing
EventContext.remove();
```

### `EventMetadataFactory`
Standardized factory for creating `EventMetadata` Avro records with proper correlation/causation linkage.

```java
// For new events (no parent cause)
EventMetadata metadata = EventMetadataFactory.newEventMetadata();
// -> correlationId from EventContext, new eventId, causationId = null

// For events caused by another event (e.g., in saga/compensation)
EventMetadata metadata = EventMetadataFactory.causedByMetadata();
// -> correlationId from EventContext, new eventId, causationId = current event's eventId
```

### `GsonParser`
Thread-safe JSON-Avro parsing helper that handles `CharSequence` (Avro's string type) correctly, avoiding "Interfaces can't be instantiated!" errors from Gson.

```java
// Avro SpecificRecord -> JSON
String json = GsonParser.toJson(userCreateEvent);

// JSON -> Avro SpecificRecord
UserCreateEvent event = GsonParser.fromJson(json, UserCreateEvent.class);

// For generic types
List<UserCreateEvent> events = GsonParser.fromJson(json, new TypeToken<List<UserCreateEvent>>(){}.getType());
```

---

## AOP Aspects

The `kafka` module also includes Spring AOP aspects for cross-cutting concerns in Kafka consumer methods.

### `EventContextAop` — Automatic ThreadLocal Cleanup

**Problem**: `EventContext` uses `ThreadLocal<String>` for `CORRELATION_ID` and `CAUSED_EVENT_ID`. Spring Kafka uses a thread pool — when a `@KafkaListener` method completes, the thread returns to the pool with stale `ThreadLocal` values. This causes **cross-message context pollution**: the next message processed by the same thread inherits the previous message's correlation ID and event ID.

**Solution**: An `@After` aspect that automatically clears `EventContext.remove()` after every `@KafkaListener` method execution:

```java
@Aspect
@Component
public class EventContextAop {

    @After("@annotation(org.springframework.kafka.annotation.KafkaListener)")
    public void clearEventContext() {
        EventContext.remove();
    }
}
```

**Configuration requirements**:
1. `spring-boot-starter-aop` dependency in your service's `pom.xml`
2. `@EnableAspectJAutoProxy` on your Spring Boot application class
3. `@ComponentScan` covering `org.arya.banking.common.aop` (already included if you scan `org.arya.banking.common`)

**Impact**: All `@KafkaListener` methods across every service get automatic ThreadLocal cleanup — no manual `try-finally` blocks needed. This eliminates the root cause of context pollution in pooled-thread Kafka consumers.

{{< alert context="info" text="The <code>EventContextAop</code> is the first production AOP aspect shipped in the platform. Future aspects (audit logging, authorization, metrics) will follow the same pattern in <code>org.arya.banking.common.aop</code>." />}}

---

## Topic Constants

Always use `KafkaConstants` for topic names to avoid typos:
* `KafkaConstants.AUDIT_EVENT` -> `"audit.event"`
* `KafkaConstants.USER_CREATE_EVENT` -> `"user.create.event"`
* `KafkaConstants.USER_UPDATE_EVENT` -> `"user.update.event"`
* `KafkaConstants.AUTH_FAILED_EVENT` -> `"auth.failed.event"`

{{< alert context="warning" text="Ensure the Confluent Schema Registry URL is correctly configured in your `application.yaml` for Avro serialisation to work." />}}
