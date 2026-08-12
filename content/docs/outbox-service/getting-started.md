---
title: "Getting Started"
description: "Add the outbox starter to a service, declare the publisher bean, and start publishing domain events."
icon: "rocket_launch"
weight: 150
toc: true
---

## Prerequisites

- Java 17 and Maven
- Kafka + Schema Registry running (see [Start Infrastructure]({{< ref "/docs/local-development/start-infra" >}}))
- `arya-banking-common` available from [arya-banking-maven-registry]({{< ref "/docs/maven-registry" >}}) (or installed locally via `mvn install`)
- A Mongo database for the outbox collection

---

## 1. Add the Dependency

```xml
<dependency>
    <groupId>org.arya.banking</groupId>
    <artifactId>arya-banking-outbox-service</artifactId>
    <version>1.0.0</version>
</dependency>
```

Make sure your `pom.xml` also includes the GitHub Packages repositories block and a `~/.m2/settings.xml` with a `read:packages` PAT (see [Publishing & Consuming]({{< ref "/docs/maven-registry/publishing" >}})).

---

## 2. Enable the Starter

```yaml
arya:
  outbox:
    enabled: true
    publish-interval-ms: 5000
    max-retries: 3
```

{{< alert context="info" text="The starter is enabled by default (<code>matchIfMissing</code>), so the <code>enabled</code> flag is only needed to override the default or to turn the starter off." />}}

---

## 3. Create a Concrete Entity & Repository

The starter works with a concrete subclass of `OutboxEvent` and a repository that narrows the generic contract:

```java
@Document(collection = "user_outbox")
public class UserOutboxEvent extends OutboxEvent {
}
```

```java
public interface UserOutboxEventRepository extends OutboxEventRepository<UserOutboxEvent> {
}
```

---

## 4. Declare the Publisher Bean

The auto-configuration registers the `KafkaTemplate` and `OutboxEventProducer`, but the generic relay bean is declared per service:

```java
@Configuration
public class OutboxConfig {

    @Bean
    public OutBoxPublisherService<UserOutboxEvent> outBoxPublisherService(
            UserOutboxEventRepository repository,
            OutboxEventProducer producer,
            OutboxProperties properties) {
        return new OutBoxPublisherService<>(repository, producer, properties);
    }
}
```

---

## 5. Write the Event in the Same Transaction

Save the outbox record atomically with the business write. The publisher is `@Scheduled` on the configured interval and sends any `PENDING` / `RETRY_PENDING` records to the topic stored on the event, keyed by `aggregateId`.

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

    userOutboxEventRepository.save(outboxEvent);
}
```

---

## 6. Reusing the Shared Kafka Producer

The outbox starter does **not** create its own Kafka connection. It reuses whatever `ProducerFactory` already exists in the application context and registers a typed `KafkaTemplate<String,OutboxKafkaEvent>` plus the `OutboxEventProducer` on top of it. Inject either one anywhere in your service — no extra beans required:

```java
@Service
public class UserEventService {

    private final OutboxEventProducer outboxEventProducer;

    public UserEventService(OutboxEventProducer outboxEventProducer) {
        this.outboxEventProducer = outboxEventProducer;
    }

    public void publish(String aggregateId, String eventType, String payload) {
        outboxEventProducer.sendOutboxEvent("arya-user-svc-usr-update",
            OutboxKafkaEvent.newBuilder()
                .setAggregateId(aggregateId)
                .setEventType(eventType)
                .setPayload(payload)
                .build());
    }
}
```

- When `arya-banking-common` is on the classpath, its pre-configured `KafkaConfiguration` registers the `ProducerFactory` (key `StringSerializer`, value Confluent `KafkaAvroSerializer`) automatically as soon as `spring.kafka.bootstrap-servers` is set. The starter picks that factory up — you do not need to define one.
- The starter only registers its own template when no matching `KafkaTemplate` exists (`@ConditionalOnMissingBean`), so a service-defined template is never overridden.

### If No Producer Factory Is Present

The auto-configuration is inactive without a `ProducerFactory` bean — the outbox relay will fail at startup with a `NoSuchBeanDefinitionException`. This happens when the service does not depend on `arya-banking-common` or when `spring.kafka.bootstrap-servers` is unset (the common `KafkaConfiguration` is `@ConditionalOnProperty`). In that case, provide the factory yourself:

```java
@Configuration
public class KafkaProducerConfig {

    @Value("${spring.kafka.bootstrap-servers}")
    private String bootstrapServers;

    @Value("${spring.kafka.properties.schema.registry.url}")
    private String schemaRegistryUrl;

    @Bean
    public ProducerFactory<String, OutboxKafkaEvent> producerFactory() {
        Map<String, Object> props = new HashMap<>();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put("schema.registry.url", schemaRegistryUrl);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, KafkaAvroSerializer.class);
        return new DefaultKafkaProducerFactory<>(props);
    }
}
```

---

## 7. Reusing the Shared Kafka Consumer

To read from a topic (e.g. consuming the events published by the outbox relay), reuse the same infrastructure instead of configuring a second connection:

- **With `arya-banking-common`**: inject `KafkaConfiguration` and call `kafkaListerFactory("<groupId>")` — it returns a `ConcurrentKafkaListenerContainerFactory` wired with `StringDeserializer` + `KafkaAvroDeserializer`, `AUTO_OFFSET_RESET=earliest` and `SPECIFIC_AVRO_READER=true`:

```java
@Configuration
public class OutboxConsumerConfig {

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, OutboxKafkaEvent> outboxFactory(
            KafkaConfiguration kafkaConfiguration) {
        return kafkaConfiguration.kafkaListerFactory("user-service-outbox-checker");
    }
}
```

- **If the common library is not present** (or you want a custom group/deserializer), build the container factory yourself:

```java
@Bean
public ConcurrentKafkaListenerContainerFactory<String, OutboxKafkaEvent> outboxFactory() {
    Map<String, Object> props = new HashMap<>();
    props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
    props.put(ConsumerConfig.GROUP_ID_CONFIG, "user-service-outbox-checker");
    props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
    props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
    props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, KafkaAvroDeserializer.class);
    props.put(KafkaAvroDeserializerConfig.SPECIFIC_AVRO_READER_CONFIG, true);
    props.put("schema.registry.url", schemaRegistryUrl);

    ConcurrentKafkaListenerContainerFactory<String, OutboxKafkaEvent> factory =
        new ConcurrentKafkaListenerContainerFactory<>();
    factory.setConsumerFactory(new DefaultKafkaConsumerFactory<>(props));
    return factory;
}
```

Then consume with a standard `@KafkaListener`:

```java
@KafkaListener(topics = "arya-user-svc-usr-update", containerFactory = "outboxFactory")
public void onOutboxEvent(OutboxKafkaEvent event) {
    // handle eventType + payload
}
```

{{< alert context="warning" text="Both the shared producer and consumer wiring depends on <code>spring.kafka.bootstrap-servers</code> and <code>spring.kafka.properties.schema.registry.url</code>. If either is missing, no factory is created and the outbox relay cannot send." />}}

---

## Verification

Watch the consuming service logs for:

```text
Outbox Event for aggregate Id: ... sent
```

and confirm the message appears on the topic in **Kafka UI** at [http://localhost:8080](http://localhost:8080).

{{< alert context="warning" text="Ensure <code>spring.kafka.bootstrap-servers</code> and <code>schema.registry.url</code> are set — the producer uses the Confluent <code>KafkaAvroSerializer</code> and will fail without a Schema Registry." />}}