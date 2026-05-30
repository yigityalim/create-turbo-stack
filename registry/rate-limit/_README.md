# Slot: `rate-limit`

Rate limiting. One variant per `integrations.rateLimit` value.

| Variant id | Provider |
|------------|----------|
| `upstash-ratelimit` | `@upstash/ratelimit` against `@upstash/redis`. |

Item exposes a configured `ratelimit` instance from `<scope>/rate-limit` and
a `withRateLimit(handler, { limit, window })` helper for route handlers.

- Declares `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` in `envVars`.
- `registryDependencies: ["env-t3"]`.
- Often paired with `cache/upstash-redis` — declare it as a registry dep
  if your code shares a client.

For the manifest contract see `registry/README.md`. For a fully-worked
example see `registry/env/t3-env/`.
