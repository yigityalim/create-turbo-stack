# Slot: `analytics`

Product analytics. One variant per `integrations.analytics` value.

| Variant id | Provider |
|------------|----------|
| `posthog` | PostHog. |
| `plausible` | Plausible. |
| `vercel-analytics` | Vercel Analytics. |

Each item:

- Exposes a small `<scope>/analytics` API: `capture(event, props)` server-
  and client-side wrappers.
- For PostHog: includes a `<PostHogProvider>` for the React tree.
- Declares the project key in `envVars`.
- `registryDependencies: ["env-t3"]`.

For the manifest contract see `registry/README.md`. For a fully-worked
example see `registry/env/t3-env/`.
