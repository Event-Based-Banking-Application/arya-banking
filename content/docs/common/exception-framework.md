---
title: "Exception Framework"
description: "Global error handling, standard error codes, and Feign propagation."
icon: "report"
weight: 400
toc: true
---

## Overview

Consistency in error reporting is critical for a distributed system. The common library provides a unified exception hierarchy and automated handlers to ensure all services return standard JSON error responses.

---

## The GlobalException

The base for all domain exceptions is `GlobalException`. It carries three pieces of information:
1.  **HTTP Status Code**: (e.g., 404, 401).
2.  **Domain Error Code**: A unique string identifier (e.g., `USER_NOT_FOUND_404`).
3.  **Error Message**: A descriptive human-readable message.

### Common Exception Codes

{{< table "table-striped table-sm" >}}
| Code | HTTP | Scenario |
|---|---|---|
| `USER_NOT_FOUND_404` | 404 | Missing user profile. |
| `USER_ALREADY_EXISTS_409` | 409 | Duplicate registration attempt. |
| `SECURITY_INVALID_CREDENTIALS_401` | 401 | Failed authentication. |
| `ACCOUNT_LOCKED_403` | 403 | Too many failed logins. |
{{< /table >}}

---

## Global Event Handler

Every service importing this library automatically inherits the `@RestControllerAdvice` defined in `GlobalExceptionHandler`.

### Response Format
When an exception occurs, the API returns a structured JSON:
```json
{
  "errorCode": "USER_NOT_FOUND_404",
  "errorMessage": "No user found with the provided ID."
}
```

---

## Inter-Service Propagation

When service A calls service B via Feign, errors can easily be lost. We solve this with the **`FeignClientErrorDecoder`**.

{{< alert context="primary" text="This decoder automatically deserialises the 4xx/5xx error bodies into `GlobalException` objects, allowing the calling service to catch and handle specific domain errors exactly as if they occurred locally." />}}

To use it, add the configuration to your Feign client:
```java
@FeignClient(name = "auth-service", configuration = FeignConfiguration.class)
```
