# packages/templates

Passive data package. Contains Eta template files (`.eta`) organized by category.

## How It Works

1. `.eta` files live in `src/` organized by category
2. `scripts/build-templates.ts` reads all `.eta` files and generates `src/templates-map.ts`
3. Core imports templates via `getTemplates(category)` and renders with Eta

Run `bun run build:templates` to regenerate the map after editing `.eta` files.

## Structure

```
src/root/                          — Root config templates (.gitignore, .npmrc, .env.example)
src/app/nextjs/                    — Next.js app templates
src/app/nextjs-api-only/           — Next.js API-only app templates
src/app/hono-standalone/           — Hono standalone server templates
src/db/drizzle/                    — Drizzle ORM templates
src/db/prisma/                     — Prisma templates
src/db/supabase/                   — Supabase client templates
src/api/trpc/                      — tRPC templates
src/api/hono/                      — Hono API package templates
src/api/rest-nextjs/               — REST API utilities templates
src/auth/{provider}/               — Auth provider templates (5 providers)
src/integration/analytics/{type}/  — Analytics templates
src/integration/monitoring/sentry/ — Sentry templates
src/integration/email/{type}/      — Email templates
src/integration/rate-limit/upstash/— Rate limiting templates
src/integration/ai/{type}/         — AI SDK templates
```

## Template Syntax

Templates use Eta syntax (`<%= %>` for output, `<% %>` for logic) with `it.` prefix for context:

```eta
import { createClient } from "<%= it.scope %>/db";
<% if (it.database.strategy !== 'none') { %>
import { db } from "<%= it.scope %>/db";
<% } %>
```

## Adding Templates

1. Create `.eta` file in the appropriate `src/` subdirectory
2. Run `bun run build:templates` to regenerate the map
3. Use `renderSourceFiles(category, basePath, context)` in core resolvers
