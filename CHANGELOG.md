# Changelog

All notable changes to this project. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows [SemVer](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

_Not yet published. Package name transfer in progress (`create-turbo-stack` squatted
on npm; will publish as `@create-turbo-stack/cli` in the interim)._

### Breaking

- **Eta template layer removed entirely.** `packages/templates` is deleted.
  The engine is now registry-only: all generated content comes from
  declarative JSON manifests (`PackageRegistryItem`) backed by real TypeScript
  source files authored under `registry/`, built once, and served from
  `apps/web/public/r/`. No runtime templating; no conditionals inside files.

### Architecture

- **Registry pipeline** — `selectRegistryItems(preset)` → `resolveRegistryItems()`
  → `materializeRegistryItem(item, ctx)`. Closed-vocabulary substitution only
  (`{{scope}}`, `{{pkg-name}}`, `{{pm-*}}`). One variant per combination.
- **Supply-chain integrity** — every registry item carries a SHA-256 checksum
  recomputed on `cts add`; mismatch aborts. Optional Ed25519 signature verified
  against a per-registry `publicKey` for private/paid registries.
- **Built-in bundle** — first-party slots compiled into `builtin-items.ts`,
  resolved offline; no network call for the default flow.
- **One file per project** — project config lives in the `config` block of
  `.turbo-stack.json`; `create-turbo-stack.json` and
  `~/.create-turbo-stack/config.json` are optional org/team overrides.
- **Workspace locations** — apps and packages carry a `location` field;
  resolver and CLI respect it everywhere.
- **Typed manifests** — `package.json` and `tsconfig.json` built from typed
  interfaces, not `Record<string, unknown>`.
- **Load-bearing env** — generated code imports validated, typed values from
  the `env` package when `envValidation` is enabled.
- **Linter registry** — `biome`, `oxlint`, and `eslint-prettier` all produce
  working, lint-clean output.
- **E2E harness** — `bun run e2e` scaffolds → installs → type-checks → builds
  all three built-in presets; proves each linter and app type.
- **Browser-safety regression** — CI asserts zero `node:*` or Eta imports
  leak from `packages/core`.

### CLI

- `cts add <name>` — package registry (shadcn-for-packages).
- `cts add --app <name>` — wires installed package into a specific app.
- `cts reconcile` — reports `.turbo-stack.json` ↔ disk drift.
- `cts customize` — smart preset editor.
- `cts switch <category> <provider>` — diff-driven provider transition.
- `cts remove app | package | integration` — stale-file deletion + pruning.
- `cts upgrade` — migrate config between schema versions.
- Non-interactive flags on all `add` subcommands for CI use.
- `conflictPolicy` — configurable in `config` block (`prompt` / `keep` / `overwrite` / `abort`).
- `--preset <name>` resolves built-in presets offline.
- Multi-app targeting via `--app` flag or interactive multi-select.
- `add integration` idempotency — detects existing provider, skips or warns.

### Schema

- `location` field on apps and packages.
- `envValidation` enum (`t3-env` | `none`).
- `PackageRegistryItemSchema`.
- `css: tailwind3 | vanilla | css-modules` removed.
- `cms` field removed.
- `conflictPolicy` added to `UserConfigSchema`.

### Registry (built-in packages via `cts add`)

- `crypto` — Web Crypto helpers (SHA-256, HMAC, secure random).
- `security` — security headers + CSRF guard.
- `session` — session token + validation (composes `crypto`).

### Web

- Builder overhaul: location-aware, auto-packages, smart sidebar.
- Coloured file-type icons + file nesting in the explorer.
- README preview in the explorer.
- Registry browse page (`/registry`).
- Landing page refresh.

### Added (initial build)

- `create` command — interactive scaffolding of a full Turborepo monorepo.
- `add app | package | integration` — incremental additions with atomic apply.
- `analyze` — reverse-engineer existing Turborepo projects into preset JSON.
- `mcp` — MCP server for AI agent integration (Claude Code, Cursor, Windsurf).
- `doctor`, `list`, `info`, `init`, `preset save | validate`.
- **Core engine** — platform-agnostic file tree resolution, wiring computation.
- **Analyzer** — 11 detectors with confidence levels for stack detection.
- **Web builder** — visual stack configurator with real-time file tree preview.
- App types: Next.js, Next.js API-only, Hono standalone, Vite + React, SvelteKit, Astro.
- Database: Drizzle (6 drivers), Prisma, Supabase (supabase-js).
- API: tRPC v11, Hono, Next.js API routes.
- Auth: Better Auth, Clerk, Supabase Auth, NextAuth.
- CSS: Tailwind 4. UI: shadcn/ui.
- Linters: Biome, Oxlint, ESLint + Prettier.
- Integrations: PostHog, Vercel Analytics, Plausible, Sentry, React Email + Resend,
  Nodemailer, Upstash, Vercel AI SDK, LangChain, Bugsnag.
- Diff engine with atomic apply, conflict detection, leaf-level JSON merge.
- Plugin architecture: `defineAppType()` / `defineIntegration()`.
- Schema-registry sync test in CI.
- Built-in presets: `minimal`, `saas-starter`, `api-only`.
