---
title: "Mappers"
description: "Implementation details for MapStruct entity-DTO conversions."
icon: "schema"
weight: 8906
toc: true
---

## Overview

The `arya-banking-user-service` uses **MapStruct 1.5.5.Final** for type-safe bean mapping between controllers, services, and the database.

---

## UserMapper

The `UserMapper` interface is the primary mapper for the User domain. It extends `BaseMapper<User, RegisterDto>` from the common library.

```java {linenos=table, anchorlinenos=true}
@Mapper(componentModel = "spring")
public interface UserMapper extends BaseMapper<User, RegisterDto> {
    User toEntity(RegisterDto registerDto);
    RegisterDto toDto(User user);
    List<User> toEntityList(List<RegisterDto> registerDtos);
    List<RegisterDto> toDtoList(List<User> users);
}
```

### Component Model
The `componentModel = "spring"` attribute ensures that MapStruct generates a Spring-managed bean, which can then be injected into services using `@Autowired` or constructor injection.

### Mapping Strategy
- **Field Matching**: MapStruct automatically maps fields with identical names (e.g., `firstName`, `lastName`, `emailId`).
- **Manual Mapping**: Fields like `userId`, `status`, and `contactNumbers` are not present in `RegisterDto` and are set manually in the service layer after the initial mapping.

---

## Best Practices

- **Avoid Manual Mappers**: Always prefer MapStruct over manual "builder" or "new" object mapping to reduce boilerplate and potential errors.
- **Inheritance**: The use of `BaseMapper` ensures consistent mapping patterns across all microservices in the Arya Banking platform.

{{< alert context="info" text="Generated implementations can be found in <code>target/generated-sources/annotations/</code> after building the project." />}}
