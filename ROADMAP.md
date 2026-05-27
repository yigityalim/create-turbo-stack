# Roadmap

This document is the single source of truth for what needs to happen before each milestone.
It covers architectural decisions, implementation backlog, and post-launch scope.

---

## v1.0 Definition

v1.0 ships when every item below is true — no exceptions.

- [ ] `npx create-turbo-stack` resolves to our package
- [x] Every option the CLI prompts for produces correct output (no schema lies)
- [ ] All mutating commands (`add`, `remove`, `switch`, `upgrade`) are implemented and idempotent
- [~] Multi-app scoping is explicit: the user always knows which apps are affected
      (`cts add --app` done; `add integration` / `switch` targeting still pending)
- [ ] State reconciliation exists: `.turbo-stack.json` can be resynced from disk
- [ ] Conflict resolution policy is configurable (`.turbo-stack.json` `config` block /
      `create-turbo-stack.json`) — `applyDiff` has `onConflict`, not yet config-wired
- [ ] Web builder has working export (ZIP or CLI command copy)
- [x] MCP server is smoke-tested with at least basic tool coverage
- [ ] One *published* plugin example exists in `examples/` (example written, not published)
- [x] `bun run test`, `bun run type-check`, and `bun run lint` all exit 0
- [x] Atomic rollback works: no partial disk state survives a failed `applyDiff`

---

## Shipped

The engine and the generated output are real and verified. Current capabilities:

- **Resolver engine** — `Preset` → full `FileTree`. Platform-agnostic (runs in the
  browser builder too). Package resolution is distributed into the integration
  registry: a provider owns its catalog deps, env vars, source templates, and the
  workspace package it scaffolds. No central switch statements.
- **Typed manifests** — `package.json` and `tsconfig.json` are built from real
  `PackageJson` / `TsConfig` interfaces, not `Record<string, unknown>`. App-type
  contracts return these typed shapes.
- **Schema-typed everywhere** — stack choices (package manager, linter, db driver,
  detection report) use the `schema` enums, not bare `string`.
- **Load-bearing env** — when `envValidation` is on, generated code imports validated,
  typed values from the `env` package (`env.X`, no `!`) instead of raw `process.env`;
  `skipValidation` keeps secret-less builds green. Falls back to `process.env` when off.
- **Linter registry** — `biome`, `oxlint` (+ Prettier), and `eslint-prettier` (flat
  config + typescript-eslint) all produce working, lint-clean output.
- **Cross-package wiring** — CSS `@source`, catalog deps, workspace refs, tsconfig
  inheritance, env chain, turbo tasks, exports map.
- **Diff engine + atomic apply** — `create`/`update`/`unchanged`/`delete`/`conflict`
  mutations; leaf-level JSON merge; snapshot + rollback on failure; cross-process lock.
- **Schema versioning** — `schemaVersion` + migration registry.
- **Plugin architecture** — `defineAppType` / `defineIntegration` registries; one file
  adds a framework or provider. Third-party plugins via `create-turbo-stack.json`.
- **Analyzer** — reverse-engineers an existing Turborepo into a `Preset` with confidence.
- **Package registry (`cts add`)** — shadcn-for-packages: copies whole workspace packages
  in. `registryDependencies` (recursive, `@scope/` rewrite, `workspace:*`), namespaced
  registries + auth, `--app` wiring, glob `include` (one file per package), env vars wired
  into the load-bearing env package. See P9.
- **Supply-chain integrity** — SHA-256 `checksum` per registry item (recomputed on add,
  aborts on mismatch), Ed25519 `signature` verified against a per-registry `publicKey`,
  verified checksum pinned in `.turbo-stack.json` (drift detection). Hardened: registry
  `envVars` and file targets are injection/traversal-safe.
- **One file per project** — `.turbo-stack.json` holds both resolved state and the local
  CLI config (`config` block: registries/policy/plugins); `create-turbo-stack.json` and
  `~/.create-turbo-stack/config.json` are optional org/team overrides.
- **E2E harness** — `bun run e2e` scaffolds → installs → type-checks → builds all three
  built-in presets; lints the minimal preset under each linter; proves vite-react / astro /
  sveltekit app types; and runs a registry-composition chain (`cts add session` →
  crypto + security → install → type-check). Generated projects compile and lint clean.

---

## Architectural Decisions (resolve before v1.0)

These are design gaps — not implementation tasks. Each requires a decision before code is written.

### A1 — Multi-app scoping

**Problem:** When `add integration sentry` is called in a monorepo with three apps,
which apps get the integration? All of them? Only Next.js ones? The user picks?

**Decision needed:** Adopt an `--app <name>` flag for explicit targeting.
Default behavior (no flag): prompt with a multi-select of matching app types.
The `Preset` and `applyDiff` API must accept a `targetApps?: string[]` parameter.

### A2 — State reconciliation

**Problem:** `.turbo-stack.json` can silently drift from disk state via manual edits,
failed applies, or external tooling. Once drifted, `add` and `remove` produce wrong diffs.

**Decision needed:** Add a `reconcile` command. It re-derives the expected tree from
`.turbo-stack.json`, diffs against actual disk, and surfaces divergences for the user
to resolve — without overwriting anything automatically.

### A3 — Conflict resolution policy

**Problem:** When `applyDiff` detects a conflict (user-edited file), it prompts
interactively. This breaks MCP, CI, and scripted workflows.

**Decision needed:** Add `conflictPolicy: "keep" | "overwrite" | "abort"` to
`UserConfigSchema`. When present, skip the interactive prompt and apply the policy.
Default remains `"abort"` (safest). Wire into `applyDiff` options.

---

## Backlog

### P0 — Schema integrity (done)

Every option the prompt offers must produce correct output. Resolved by removing the
dead options and implementing the rest:

- [x] `cms: sanity | keystatic` — removed from the schema (was never read)
- [x] `linter` — `biome`, `oxlint`, and `eslint-prettier` all produce working configs,
      via the linter registry; e2e proves each lints clean
- [x] `css: tailwind3` — removed; `vanilla` / `css-modules` made honest (no tailwind
      postcss/import when not tailwind4)
- [x] `ui: shadcn` — generates `components.json`, the `cn()` helper, theme variables,
      and deps (ready for `npx shadcn add`). Sample components tracked under P4.
- [x] `ui: radix-raw` — never existed in the schema; the enum is `shadcn | none`

### P1 — CLI completeness

All lifecycle commands must exist, work, and be usable in CI (non-interactive).

- [x] `add dependency <pkg> --to=<workspace>` (+ `--dev`, `--version`)
- [x] `remove app <name>` — `delete` mutation type in the diff engine
- [x] `remove package <name>`
- [x] `remove integration <category>` — revert provider to `none`, clean up stale files
- [x] `switch <category> <provider>` — diff-driven file transition (drizzle defaults driver)
- [x] `upgrade` — migrate `.turbo-stack.json` between schema versions via migration registry
- [ ] `reconcile` — resyncs state file from disk (see A2). `init` adopts; `reconcile` is the
      drift-detect-and-resync case, not yet implemented
- [x] `--dry-run` flag on all mutating commands (`add`, `remove`, `switch`, `upgrade`)
- [x] Non-interactive flags for `add app` / `add package` / `add integration`
      (positional name + `--type`/`--port`/`--i18n`/`--consumes`/`--css`/`--exports`/
      `--value`/`--app`); prompts remain the fallback
- [ ] Real-use pass: exercise every command interactively end-to-end (not just smoke)

### P2 — Architectural resolutions

Implement the three architectural decisions above.

- [x] A1: Multi-app scoping — `--app` / interactive multi-select on `cts add`,
      `add integration`, `add package` wires the package into the chosen apps'
      `consumes` (apps then get the `workspace:*` dep). Schema now allows consuming
      the integration auto-packages.
- [x] A2: State reconciliation — `reconcile` command
- [x] A3: Conflict resolution policy — `conflictPolicy` in config → `applyDiff` `onConflict`

### P3 — Core correctness

- [x] Atomic rollback: snapshot pre-state before any write; restore on any failure in `applyDiff`
- [x] `add integration` idempotency: unchanged value + already-consumed → "No change"
- [x] Incremental workspace refs: `add package` wires the new package into the chosen apps'
      `consumes` (`--app` / interactive multi-select) — user-driven rather than auto-matched

### P4 — Generated project quality

The output of `create` must be a working project, not a skeleton that requires manual wiring.

**Auth:**
- [ ] Better Auth + Drizzle adapter wired (schema, session table, client config)
- [ ] Better Auth + Prisma adapter wired
- [ ] Sign-in and sign-up page stubs generated for Next.js
- [ ] `middleware.ts` generated at Next.js root with session handling
- [ ] Public/protected route list in middleware (configurable via env)

**API layer:**
- [ ] tRPC `QueryClientProvider` injected into Next.js `app/layout.tsx`
- [ ] Sample tRPC mutation and server action generated

**Observability:**
- [ ] PostHog provider injected into `app/layout.tsx` when `analytics: posthog` (package generated, not auto-imported)
- [x] Sentry wired in `instrumentation.ts` when `errorTracking: sentry` (layout import still manual)

**UI:**
- [ ] shadcn: sample Button and Card components (`components.json` + `cn()` already generated)
- [x] Tailwind `globals.css` with CSS variable theme scaffold (not just an import)

**Routing:**
- [x] `app/error.tsx`, `app/not-found.tsx`, `app/loading.tsx` generated for Next.js
- [x] next-intl: `messages/` + `i18n/` + `middleware.ts` when `i18n: true`

**Local development:**
- [x] `docker-compose.yml` generated from the db strategy (postgres/mysql/supabase services)
- [ ] `db/seed.ts` stub + `db:seed` turbo task wired
- [x] Root `README.md` generated with stack summary and setup steps

**CI:**
- [x] `.github/workflows/ci.yml` generated (lint, type-check, test, build; sets `SKIP_ENV_VALIDATION`)

### P5 — Web builder

- [x] Registry section — fetch `/r/registry.json`, toggle packages into `preset.registryPackages`;
      the create flow materializes them via `cts add` after scaffold
- [ ] **Revision pass** — UI polish + correctness review (dark mode, file tree, code viewer;
      see builder notes). The builder needs a dedicated going-over before launch
- [ ] ZIP download of full file tree (JSZip — already listed as post-v1.0, move up)
- [ ] Preset metadata editor in sidebar (name, description, author — schema fields exist, UI missing)
- [ ] "Copy as CLI command" button: `npx create-turbo-stack --preset <share-url>`
- [ ] Status toasts: "Loaded from URL", "Saved to browser" (event bus emits, UI does not display)
- [ ] File tree sort memoization (`useMemo` — currently re-sorts on every render)
- [ ] Confidence indicators from `analyze` output (yellow warning when confidence is not `certain`)
- [ ] "Analyzed from existing project" badge when preset originates from `analyze --open-builder`

### P6 — Testing

- [ ] CLI command unit tests: argument parsing, flag validation, error paths
- [x] E2E: `create --preset` → install → type-check → build for minimal, saas-starter, api-only
- [x] E2E linter matrix: minimal scaffolded under each linter → install → lint clean
- [x] E2E: one full cycle per supported app type — `nextjs` / `nextjs-api-only` /
      `hono-standalone` via presets, plus `vite-react` / `astro` / `sveltekit` scaffolded,
      installed, type-checked, and built. (`remix` removed — EOL.)
- [x] E2E: registry composition — `cts add` a dependency chain → install → type-check
- [ ] Template snapshot tests: render each `.eta` file with a fixture context, assert output is stable
- [x] MCP server smoke test: basic tool coverage (`mcp/server.test.ts`)

### P7 — npm publish

- [ ] Claim `create-turbo-stack` package name (contact `hi@mislam.dev`)
- [ ] Publish `@create-turbo-stack/cli` as scoped package (fallback if name transfer takes time)
- [ ] Publish `create-turbo-stack` once name is secured
- [ ] Verify `npx create-turbo-stack` resolves and runs correctly end-to-end

### P8 — Plugin ecosystem baseline

- [ ] Finish `examples/cts-plugin-vite-vue` as the first real plugin (app type + integration)
- [ ] Verify plugin loads correctly from an npm-published package path
- [ ] Document the plugin contract in `_TEMPLATE.ts` files with working examples

### P9 — Package registry (`cts add`)

A shadcn-style registry of ready-made workspace packages (security, cache,
…). `cts add <name>` fetches a manifest and writes `packages/<name>` into an
existing monorepo — code is copied (and shown via diff preview), not hidden
behind an npm dep. The user owns and implements on top. The real value-add:
CTS ships batteries, the registry community-extends them.

- [x] `PackageRegistryItemSchema`: name, deps/devDeps, registryDependencies,
      envVars, exports, lib, `environment`, `build` (none|tsup), `categories`,
      `docs`, files[{path,target,content}]
- [x] `registry/` authoring dir + `build:registry` → `apps/web/public/r/*.json`
      + `/r/registry.json` index (mirrors the `.eta → templates-map` build).
      `include` composes per-package files → one item per file, scales to 100+
- [x] `cts add <name>`: resolve manifest (`--registry <url|path>`), materialize
      `packages/<name>` (deps → catalog, env → .env.example, files → disk),
      `--yes` for CI; write preview
- [x] `registryDependencies`: recursive, topological, cycle-safe tree resolve;
      sibling deps wired `workspace:*` + `@scope/` import rewrite
- [x] `.turbo-stack.json` state: installed packages recorded for remove/reconcile
- [x] Namespaces + auth: `registries` in `.turbo-stack.json` `config` (or an external
      `create-turbo-stack.json`); `@ns` → URL template / `{url,headers,params,publicKey}`;
      `${VAR}` resolved from `.env`/`.env.local` + shell; 401/403 surfaced
- [x] `--app` wiring; `environment` hint (node→@types/node); WebWorker lib for universal
      Web-API packages; lib-superset + catalog-conflict guardrails
- [x] Registry `envVars` wired into the load-bearing env package (typed `env.X`), not just
      `.env.example`
- [x] Reference packages: `registry/{security,crypto,session}` + authoring guide
      (`registry/README.md`)
- [x] Web browse page (`/registry`) with category tags + builder selection
- [x] Supply-chain: write preview; SHA-256 `checksum` per item (recomputed on
      add, aborts on mismatch); Ed25519 `signature` verified against a per-
      registry `publicKey`; verified checksum pinned in `.turbo-stack.json`
      (drift detection on re-add)
- [x] Gated/signed private registry server — built and validated (Next 16:
      `GET /r/[name]`, Bearer/entitlement auth → 401/403, serves signed items).
      Lives in a **separate private repo** so paid package sources stay closed;
      it imports the published `@create-turbo-stack/core` for signing/verify.
      This public repo keeps only the open protocol + free packages.
- [ ] Author more packages (cache, …) and host the registry publicly
- [ ] `build: "tsup"` + type-check `dependsOn: ^build` (compiled cross-pkg path)
- [ ] Use `cts add` packages in a demo app (prove real usage)

---

## v2.0 Scope

These are real gaps that require post-launch user data or significant scope to do correctly.

**Anonymous telemetry**
On `create` completion, send a single anonymous POST to a Supabase edge function:
session ID (random UUID stored in `~/.create-turbo-stack/config.json`), CLI version,
and preset field choices (no paths, no usernames, no machine info).
First run prints: "Anonymous telemetry is enabled. Disable: `DISABLE_TELEMETRY=1`".
Public analytics dashboard on `analytics.create-turbo-stack.dev` showing aggregate
stack choices, leading pairs, and daily creation counts — similar to better-t-stack's
analytics.sh integration. Backend: Supabase + optional streaming via Realtime.

**Demo subdomains**
Each built-in preset ships as a live deployed project:
`minimal.create-turbo-stack.dev`, `saas.create-turbo-stack.dev`, `api.create-turbo-stack.dev`.
These are the actual scaffold output committed to `apps/demo-*` and deployed to Vercel.
Purpose: prove that the tool produces real, working projects — not just file trees.

**Revenue model**
Three tiers, in order of implementation complexity:
1. GitHub Sponsors + OSS credibility — zero infrastructure, start immediately after v1.0
2. Pro presets — advanced stack combinations (AI-native, marketplace, multi-tenant SaaS)
   gated behind a license key checked at `create` time; Supabase for key storage
3. Hosted builder with team features — org-level policy, shared presets, audit log;
   requires auth (Better Auth) and server-persisted state

**Preset composition**
`extends` field in preset JSON. Team presets inherit a base preset and override specific fields.
Requires resolver changes to merge preset graphs without ambiguity.

**Registry infrastructure**
Community preset and plugin submission. PR-based first (static `registry.json`, maintainer merges).
Migrate to API-based (Supabase-backed) once adoption justifies the operational cost.

**Template versioning**
Track which tool version generated each file. When the tool updates a template,
surface the diff to users so they can accept or reject — similar to dependency update PRs.
Requires storing a template hash in `.turbo-stack.json`.

**Builder → CLI bridge**
Apply a builder-configured preset to an existing project via CLI without re-running `create`.
Needs an `apply --preset <url|file>` command. Requires A2 (reconcile) to ship first.

**Expo app type**
Full React Native scaffold via Expo. Requires new template set, `app.json` wiring,
and `eas.json` for build config.

**Vite + Vue app type**
Standard Vue 3 + Vite scaffold with Pinia, Vue Router, and TypeScript.

**Tauri app type**
Desktop shell around a web frontend. Requires Rust toolchain detection in `doctor`
and `tauri.conf.json` generation.

**Multi-user web builder**
Move from localStorage to Supabase-persisted preset state. Requires auth (Better Auth).
Scope is significant — only if adoption warrants it.

---

## Stack Expansion

These are concrete gaps versus better-t-stack and the broader ecosystem.
Items marked (v1 candidate) can be pulled into the v1 backlog if scope allows.

### Deploy

better-t-stack only ships Cloudflare. Missing options:

- **Vercel** — natural home for Next.js; `vercel.json` + monorepo config (v1 candidate)
- **Railway** — easiest backend deploy; `railway.toml` generation
- **Fly.io** — Dockerfile + `fly.toml` generation
- **Render** — `render.yaml` generation
- **Netlify** — `netlify.toml` generation

### Auth

Shipped: Supabase Auth, Better Auth, Clerk, NextAuth (Auth.js v5), Lucia. Remaining gaps:

- **Kinde** — Clerk alternative, more affordable
- **WorkOS** — enterprise SSO, B2B use cases

### Database client

When `db: postgres` + `dbSetup: supabase`, the user must be able to choose:
- `orm: drizzle | prisma` — current behavior (forced)
- `dbClient: supabase-js` — direct client with RLS, no ORM required (v1 candidate)

This is a real architectural decision in the schema: ORM and dbClient are mutually
exclusive when Supabase is the setup provider.

### Payments

- **Stripe** — global standard; checkout session, webhook handler, customer portal stubs
- **LemonSqueezy** — SaaS licensing, simpler than Stripe
- **Paddle** — VAT-inclusive pricing for EU/global
- **PayTR** — Turkey (unique differentiator; no other scaffolding tool supports this)
- **İyzico** — Turkey (same; strong adoption in Turkish dev market)
- **Shopier** — Turkey

Turkish payment providers are a strong regional differentiator.
No other Turborepo scaffolding tool covers this market.

### Package managers

- **Yarn Classic (v1)** — still widely used in legacy monorepos
- **Yarn Berry (v4, PnP)** — zero-installs, strict dependency isolation

### Addons — gaps versus better-t-stack

| Addon | Rationale |
|---|---|
| **Trigger.dev / Inngest** | Background jobs — every production SaaS needs this; better-t-stack has nothing |
| **Uploadthing / AWS S3 / Cloudflare R2** | File storage — completely absent from better-t-stack |
| **Upstash Redis** | Caching + rate limiting beyond the current rate-limit integration |
| **Meilisearch / Typesense / Algolia** | Full-text search — not offered anywhere in better-t-stack |
| **Pusher / PartyKit / Ably / Soketi** | Realtime + WebSocket — absent |
| **Payload CMS / Sanity / Keystatic** | Headless CMS as a real integration (the dead `cms` schema field was removed) |
| **OpenTelemetry / Axiom / Logtail** | Structured logging + distributed tracing beyond Sentry |
| **Changesets** | Monorepo package versioning — essential for Turborepo-first projects |
| **Playwright** | E2E testing scaffold with `playwright.config.ts` + example spec |
| **Storybook** | Component development environment |
| **Paraglide** | i18n as a framework-agnostic addon (complements next-intl) |
| **WXT** | Browser extension scaffold (better-t-stack has this; we do not) |

### Turborepo as first-class, not an addon

In better-t-stack, Turborepo is a checkbox addon.
In create-turbo-stack, it is the foundation: shared packages (ui, db, auth, api, env,
typescript-config), workspace refs, catalog deps, and turbo tasks are all generated
regardless of stack choice. This is the core architectural differentiator and must be
communicated clearly in docs and landing page copy.
