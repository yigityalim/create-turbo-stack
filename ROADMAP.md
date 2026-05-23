# Roadmap

This document is the single source of truth for what needs to happen before each milestone.
It covers architectural decisions, implementation backlog, and post-launch scope.

---

## v1.0 Definition

v1.0 ships when every item below is true — no exceptions.

- `npx create-turbo-stack` resolves to our package
- Every option the CLI prompts for produces correct output (no schema lies)
- All mutating commands (`add`, `remove`, `switch`, `upgrade`) are implemented and idempotent
- Multi-app scoping is explicit: the user always knows which apps are affected
- State reconciliation exists: `.turbo-stack.json` can be resynced from disk
- Conflict resolution policy is configurable in `create-turbo-stack.json`
- Web builder has working export (ZIP or CLI command copy)
- MCP server is smoke-tested with at least basic tool coverage
- One published plugin example exists in `examples/`
- `bun run test`, `bun run type-check`, and `bun run lint` all exit 0
- Atomic rollback works: no partial disk state survives a failed `applyDiff`

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

### P0 — Schema integrity

Every option the prompt offers must produce correct output.
If an option cannot be implemented before v1.0, remove it from the schema.

- [ ] `cms: sanity | keystatic` — resolver never reads this field; remove or implement
- [ ] `linter: eslint-prettier` — prompt accepts it, biome scaffold is produced (wrong); remove or implement real eslintrc + prettierrc
- [ ] `css: tailwind3 | vanilla | css-modules` — all three produce the tailwind4 template; remove or fork templates
- [ ] `ui: shadcn` — dep is added, `components.json` and sample components are not generated
- [ ] `ui: radix-raw` — dep is added, zero components generated

### P1 — CLI completeness

All lifecycle commands must exist, work, and be usable in CI (non-interactive).

- [ ] `add dependency <pkg> --to=<workspace>` — missing entirely
- [ ] `remove app <name>` — requires `delete` mutation type in diff engine
- [ ] `remove package <name>`
- [ ] `remove integration <category>` — revert provider to `none`, clean up stale files
- [ ] `switch <category> <provider>` — delete old provider files before writing new ones
- [ ] `upgrade` — migrate `.turbo-stack.json` between schema versions via migration registry
- [ ] `reconcile` — resyncs state file from disk (see A2)
- [ ] `--dry-run` flag on all mutating commands (`add`, `remove`, `switch`, `upgrade`)
- [ ] Non-interactive flags for all `add` subcommands (`--name`, `--type`, `--port`, etc.)

### P2 — Architectural resolutions

Implement the three architectural decisions above.

- [ ] A1: Multi-app scoping — `--app` flag + interactive fallback; wire `targetApps` into `applyDiff`
- [ ] A2: State reconciliation — implement `reconcile` command
- [ ] A3: Conflict resolution policy — add to `UserConfigSchema`, wire into `applyDiff`

### P3 — Core correctness

- [ ] Atomic rollback: snapshot pre-state before any write; restore on any failure in `applyDiff`
- [ ] `add integration` idempotency: detect if provider is already active, skip silently or warn
- [ ] Incremental workspace refs: when a new package is added, wire existing apps that match `consumes`

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
- [ ] PostHog provider injected into `app/layout.tsx` when `analytics: posthog`
- [ ] Sentry wired in `instrumentation.ts` + layout import when `errorTracking: sentry`

**UI:**
- [ ] shadcn: generate `components.json` + sample Button and Card components
- [ ] Tailwind `globals.css` with CSS variable theme scaffold (not just an import)

**Routing:**
- [ ] `app/error.tsx`, `app/not-found.tsx`, `app/loading.tsx` generated for Next.js
- [ ] next-intl: `[locale]/layout.tsx` + `messages/` + `middleware.ts` when `i18n: true`

**Local development:**
- [ ] `docker-compose.yml` generated when `dbSetup: docker`
- [ ] `db/seed.ts` stub + `db:seed` turbo task wired
- [ ] Root `README.md` generated with stack summary and setup steps

**CI:**
- [ ] `.github/workflows/ci.yml` generated (lint, type-check, test, build)

### P5 — Web builder

- [ ] ZIP download of full file tree (JSZip — already listed as post-v1.0, move up)
- [ ] Preset metadata editor in sidebar (name, description, author — schema fields exist, UI missing)
- [ ] "Copy as CLI command" button: `npx create-turbo-stack --preset <share-url>`
- [ ] Status toasts: "Loaded from URL", "Saved to browser" (event bus emits, UI does not display)
- [ ] File tree sort memoization (`useMemo` — currently re-sorts on every render)
- [ ] Confidence indicators from `analyze` output (yellow warning when confidence is not `certain`)
- [ ] "Analyzed from existing project" badge when preset originates from `analyze --open-builder`

### P6 — Testing

- [ ] CLI command unit tests: argument parsing, flag validation, error paths
- [ ] E2E: `create --preset minimal` → install → `bun run build` → `bun run type-check` (exits 0)
- [ ] E2E: one full cycle per supported app type (nextjs, hono-standalone, vite-react, sveltekit, astro, remix)
- [ ] Template snapshot tests: render each `.eta` file with a fixture context, assert output is stable
- [ ] MCP server smoke test: start server, call each tool, assert response shape

### P7 — npm publish

- [ ] Claim `create-turbo-stack` package name (contact `hi@mislam.dev`)
- [ ] Publish `@create-turbo-stack/cli` as scoped package (fallback if name transfer takes time)
- [ ] Publish `create-turbo-stack` once name is secured
- [ ] Verify `npx create-turbo-stack` resolves and runs correctly end-to-end

### P8 — Plugin ecosystem baseline

- [ ] Finish `examples/cts-plugin-vite-vue` as the first real plugin (app type + integration)
- [ ] Verify plugin loads correctly from an npm-published package path
- [ ] Document the plugin contract in `_TEMPLATE.ts` files with working examples

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

- **Supabase Auth** — huge omission in better-t-stack; works with RLS without any ORM (v1 candidate)
- **Auth.js / NextAuth v5** — still the most widely used in the Next.js ecosystem
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
| **Payload CMS / Sanity / Keystatic** | Headless CMS as a first-class option, not dead schema field |
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
