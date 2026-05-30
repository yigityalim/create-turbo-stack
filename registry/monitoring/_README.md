# Slot: `monitoring`

Error tracking / observability. One variant per `integrations.errorTracking`
value.

| Variant id | Provider |
|------------|----------|
| `sentry` | Sentry (browser + node SDK). |
| `bugsnag` | Bugsnag. |

Each item:

- Wires the SDK at app boot (init code goes in `<scope>/monitoring`).
- Optionally a `withSentry` / `withBugsnag` helper for route handlers.
- Declares the DSN / API key in `envVars`.
- `registryDependencies: ["env-t3"]`.

For the manifest contract see `registry/README.md`. For a fully-worked
example see `registry/env/t3-env/`.
