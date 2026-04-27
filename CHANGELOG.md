# Changelog

All notable changes to this project. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows [SemVer](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Architecture

- **App type plugin registry** — every framework lives in its own
  `packages/core/src/resolve/app-types/<name>.ts` file. New framework =
  one file + one entry in `BUILT_IN_APP_TYPES`. The old `app-files.ts`
  switch-case is gone.
- **Integration plugin registry** — auth / database / api / analytics /
  errorTracking / email / rateLimit / ai providers live in single
  category files under `packages/core/src/integrations/`. `env-chain.ts`
  and `catalog.ts` query the registry; no hardcoded if-cascades.
- **Schema-registry sync test** — drift between the schema's enum values
  and the registries is caught in CI by `registry-sync.test.ts`.
- **`create-turbo-stack.json` user config** — projects can set
  `defaults` (pre-fill prompts), `policy` (allow / forbid / require), and
  `plugins` (npm packages dynamically imported and registered).

### CLI

- **`remove app | package | integration`** — first-class removal with
  stale-file deletion and empty-directory pruning.
- **Conflict detection** — files edited by hand since the last scaffold
  are surfaced to the user with a keep / overwrite / abort choice.
- **Atomic apply** — every `add` / `remove` snapshots state before
  writing; on any failure the disk is rolled back to the prior state,
  including `.turbo-stack.json`.
- **JSON deep merge** — `package.json` updates preserve user-authored
  keys (custom scripts, ad-hoc fields) instead of overwriting whole
  objects.

### Schema

- JSON Schema generation switched from `zod-to-json-schema` to Zod 4's
  native `z.toJSONSchema()`. The previously-empty
  `apps/web/public/schema/*.json` files now contain real definitions.
- New `UserConfigSchema` exported alongside Preset / Registry / Config.

### Templates

- `_TEMPLATE/` reference directory for new app frameworks. Skipped by
  the build script's default; pass `--include-all` to include.
- Next.js apps now generate `error.tsx`, `not-found.tsx`, `loading.tsx`,
  `vercel.json`, and a Sentry `instrumentation.ts` (when error tracking
  is enabled).

## [1.0.0] - 2026-03-19

### Added

- `create` command — interactive prompts to scaffold a full Turborepo monorepo
- `add` command — incrementally add apps, packages, and integrations
- `analyze` command — reverse-engineer existing Turborepo projects into preset JSON
- `mcp` command — MCP server for AI agent integration (Claude Code, Cursor, Windsurf)
- `preset` command — save and validate preset configurations
- **Schema package** — Zod 4 schemas for presets, config, registry, file trees
- **Core engine** — platform-agnostic file tree resolution, template rendering (Eta), wiring computation
- **Templates** — Eta templates for apps, db, api, auth, integrations
- **Analyzer** — detectors with confidence levels for stack detection
- **Web builder** — visual stack configurator with real-time file tree preview
- App types: Next.js, Next.js API-only, Hono standalone, Vite-React, SvelteKit, Astro, Remix
- Database: Supabase, Drizzle (6 drivers), Prisma
- API: tRPC v11, Hono, REST (Next.js API routes)
- Auth: Supabase Auth, Better Auth, Clerk, NextAuth, Lucia
- CSS: Tailwind 4 (full support), Tailwind 3 / vanilla / CSS Modules (basic)
- Integrations: PostHog, Vercel Analytics, Plausible, Sentry, React Email + Resend, Nodemailer, Upstash, Vercel AI SDK
- Wiring: CSS `@source` directives, catalog dependencies, workspace refs, env chains, tsconfig inheritance, turbo tasks
- Diff engine for incremental operations
- Built-in presets: minimal, saas-starter, api-only
- Community preset registry system
