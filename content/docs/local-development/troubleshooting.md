---
title: "Troubleshooting"
description: "Common issues encountered during local development and how to resolve them."
icon: "bug_report"
weight: 1000
toc: true
---

## Common Issues

{{< table "table-striped table-hover" >}}
| Symptom | Likely Cause | Solution |
|---------|-------------|----------|
| `401 Unauthorized` from Maven | Missing or invalid GitHub PAT | Update `settings.xml` with a valid PAT with `read:packages` scope |
| Vault returns `403 Forbidden` | Vault is sealed | Run `make vault-unseal` in the infra repo |
| Service fails to start — "Vault token is empty" | Missing or invalid `vault-credentials.yml` | Verify the file exists and contains the correct Role ID / Secret ID |
| Service can't connect to `config-server:8090` | Config Server not fully initialized | Wait 30s and try again; check `docker logs config-server` |
| `Connection refused` to Keycloak | Keycloak not ready | Wait for Keycloak health check; check `docker logs keycloak` |
| API Gateway returns `503` for routes | Downstream service not registered with Eureka | Verify the target service is running and registered on port 8761 |
| Service registers with wrong IP in Eureka | Docker hostname resolution issue | Restart the service; ensure `eureka.instance.prefer-ip-address=true` in config |
| Container logs: `no nodes are available` for Kafka | Kafka broker not fully initialized | Run `docker compose -f compose/kafka.yml restart kafka` |
| `host.docker.internal` not resolving | Linux host | Use `172.17.0.1` or container hostnames instead |
{{< /table >}}

---

## Docker Issues

### Containers exit immediately

```powershell
docker logs <container-name>
```

Check for port conflicts or missing environment variables.

### Port already in use

```powershell
netstat -ano | findstr :<PORT>
```

Stop the process using that port or change the port mapping in the Compose file.

### Can't pull images from GitHub Packages

Ensure `GITHUB_ACTOR` and `GH_PAT` environment variables are set before running `make up`. The Docker Compose file passes these as build args. Without them, image pulls will fail with a 401.

---

## Maven Issues

### `Could not resolve dependency arya-banking-common`

1. Verify `settings.xml` has the correct GitHub credentials
2. Run `mvn clean install` in the `arya-banking-common` repo first
3. Check your internet connection to `maven.pkg.github.com`

### Build fails with `package javax.annotation.processing does not exist`

Ensure you are using **Java 17** (not Java 11 or earlier):

```powershell
java -version
```

---

## Vault Issues

### Vault is sealed after restart

Always run `make vault-unseal` after restarting the Vault container.

### Lost the root token

If `keys.txt` is lost, you must delete the Vault data directory and re-initialize:

```powershell
# Stop Vault, delete data, restart
docker compose -f compose/vault.yml down
Remove-Item -Recurse -Force vault/data
docker compose -f compose/vault.yml up -d
make vault-unseal
```

This destroys all existing secrets — you will need to re-create them.

---

## Keycloak Issues

### Can't log in to the admin console

Default credentials are `admin / admin`. If they don't work, check the Keycloak logs:

```powershell
docker logs keycloak
```

### Token request returns 401

Ensure the client ID (`banking-service-client`), client secret, username, and password are correct. Verify the client has **Client authentication** enabled.
