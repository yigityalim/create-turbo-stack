# Changelog

All notable changes to this project. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows [SemVer](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

_Next publish. Package name transfer in progress (`create-turbo-stack` squatted on npm;
publishing as `@create-turbo-stack/cli` in the interim)._

---

## [2.0.0] - Unreleased

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
- **Built-in bundle** — first-party slots (app types, auth, db, api, integrations,
  env, typescript-config, ui) are compiled into `builtin-items.ts` and resolved
  offline; no network call for the default flow.
- **One file per project** — project config moves into the `config` block of
  `.turbo-stack.json`; `create-turbo-stack.json` and
  `~/.create-turbo-stack/config.json` are optional org/team overrides.
- **Workspace locations** — apps and packages carry a `location` field
  (`apps/`, `packages/`, or custom); resolver and CLI respect it everywhere.
- **Typed manifests** — `package.json` and `tsconfig.json` built from typed
  `PackageJson` / `TsConfig` interfaces, not `Record<string, unknown>`.
- **Load-bearing env** — generated code imports validated, typed values from
  the `env` package (`env.X`, no `!`) when `envValidation` is enabled.
- **Linter registry** — `biome`, `oxlint` (+ Oxfmt), and `eslint-prettier`
  (flat config + typescript-eslint) all produce working, lint-clean output.
- **E2E harness** — `bun run e2e` scaffolds → installs → type-checks → builds
  all three built-in presets; proves each linter; proves vite-react / astro /
  sveltekit app types; runs a registry-composition chain.
- **Browser-safety regression** — CI asserts zero `node:*` or Eta imports
  leak from `packages/core` (browser-safety.test.ts).

### CLI

- **`cts add <name>`** — package registry: copies a whole workspace package into
  an existing monorepo. Resolves `registryDependencies` recursively, merges
  catalog deps, wires env vars into the load-bearing env package, pins the
  checksum in `.turbo-stack.json`. Namespaced registries (`@ns/name`) with
  optional Bearer auth supported.
- **`cts add --app <name>`** — wires the installed package into a specific app's
  `consumes` list.
- **`cts reconcile`** — reports drift between `.turbo-stack.json` and actual disk.
- **`cts customize`** — smart preset editor with positional argument support.
- **Non-interactive flags** — all `add` subcommands accept `--name`, `--type`,
  `--port`, etc. for CI / scripted use.
- **`conflictPolicy`** — configurable in `config` block; wired into `applyDiff`
  (`prompt` / `keep` / `overwrite` / `abort`).
- **`--preset <name>`** resolves built-in presets offline from the bundle.
- **Multi-app targeting** — `add integration` / `add package` accept `--app`
  or interactive multi-select to target specific apps.
- **`add integration` idempotency** — detects existing provider, skips or warns.

### Schema

- `location` field on apps and packages.
- `envValidation` enum (`t3-env` | `none`).
- `PackageRegistryItemSchema` — full registry item contract.
- `tailwind3`, `vanilla`, `css-modules` CSS options removed (were producing
  tailwind4 output; honesty over false coverage).
- `cms` field removed (was never read by the resolver).
- `conflictPolicy` added to `UserConfigSchema`.

### Registry (first-party packages, `cts add`)

- `crypto` — Web Crypto helpers (SHA-256, HMAC, secure random).
- `security` — security headers + CSRF guard.
- `session` — session token + validation (composes `crypto`).

### Web

- Builder overhaul: location-aware, auto-packages, smart sidebar.
- Coloured file-type icons + file nesting in the explorer.
- README preview in the explorer.
- Registry browse page (`/registry`).
- Landing page refresh + URL-codec health-check script.

---

## [1.0.0] - 2026-03-19

### Added

- `create` command — interactive prompts to scaffold a full Turborepo monorepo.
- `add app | package | integration` — incremental additions with atomic apply.
- `remove app | package | integration` — first-class removal with stale-file
  deletion and empty-directory pruning.
- `switch <category> <provider>` — diff-driven provider transition.
- `upgrade` — migrate `.turbo-stack.json` between schema versions.
- `analyze` command — reverse-engineer existing Turborepo projects into preset JSON.
- `analyze --open-builder` — open result in the visual builder.
- `mcp` command — MCP server for AI agent integration.
- `preset save | validate` — save and validate preset configurations.
- `doctor` — environment + project sanity checks.
- `list` / `info` — inspect supported options and current stack.
- `init` — one-shot adoption: analyze + write `.turbo-stack.json`.
- **Schema package** — Zod 4 schemas for presets, config, registry, file trees.
- **Core engine** — platform-agnostic file tree resolution, wiring computation.
- **Analyzer** — 11 detectors with confidence levels for stack detection.
- **Web builder** — visual stack configurator with real-time file tree preview.
- App types: Next.js, Next.js API-only, Hono standalone, Vite + React,
  SvelteKit, Astro, Remix.
- Database: Supabase (supabase-js), Drizzle (6 drivers), Prisma.
- API: tRPC v11, Hono, REST (Next.js API routes).
- Auth: Better Auth, Clerk, Supabase Auth, NextAuth.
- CSS: Tailwind 4.
- UI: shadcn/ui.
- Integrations: PostHog, Vercel Analytics, Plausible, Sentry, React Email +
  Resend, Nodemailer, Upstash, Vercel AI SDK, LangChain, Bugsnag.
- Linters: Biome, Oxlint, ESLint + Prettier.
- Wiring: CSS `@source`, catalog deps, workspace refs, env chains, tsconfig
  inheritance, turbo tasks, exports map.
- Diff engine: `create` / `update` / `unchanged` / `delete` / `conflict`
  mutations; leaf-level JSON merge; snapshot + rollback; cross-process lock.
- Conflict detection: files hand-edited since the last scaffold are surfaced
  with a keep / overwrite / abort prompt.
- Plugin architecture: `defineAppType()` / `defineIntegration()` registries.
- User config: `defaults`, `policy`, `plugins` in `create-turbo-stack.json`.
- Schema-registry sync test enforces enum ↔ implementation consistency in CI.
- JSON Schema generation via Zod 4 native `z.toJSONSchema()`.
- Built-in presets: `minimal`, `saas-starter`, `api-only`.
- Community preset registry system.
- `packages/core` browser-safety rule: zero Node.js imports.
