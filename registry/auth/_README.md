# Slot: `auth`

Authentication providers. One variant per `preset.auth.provider` enum value.

| Variant id (= `preset.auth.provider`) | Provider |
|---------------------------------------|----------|
| `better-auth` | better-auth (self-hosted, framework-agnostic, drizzle/prisma adapters). |
| `clerk` | Clerk (hosted, drop-in `<ClerkProvider>`). |
| `supabase-auth` | Supabase Auth (requires `database.strategy = "supabase"`). |
| `authjs` | Auth.js / NextAuth. |

Each item should expose:

- `<scope>/auth/server` — the `auth` instance (e.g. `betterAuth(...)`).
- `<scope>/auth/client` — the client-side hooks (`useSession`, `signIn`, …).
- `<scope>/auth/middleware` — a Next.js middleware (when applicable).
- A `protected route` example in the README — "here's what a guarded page
  looks like" goes a long way.

Declare:

- `envVars` for every secret the provider reads (`BETTER_AUTH_SECRET`,
  `CLERK_SECRET_KEY`, …). These appear in the user's `.env.example`
  automatically.
- `registryDependencies: ["env-t3"]` — auth always reads from env, so the
  env item must materialise first.
- When the provider needs a database adapter, declare the matching db
  variant as a `registryDependencies` entry too (e.g.
  `["env-t3", "db-drizzle-postgres"]`). The preset's cross-field validator
  already rejects bad combos (supabase-auth ↔ non-supabase db); items can
  rely on that.

For the manifest contract see `registry/README.md`. For a fully-worked
example see `registry/env/t3-env/`.
