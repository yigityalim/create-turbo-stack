# Roadmap

High-level plan for create-turbo-stack development. See [SRS](./create-turbo-stack-srs.md) for full requirements and [SDD](./create-turbo-stack-sdd.md) for design details.

## Phase 1 — Foundation (v0.1.0) ✅

> Goal: `npx create-turbo-stack my-project` produces a working turborepo.

- [x] `@create-turbo-stack/schema` — PresetSchema, BasicsSchema, AppSchema (Next.js), PackageSchema, CssSchema (Tailwind 4)
- [x] `@create-turbo-stack/core` — `resolveFileTree` for root files, Next.js app, library/ui packages, typescript-config
- [x] `@create-turbo-stack/templates` — 88 Eta templates, build script, render pipeline
- [x] `create-turbo-stack` CLI — `create` command, interactive prompts, file writer, git init
- [x] CSS `@source` auto-wiring
- [x] Catalog dependency management
- [x] TypeScript config chain
- [x] Biome linter setup
- [x] `.turbo-stack.json` config tracking

**Exit criteria:** `npx create-turbo-stack my-app` → select bun, 1 Next.js app, 1 UI package → `bun install && bun run build && bun run dev` works. ✅

---

## Phase 2 — Database & API (v0.2.0) ✅

> Goal: Database and API layer scaffolding + incremental `add` commands.

- [x] Supabase / Drizzle / Prisma scaffolding
- [x] tRPC / Hono / Next.js API route generators
- [x] Environment validation (`@t3-oss/env-nextjs`)
- [x] `add app` command
- [x] `add package` command
- [x] Diff engine for incremental operations

---

## Phase 3 — Auth & Integrations (v0.3.0) ✅

> Goal: Auth providers and third-party integrations.

- [x] Auth providers: Supabase Auth, Better Auth, Clerk, NextAuth, Lucia
- [x] `add integration` command
- [x] Sentry error tracking
- [x] PostHog / Plausible analytics
- [x] React Email + Resend
- [x] Built-in presets: minimal, saas-starter, api-only

---

## Phase 4 — Web & Builder (v0.4.0) ✅

> Goal: Public website with visual stack builder.

- [x] Landing page (apps/web)
- [x] Builder UI — interactive stack configurator
- [x] File tree preview (server action, real-time)
- [x] Preset export (URL, JSON download, share link)
- [x] Community presets gallery

---

## Phase 5 — MCP & Registry (v0.5.0) ✅

> Goal: AI agent integration and community ecosystem.

- [x] MCP server implementation
- [x] MCP tools for all `add` commands
- [x] MCP resources for workspace conventions
- [x] Registry system for community presets
- [x] `add dependency` command (via MCP tool)
- [x] Preset `save` and `validate` commands

---

## Phase 6 — Analyze & Reverse Engineering (v0.6.0) ✅

> Goal: Analyze existing Turborepo projects and generate presets from them.

- [x] `analyze` command — scans an existing Turborepo workspace
- [x] Detect: package manager, linter, TypeScript config, apps, packages
- [x] Detect: database (Drizzle/Prisma/Supabase), API (tRPC/Hono), auth provider
- [x] Detect: CSS framework, UI library, integrations
- [x] Generate Preset JSON from analysis
- [x] Output shareable builder URL (`--open-builder` flag)
- [x] Diff mode: compare analyzed preset with current project state

---

## Phase 7 — Ecosystem (v1.0.0) ✅

> Goal: Full ecosystem with all app types, docs, and publish readiness.

- [x] Additional app types: Vite-React, SvelteKit, Astro, Remix
- [x] Documentation on web (Builder, MCP, Analyze, Wiring pages)
- [x] Build pipeline for all packages (tsc + tsup)
- [x] npm publish readiness (bin, exports, files, README, LICENSE, CHANGELOG)
- [x] 995+ unit tests (core 674, analyzer 321, schema 9)

---

## Post-v1.0

- [ ] E2E test suite (every preset + every app type)
- [ ] `add route` / `add component` / `add action` generators
- [ ] Plugin architecture (if validated by community demand)
- [ ] Expo, Tauri, Vite-Vue app type'ları
- [ ] Community preset submission flow
- [ ] `turbo-stack upgrade` komutu
