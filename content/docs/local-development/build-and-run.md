---
title: "Build and Run Services"
description: "Build all services with Maven and start them in the correct dependency order."
icon: "play_arrow"
weight: 800
toc: true
---

Services must be built and started in dependency order. The platform infrastructure (Service Registry, Config Server, API Gateway) runs in Docker. The three business services run locally on the host.

---

## 1. Build the Common Library

```powershell
cd arya-banking-common
mvn clean install -DskipTests
```

{{< alert context="info" text="This publishes the shared library to your local Maven repository (<code>~/.m2/repository</code>). All other services depend on it. You only need to rebuild it when the common library changes." />}}

---

## 2. Build All Business Services

```powershell
cd ../arya-banking-user-service
mvn clean package -DskipTests

cd ../arya-banking-auth-service
mvn clean package -DskipTests

cd ../arya-banking-admin-service
mvn clean package -DskipTests
```

These can be built in any order — they only need the `arya-banking-common` artifact in your local `.m2` cache.

---

## 3. Start Services

### User Service (port 8086)

```powershell
cd arya-banking-user-service
mvn spring-boot:run
```

### Auth Service (port 8087)

```powershell
cd arya-banking-auth-service
mvn spring-boot:run
```

### Admin Service (port 8089)

```powershell
cd arya-banking-admin-service
mvn spring-boot:run
```

{{< alert context="info" text="Use separate terminal windows for each service, or run them in the background with <code>mvn spring-boot:run &gt; service.log 2&gt;&amp;1</code>." />}}

---

## 4. Expected Startup Behavior

After starting each service, it will:

1. Register with **Eureka** (visible at [http://localhost:8761](http://localhost:8761))
2. Fetch configuration from the **Config Server**
3. Authenticate to **Vault** using the AppRole credentials in `vault-credentials.yml`
4. Load secrets into the Spring environment

If a service fails to start, check the **Troubleshooting** page for common issues.
