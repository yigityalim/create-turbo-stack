# Slot: `cache`

Distributed cache / KV. One variant per `integrations.cache` value.

| Variant id | Provider |
|------------|----------|
| `upstash-redis` | `@upstash/redis` (HTTP, edge-compatible). |

Item exposes a configured `redis` client from `<scope>/cache` plus a tiny
`cached(key, ttl, () => Promise<T>)` helper.

- Declares `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` in `envVars`.
- `registryDependencies: ["env-t3"]`.
- `environment: "universal"` — the Upstash REST client runs at the edge.

For the manifest contract see `registry/README.md`. For a fully-worked
example see `registry/env/t3-env/`.
