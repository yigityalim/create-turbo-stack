# Slot: `db`

Database client + schema scaffolding. One variant per
`(database.strategy, database.driver)` combination — no branching inside an
item, write more items instead.

| Variant id | Notes |
|------------|-------|
| `drizzle-postgres` | Drizzle ORM + `postgres` driver. |
| `drizzle-sqlite` | Drizzle ORM + `better-sqlite3`. |
| `drizzle-mysql` | Drizzle ORM + `mysql2`. |
| `prisma-postgres` | Prisma + Postgres. |
| `prisma-sqlite` | Prisma + SQLite. |
| `prisma-mysql` | Prisma + MySQL. |
| `supabase` | Supabase JS client (no ORM). |

Each item should ship:

- `src/client.ts` — exported `db` instance, reads `env.DATABASE_URL`.
- `src/schema.ts` (Drizzle) or `prisma/schema.prisma` (Prisma) — minimal
  `users` + `sessions` tables to give the user a starting point.
- `src/seed.ts` — runnable seed script that inserts a sample user. Wire it
  via a script in the manifest's `scripts` field or document the command
  in the README.

Declare:

- `envVars: { "DATABASE_URL": "postgres://user:pass@localhost:5432/db" }`
  (or the matching shape for the driver).
- `registryDependencies: ["env-t3"]`.
- `environment: "node"` (DB drivers are Node-only).
- For Drizzle: `dependencies` includes `drizzle-orm` AND the driver
  (`postgres`, `better-sqlite3`, `mysql2`). `devDependencies` includes
  `drizzle-kit`.

For the manifest contract see `registry/README.md`. For a fully-worked
example see `registry/env/t3-env/`.
