# Roadmap

High-level plan for create-turbo-stack development. See [SRS](./create-turbo-stack-srs.md) for full requirements and [SDD](./create-turbo-stack-sdd.md) for design details.

## Phase 1 — Foundation (v0.1.0)

> Goal: `npx create-turbo-stack my-project` produces a working turborepo.

- [ ] `@create-turbo-stack/schema` — PresetSchema, BasicsSchema, AppSchema (Next.js), PackageSchema, CssSchema (Tailwind 4)
- [ ] `@create-turbo-stack/core` — `resolveFileTree` for root files, Next.js app, library/ui packages, typescript-config
- [ ] `@create-turbo-stack/templates` — Root configs, Next.js app, library/ui package, typescript-config
- [ ] `create-turbo-stack` CLI — `create` command, interactive prompts, file writer, git init
- [ ] CSS `@source` auto-wiring
- [ ] Catalog dependency management
- [ ] TypeScript config chain
- [ ] Biome linter setup
- [ ] `.turbo-stack.json` config tracking

**Exit criteria:** `npx create-turbo-stack my-app` → select bun, 1 Next.js app, 1 UI package → `bun install && bun run build && bun run dev` works.

---

## Phase 2 — Database & API (v0.2.0)

> Goal: Database and API layer scaffolding + incremental `add` commands.

- [ ] Supabase / Drizzle / Prisma scaffolding
- [ ] tRPC / Hono / Next.js API route generators
- [ ] Environment validation (`@t3-oss/env-nextjs`)
- [ ] `add app` command
- [ ] `add package` command
- [ ] Diff engine for incremental operations

---

## Phase 3 — Auth & Integrations (v0.3.0)

> Goal: Auth providers and third-party integrations.

- [ ] Auth providers: Supabase Auth, Better Auth, Clerk, NextAuth, Lucia
- [ ] `add integration` command
- [ ] Sentry error tracking
- [ ] PostHog / Plausible analytics
- [ ] React Email + Resend
- [ ] Built-in presets: minimal, saas-starter, api-only

---

## Phase 4 — Web & Builder (v0.4.0)

> Goal: Public website with visual stack builder.

- [ ] Landing page (apps/web)
- [ ] Builder UI — interactive stack configurator
- [ ] File tree preview (powered by core)
- [ ] Preset export (URL, JSON download, share link)
- [ ] Community presets gallery

---

## Phase 5 — MCP & Registry (v0.5.0)

> Goal: AI agent integration and community ecosystem.

- [ ] MCP server implementation
- [ ] MCP tools for all `add` commands
- [ ] MCP resources for workspace conventions
- [ ] Registry system for community presets
- [ ] `add dependency` command
- [ ] Preset `save` and `validate` commands

---

## Phase 6 — Ecosystem (v1.0.0)

> Goal: Full ecosystem with all app types and community support.

- [ ] Additional app types: Expo, Tauri, SvelteKit, Astro, Remix, Vite-Vue
- [ ] `add route` / `add component` / `add action` generators
- [ ] Plugin architecture (if validated by community demand)
- [ ] Documentation on web
- [ ] Comprehensive E2E tests
