# Slot: `api`

API layer. One variant per `(api.strategy, api.mode)` where applicable.

| Variant id | Strategy + mode |
|------------|------------------|
| `trpc` | tRPC v11 — server router + client (`@tanstack/react-query` integration). |
| `hono-standalone` | Hono `@hono/node-server` standalone server. Maps to `App["type"] = "hono-standalone"`. |
| `hono-route` | Hono mounted as a Next.js route handler (`app/api/[[...route]]/route.ts`). |

Each item should expose:

- `<scope>/api/server` — the route definitions.
- `<scope>/api/client` — the type-safe client (tRPC `createTRPCReact`,
  Hono `hc<>` …).
- A `protected procedure` / `protected route` example using the auth slot —
  the integration is the value, not the boilerplate.

Declare:

- `registryDependencies: ["env-t3"]` always; add `"auth-<variant>"` when
  the example uses an auth-guarded procedure.
- `dependencies` includes the runtime (`@trpc/server`, `@trpc/client`,
  `hono`, …) and any framework adapter the chosen mode needs.
- `envVars` is usually empty here — API config rarely needs env on top of
  what auth/db already declare.

For the manifest contract see `registry/README.md`. For a fully-worked
example see `registry/env/t3-env/`.
