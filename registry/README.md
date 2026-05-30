# create-turbo-stack registry — authoring guide

This directory is the **source** of the CTS package registry: ready-made
Turborepo workspace packages that `cts add <name>` copies into a user's
monorepo. It's shadcn's registry model, but for whole packages instead of
React components — the code is **copied in and owned**, not hidden behind an
npm dependency.

If you are an agent asked to write a package, read this whole file first, then
follow the **Checklist** at the bottom.

---

## Mental model

```
registry/<name>/registry-item.json   the manifest (metadata + which files)
registry/<name>/src/*.ts             the real, working source you author
        │
        ▼  bun run build:registry   (inlines file contents, stamps checksum)
apps/web/public/r/<name>.json        the served artifact cts add fetches
        │
        ▼  cts add <name>
packages/<name>/ in the user's repo  (package.json, tsconfig, your src/*)
```

You write the left side. The build and `cts add` do the rest. This is the same
producer/consumer split as `.eta → templates-map` elsewhere in the repo.

## Directory convention — one folder per package

```
registry/
  my-package/
    registry-item.json     ← the manifest
    src/
      index.ts             ← your code (real, compiles, tested in your head)
      ...
```

The root `registry/registry.json` auto-discovers every package via
`"include": ["*/registry-item.json"]` — **you do not edit it** when adding a
package. Just drop a new folder with a `registry-item.json` and it's in.

## The manifest (`registry-item.json`)

```jsonc
{
  "$schema": "https://create-turbo-stack.dev/schema/package-registry.json",
  "name": "my-package",            // kebab-case, unique across the registry
  "type": "registry:package",
  "title": "My Package",           // shown on the web browse page
  "description": "One sentence on what it does and why.",
  "dependencies": ["zod@^4"],      // npm runtime deps → merged into the catalog
  "devDependencies": [],           // npm dev deps → merged into the catalog
  "registryDependencies": [],      // OTHER registry packages this one composes
  "exports": [".", "./sub"],       // subpath exports the package.json declares
  "environment": "universal",      // "node" | "browser" | "universal" (optional)
  "lib": ["ES2022", "DOM"],        // TS lib, only if you use Web/DOM types
  "build": "none",                 // "none" (source export) | "tsup" (compiled)
  "categories": ["security"],      // browse-page grouping tags
  "envVars": { "MY_KEY": "example-value" }, // appended to .env.example on add
  "docs": "Short usage note printed after `cts add`.",
  "files": [
    { "path": "src/index.ts", "type": "registry:source", "target": "src/index.ts" }
  ]
}
```

### Fields that matter most

| Field | Why it matters |
|-------|----------------|
| `name` | kebab-case, unique. Becomes `packages/<name>` and `@scope/<name>`. |
| `dependencies` / `devDependencies` | npm specs `name` or `name@version`. Merged into the **root catalog** (`catalog:`), never written as fixed versions in the package. |
| `registryDependencies` | Names of other registry packages. Pulled in first (see below). |
| `exports` | `"."` → `./src/index.ts`. `"./hash"` → `./src/hash.ts`. With `build: "tsup"`, points at `./dist/*` instead. So a file per export. |
| `environment` | `"node"` adds `@types/node` + tsconfig `types: ["node"]`. Use it whenever you import `node:*` or touch `process`. `"browser"`/`"universal"` add nothing — rely on `lib`. |
| `lib` | For universal Web-API code (`fetch`, `crypto`, `Request`, `TextEncoder`) use `["ES2022", "WebWorker"]` — it exposes those APIs but NOT `document`/`window`, so a stray browser-only call fails at compile time instead of crashing in Node. Use `["ES2022", "DOM"]` only for genuine browser/DOM packages. Omit otherwise. |
| `build` | `"none"` (default): exports `./src` directly, no build step — the right choice for almost everything. `"tsup"`: compiled to `dist`, for packages meant to be published to npm. |
| `envVars` | Vars the package reads. Appended to the user's `.env.example` (existing keys are never clobbered). |
| `docs` | Markdown, printed after install and shown on the browse page. Keep it to the one thing a user must know. |

### Composing packages (`registryDependencies`)

A package can build on another. Declare the dependency and import siblings
through the **`{{scope}}` placeholder** — the resolver rewrites it to the
user's real scope (`@their-project/`) on materialize and wires
`workspace:*` automatically.

```jsonc
// registry/session/registry-item.json
{ "name": "session", "registryDependencies": ["crypto"], ... }
```

```ts
// registry/session/src/index.ts
import { randomToken, sha256 } from "{{scope}}/crypto"; // ← placeholder, substituted at install
```

`cts add session` pulls `crypto` first, writes both packages, and the
session package.json gets `"@their-project/crypto": "workspace:*"`.

> **Note on `@scope/`** — older versions of this guide used `@scope/` as the
> sibling-import placeholder. That's been unified onto `{{scope}}` so add-on
> and slot-filling items share one substitution vocabulary. Existing items
> are migrated; new items use `{{scope}}` exclusively.

**Runtime sharing rule:** if your package consumes a Web-API source package
(e.g. one with `lib: ["ES2022","WebWorker"]`), declare the same `lib` so the
shared types resolve. `cts add` warns when a dependency's `lib` isn't covered
by yours. (Or that dependency uses `build: "tsup"` and ships its `.d.ts`.)

## Build & verify

```bash
bun run build:registry     # inlines files, stamps a sha256 checksum per item
```

Every built item gets a `checksum` over its code + dependency graph. `cts add`
recomputes it after download and **refuses to install on a mismatch** — so
authoring carelessly can't ship corrupted content. Private/paid registries
additionally **sign** the checksum (Ed25519); consumers verify with a public
key configured per registry in `create-turbo-stack.json`.

To sanity-check your package actually compiles in a real project:

```bash
# in a scaffolded test project
cts add my-package --registry /path/to/create-turbo-stack/apps/web/public/r
bun install && bun run type-check
```

## Rules

- **Real, working code.** The source must compile and do what the description
  says. A user reads and owns it.
- **kebab-case names**, unique across the registry.
- **No secrets** in source or `envVars` values — only example placeholders.
- **No fixed dependency versions in the package** — list them in
  `dependencies`/`devDependencies`; they flow through the catalog.
- **Minimal surface.** Prefer `build: "none"`. Add `environment`/`lib` only
  when the code actually needs those types.
- **One concern per package.** Compose with `registryDependencies` instead of
  bundling unrelated helpers.
- **`universal` means prove it.** If you claim `environment: "universal"`, the
  `WebWorker` lib stops you from compiling against `document`/`window`, but you
  should still have a test that runs under **both Node and a jsdom/browser**
  environment — "compiles" is not "runs on both runtimes".

## Checklist for a new package

1. `registry/<name>/src/*.ts` — write the working source. Use
   `{{scope}}/<dep>` for any sibling registry import.
2. `registry/<name>/registry-item.json` — manifest: `name`, `description`,
   `exports` (one per file you expose), `dependencies`, and `environment`/`lib`
   only if needed. Add `docs` and `categories`.
3. `bun run build:registry` — confirm your package appears with a `checksum`.
4. `cts add <name> --registry apps/web/public/r` into a scratch project;
   `bun install && bun run type-check` — confirm it compiles.

## Reference packages

- `security/` — Web-API (`lib: WebWorker`), multiple exports, no deps.
- `crypto/` — Web Crypto helpers, multiple exports.
- `session/` — composes `crypto` via `registryDependencies` + `{{scope}}/` import.

For a `node`-environment package and the private/signed flow, the same manifest
shape applies — set `"environment": "node"` and serve it from a gated registry.

---

# First-party (slot-filling) items

The packages above (`crypto`, `security`, `session`) are **add-ons** — a user
runs `cts add session` to pull them in. There is a second class of registry
item that the engine pulls in **automatically** based on preset choices.
These are organised by slot:

```
registry/
  apps/             slot: "app"            — Next.js, Expo, SvelteKit, …
  auth/             slot: "auth"           — better-auth, clerk, supabase-auth, …
  db/               slot: "db"             — drizzle-postgres, prisma-mysql, …
  api/              slot: "api"            — trpc, hono-standalone, hono-route
  env/              slot: "env"            — t3-env
  email/            slot: "email"          — resend, sendgrid, plunk
  monitoring/       slot: "monitoring"     — sentry, bugsnag
  analytics/        slot: "analytics"      — posthog, plausible, vercel-analytics
  rate-limit/       slot: "rate-limit"     — upstash-ratelimit
  ai/               slot: "ai"             — vercel-ai-sdk, openai
  cache/            slot: "cache"          — upstash-redis
  typescript-config/  slot: "typescript-config"  — shared tsconfigs
  ui/               slot: "ui"             — shadcn-starter, …
```

Each subdirectory holds one item per **variant** — typically one variant per
value in the matching preset enum (e.g. `auth/better-auth/`, `auth/clerk/`,
`auth/supabase-auth/`). Inside each variant directory the layout is exactly
the same as an add-on: `registry-item.json` + `src/`.

## Slot → preset field mapping

| Slot | Preset field that picks the variant | Example variant ids |
|------|--------------------------------------|----------------------|
| `app` | `preset.apps[i].type` | `nextjs`, `expo`, `sveltekit`, `vite-react`, `hono-standalone` |
| `auth` | `preset.auth.provider` | `better-auth`, `clerk`, `supabase-auth`, `authjs` |
| `db` | `preset.database.strategy` + `driver` | `drizzle-postgres`, `drizzle-sqlite`, `prisma-postgres` |
| `api` | `preset.api.strategy` (+ `mode`) | `trpc`, `hono-standalone`, `hono-route` |
| `env` | always when `integrations.envValidation != "none"` | `t3-env` |
| `email` | `integrations.email` | `resend`, `sendgrid`, `plunk` |
| `monitoring` | `integrations.errorTracking` | `sentry`, `bugsnag` |
| `analytics` | `integrations.analytics` | `posthog`, `plausible`, `vercel-analytics` |
| `rate-limit` | `integrations.rateLimit` | `upstash-ratelimit` |
| `ai` | `integrations.ai` | `vercel-ai-sdk`, `openai` |
| `cache` | `integrations.cache` | `upstash-redis` |
| `typescript-config` | always (foundational) | `default` |
| `ui` | `producesCSS` user package (opt-in) | `shadcn-starter` |

Variant ids are **kebab-case** and exactly match the enum value where one
exists (so the engine can look up the item with `(slot, variant)` straight
from the preset).

## Manifest additions

A slot-filling item declares `slot` and `variant` in its manifest:

```jsonc
{
  "$schema": "https://create-turbo-stack.dev/schema/package-registry.json",
  "name": "env-t3",                  // unique across the whole registry
  "type": "registry:package",
  "slot": "env",                     // ← new
  "variant": "t3-env",               // ← new
  "title": "Env (t3-env)",
  "description": "Type-safe environment variables via @t3-oss/env-nextjs.",
  "dependencies": ["@t3-oss/env-nextjs", "zod"],
  "exports": ["."],
  "environment": "universal",
  "categories": ["foundation"],
  "files": [
    { "path": "src/index.ts", "type": "registry:source", "target": "src/index.ts" }
  ]
}
```

Add-on items continue to omit `slot` / `variant` — that's the signal to the
engine that they're user-add targets, not preset-driven ones.

## Placeholders

Slot items are **real `.ts` files** — they compile and lint inside this
registry repo. But the user's project will land them under a different scope
and inside a different package name, so we use a small placeholder vocabulary
the resolver substitutes on materialise. **Do not invent your own placeholders.**

| Placeholder | Resolves to | Example |
|-------------|-------------|---------|
| `{{scope}}` | `preset.basics.scope` | `@saas` |
| `{{pkg-name}}` | The auto-package short name | `env`, `db`, `auth`, … |
| `{{pkg-import}}` | `{{scope}}/{{pkg-name}}` shortcut | `@saas/env` |
| `{{pm-install}}` | PM-aware install command | `bun install` |
| `{{pm-run}}` `<script>` | PM-aware run command | `bun run dev` |
| `{{pm-add}}` `<spec>` | PM-aware install command | `bun add zod` |
| `{{pm-exec}}` `<bin>` | PM-aware exec command | `bunx tsx` |

Substitution is plain string replace — no Eta, no JS expressions, no
conditionals. **Write the source as if `scope` is literally `{{scope}}`** —
the file should still compile (TS doesn't choke on `{{scope}}/env` inside a
string). Anything beyond that, see the next section.

## No conditionals — write more items instead

The CTS source tree used to branch via Eta (`<% if driver === 'postgres' %>`)
and that complexity is what we're moving away from. The registry replaces
runtime conditionals with **one item per combination**:

- ❌ One `db-drizzle` item that branches on `driver`.
- ✅ Three items: `db-drizzle-postgres`, `db-drizzle-sqlite`,
  `db-drizzle-mysql`. Each is a flat, lint-passing source tree.

When a registry item needs a sibling registry item (`auth` needing the
generated `env` package, say), declare it via `registryDependencies` and
import via `{{scope}}/<sibling>`. The resolver guarantees the sibling lands
first.

## Integration items — one template, six slots

`email/`, `monitoring/`, `analytics/`, `rate-limit/`, `ai/`, `cache/` all
follow the **same recipe** — they're optional integrations the user picks
via `preset.integrations.<category>`. There is no per-slot README for these
because the shape is identical; the only thing that changes is which
provider's SDK you're wrapping.

Recipe for any integration item (`<slot>/<variant>/`):

1. `slot: "<one of email|monitoring|analytics|rate-limit|ai|cache>"`,
   `variant: "<provider-name>"` (e.g. `"resend"`, `"sentry"`, `"posthog"`).
2. Expose a small, single-purpose API from `<scope>/<slot>`:
   - `email` → `sendEmail({ to, subject, react })`
   - `monitoring` → SDK init at boot + a `captureException` helper
   - `analytics` → `capture(event, props)` server + client wrappers
   - `rate-limit` → configured `ratelimit` instance + `withRateLimit` HOF
   - `ai` → configured client + a streaming route handler example
   - `cache` → configured client + `cached(key, ttl, fn)` helper
3. Declare provider secrets in `envVars` (e.g. `{ "RESEND_API_KEY": "re_…" }`).
4. `registryDependencies: ["env-t3"]` always — these items read env.
5. `environment: "node"` for HTTP-client based providers (most of them);
   `"universal"` only for edge-compatible clients like Upstash REST.

If a registry author finds themselves wanting to extend the manifest or
introduce a new placeholder for an integration item, that's the signal to
pause and reach out — these slots are deliberately uniform.

## Authoring checklist for an agent

Given a slot and a variant (e.g. "write `auth/better-auth`"):

1. **Research the provider's canonical setup.** Use the official quickstart
   docs. Aim for the smallest config that's actually production-grade —
   middleware wired, env vars listed, types exposed.
2. **Create `registry/<slot>/<variant>/`** with:
   - `registry-item.json` — manifest with `slot` + `variant` populated.
   - `src/*.ts` — the working source. `{{scope}}` and `{{pkg-name}}` for any
     workspace import.
   - `README.md` — one short paragraph + "After install" steps the user runs.
3. **Declare deps as `name@^x.y.z`** in `dependencies` (or `devDependencies`
   for tooling-only). They merge into the catalog — never write versions in
   the package itself.
4. **Declare `envVars`** for anything the package reads at runtime
   (`{ "RESEND_API_KEY": "re_…" }`). These get appended to the generated env
   schema AND `.env.example` automatically.
5. **Declare `registryDependencies`** if you import from a sibling
   slot (e.g. `auth/better-auth` likely needs the generated `env` package —
   declare `["env-t3"]` so the resolver materializes env first).
6. **Pick `environment` honestly**: `node` if you import `node:*` or touch
   `process`; `universal` for runtime-agnostic code; `browser` for pure
   client.
7. **Verify**: `bun run build:registry` (item appears with a checksum), then
   `cts add <name> --registry apps/web/public/r` into a scratch project +
   `bun install && bun run type-check`.

The single best example to copy from is **`env/t3-env/`** — it's small,
shows `{{scope}}` use, declares `envVars`, and has a sensible `description`.

## What's NOT in the registry

The engine still owns the **rules**, not the **content**:

- `computeWorkspaceRefs` — which packages each app depends on.
- `computeCatalog` — merging all packages' deps into one catalog.
- `computeCssSourceMap` — Tailwind `@source` map across packages.
- `computeTsconfigChain` — tsconfig extends graph.
- Preset validation, schema migration, atomic apply, diff/conflict policy.

If you're tempted to put any of that in an item, stop — it belongs in
`packages/core/src/wiring/`.
