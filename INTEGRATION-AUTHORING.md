# Authoring an Integration Package for create-turbo-stack

> **Audience.** This file is written for an AI coding agent (or a human)
> who has been asked to add a built-in integration provider to
> create-turbo-stack — e.g. *"write the SMS package for create-turbo-stack,
> provider Netgsm, abstracted so Twilio can be added later"*, or
> *"add the cache package"*, or *"add a Loops email provider"*.
>
> Read this whole file before writing anything. It describes exactly how
> CTS turns a user's selection into files on disk, where your `.eta`
> templates go, and the complete checklist of edits. Do **not** rely on
> prior knowledge of how the codebase is shaped — the chain below is the
> ground truth as of this writing.

---

## 0. Two different "package" systems — don't confuse them

CTS has **two** ways a package can end up in a generated project. This
guide is about the **first** one only.

| | **Built-in integration** (this guide) | **`cts add` registry** (`registry/README.md`) |
|---|---|---|
| Selected via | Builder checkbox / CLI prompt / preset JSON | `cts add <name>` after the project exists |
| Lives in | `packages/core` + `packages/templates` + `packages/schema` | a registry JSON served over HTTP |
| Examples | `auth`, `db`, `email`, `analytics`, `rate-limit`, `ai` | community/company packages, shadcn-for-packages |
| Output | a `packages/<name>` workspace package, fully wired | same, materialised at add-time |
| Contract | `defineIntegration({...})` (TypeScript) | a registry item with `files`/`include` |

If the task is *"ship this as a provider users pick in the builder"* →
**this guide**. If it's *"publish a standalone installable package"* →
that's the registry; see `registry/README.md`.

---

## 1. The one principle that governs everything

> **A Preset is the universal contract.** Every entry point (CLI prompts,
> web builder, preset JSON, MCP) produces a single `Preset` object. Core
> consumes it and emits a flat list of files. Your integration's job is to
> describe *what's different about your provider* — its npm deps, its env
> vars, and its source files — and let the shared machinery do the rest.

`packages/core` is **platform-agnostic**: it runs in Node *and* in the
browser (the web builder previews the file tree live). So **never** import
`fs`, `path`, `child_process`, or any Node API in core. Your provider
definition is pure data + pure functions.

---

## 2. What CTS does when a user selects your provider

This answers the literal question *"what happens when the user picks
`sms: netgsm` in the builder?"*. Trace it once and the rest of the guide
makes sense.

```
User toggles "Netgsm SMS" in the builder
        │
        ▼
Preset.integrations.sms = "netgsm"          ← a schema enum value
        │
        ▼
resolveFileTree(preset)  (packages/core)
        │
        ├─ resolveAutoPackages(preset)
        │     sees integrations.sms !== "none"
        │     → adds a Package { name: "sms", type: "library", … }
        │
        ├─ for that "sms" package → resolvePackageFiles(preset, pkg)
        │     CATEGORY_BY_PACKAGE["sms"] === "sms"
        │     activeProvider(preset, "sms") === "netgsm"
        │     getIntegration("sms", "netgsm").resolvePackageFiles(preset, ctx)
        │        → ctx.makeBase({...})              → package.json + tsconfig
        │        → renderSourceFiles("integration/sms/netgsm", base, ctx)
        │              renders every  packages/templates/src/integration/sms/netgsm/**/*.eta
        │              into  packages/sms/src/**.ts
        │
        ├─ computeCatalog(preset)
        │     getIntegration("sms","netgsm").catalogEntries(preset)
        │     → adds your npm deps to the root workspace catalog
        │
        └─ computeEnvChain(preset)
              getIntegration("sms","netgsm").envVars(preset)
              → your env vars land in the typed `env` package + .env.example
```

Net effect: a selection of `netgsm` produces a fully-wired
`packages/sms` package — `package.json` with `catalog:` deps, a
`tsconfig.json` that inherits the shared base, typed env access, and your
rendered source — and the app(s) can `consumes: ["sms"]` it.

**Wiring is the value, not file count.** A correct `catalog:` entry, a
correct env chain, a correct tsconfig `extends` — that's what CTS sells.

---

## 3. The `defineIntegration` contract

Every provider is one call to `defineIntegration({...})`. The full
contract (`packages/core/src/integrations/types.ts`):

```ts
interface IntegrationDefinition {
  category: IntegrationCategory;          // "sms" | "email" | "auth" | …
  provider: string;                       // "netgsm", the enum discriminant

  // npm packages added to the root workspace catalog. Required.
  catalogEntries(preset: Preset): readonly { name: string; version: string }[];

  // Env vars this provider needs. Optional. Flow into the `env` package.
  envVars?(preset: Preset): {
    server?: readonly EnvVarSpec[];
    client?: readonly EnvVarSpec[];
  };

  // Scaffold the workspace package (packages/sms). Optional but you'll
  // almost always want it. ctx.makeBase() emits package.json + tsconfig;
  // renderSourceFiles(...) renders your .eta on top.
  resolvePackageFiles?(preset: Preset, ctx: PackageResolveContext): FileTreeNode[];

  // Inline templates — ONLY for third-party plugins shipped as npm
  // packages that can't fork packages/templates. Built-in providers
  // (what you're writing) leave this UNSET and put .eta files in
  // packages/templates instead.
  templates?: Record<string, string>;
}
```

`EnvVarSpec`:

```ts
{ name: "NETGSM_USERCODE", zodType: "z.string().min(1)",
  example: "8500000000", description: "Netgsm user code (line number)" }
```

`PackageResolveContext` (what `resolvePackageFiles` receives):

```ts
{
  pkg, base, scope,            // base = "packages/sms", scope = "@acme"
  makeBase({ deps?, devDeps?, react? }): FileTreeNode[],
  env: {                       // load-bearing env wiring, see §6
    enabled: boolean,
    workspaceDep: Record<string,string>,   // { "@acme/env": "workspace:*" } or {}
    context: { envImport, envRef, envRefOpt },
  },
}
```

A real, minimal reference — copy its shape:

```ts
// packages/core/src/integrations/email.ts (the nodemailer provider)
export const nodemailer = defineIntegration({
  category: "email",
  provider: "nodemailer",
  catalogEntries: () => [{ name: "nodemailer", version: VERSIONS.nodemailer }],
  envVars: () => ({
    server: [
      { name: "SMTP_HOST", zodType: "z.string().min(1)", example: "smtp.gmail.com", description: "SMTP host" },
      // …
    ],
  }),
  resolvePackageFiles: (_preset, ctx) => [
    ...ctx.makeBase({ deps: { nodemailer: "catalog:", ...ctx.env.workspaceDep } }),
    ...renderSourceFiles("integration/email/nodemailer", ctx.base, { ...ctx.env.context }),
  ],
});
```

Note the three things `resolvePackageFiles` always does:
1. `ctx.makeBase({ deps })` — deps reference `"catalog:"`, never a literal
   version. The version lives in the catalog (from `catalogEntries`).
2. `...ctx.env.workspaceDep` in deps — adds `@scope/env` *only if env
   validation is on*. Don't hardcode it.
3. `renderSourceFiles("integration/<category>/<provider>", ctx.base, ctx)`
   — renders your `.eta`. **Whatever you put in that context object is the
   only data your templates can see.** See §5.

---

## 4. Where the `.eta` files go, and how the key is derived

**Built-in provider templates live in `packages/templates`**, never inline
in core.

```
packages/templates/src/integration/<category>/<provider>/<path>.eta
                                    └── e.g. sms/netgsm/src/index.ts.eta
```

The build script (`packages/templates/scripts/build-templates.ts`) walks
`src/`, and for anything under `integration/` it takes the **first three
path segments** as the *template key* and the rest as the *file path*:

```
src/integration/sms/netgsm/src/client.ts.eta
    └ key:  "integration/sms/netgsm"
    └ file: "src/client.ts"     (the .eta suffix is stripped on render)
```

So `renderSourceFiles("integration/sms/netgsm", "packages/sms", ctx)`
renders every `.eta` under that directory into `packages/sms/src/...`.

> ⚠️ **Exception — error tracking.** The `errorTracking` category maps to
> the `monitoring` template folder and the `monitoring` package name. If
> you're adding an `errorTracking` provider, its templates go in
> `src/integration/monitoring/<provider>/`. Every other category uses its
> own name. (See `templateCategoryFor` in
> `packages/core/src/integrations/registry.ts`.)

After adding or editing any `.eta`, you **must** regenerate the bundled
map:

```bash
cd packages/templates && bun run build:templates
```

This rewrites `src/templates-map.ts` (auto-generated, committed). Core and
the browser builder both read from that map, not from the `.eta` files at
runtime.

---

## 5. The `.eta` contract — what you can and can't reference

Templates use **Eta 4** syntax: `<%= expr %>` outputs, `<% code %>` runs
logic, `it.` prefixes every context variable.

**Critical gotcha:** a template can *only* reference what the
`resolvePackageFiles` call passes into `renderSourceFiles`'s context. The
built-in providers pass `{ ...ctx.env.context }`, so the available
variables are exactly:

| `it.*` | What it is |
|---|---|
| `it.envImport` | `import { env } from "@scope/env";` when env validation is on, else `""` |
| `it.envRef("X")` | `env.X` (validated) or `process.env.X!` (fallback) — for **required** vars |
| `it.envRefOpt("X")` | `env.X` or `process.env.X` (no `!`) — for **optional** vars |

If your template needs anything else (e.g. `it.scope`), you must add it to
the context object in `resolvePackageFiles`, e.g.
`renderSourceFiles(key, ctx.base, { ...ctx.env.context, scope: ctx.scope })`.
**Don't reference `it.foo` that isn't passed — it renders as `undefined`.**

Real example (`email/react-email-resend/src/client.ts.eta`):

```eta
<% if (it.envImport) { -%>
<%= it.envImport %>
<% } -%>
import { Resend } from "resend";

const resend = new Resend(<%= it.envRefOpt("RESEND_API_KEY") %>);
```

Two more rules:

- **Always emit env access through `it.envRef`/`it.envRefOpt`**, never raw
  `process.env.X`. The `env` package is load-bearing in CTS; this is how a
  provider works both with and without env validation. (See §6.)
- **Empty render = skipped file.** If a template renders to whitespace
  only, the file is not written. This lets you make a file conditional:
  `<% if (cond) { %>…<% } %>`.

---

## 6. Env: the package is load-bearing

When env validation is on (`integrations.envValidation`, default `true`),
CTS generates an `env` package that validates `process.env` at boot with
typed t3-env-style Zod schemas. Your provider's `envVars()` entries are
collected by `computeEnvChain` (`packages/core/src/wiring/env-chain.ts`),
which iterates every active integration category automatically — **you do
not wire env yourself**, you just declare `envVars()` and the chain picks
it up.

Then in your `.eta` you read the typed value via `it.envRef("NETGSM_USERCODE")`
→ renders to `env.NETGSM_USERCODE`. When validation is off it falls back to
`process.env.NETGSM_USERCODE!`. This is why templates must go through the
helpers.

For the package to import from `env`, add `...ctx.env.workspaceDep` to its
deps (it's `{}` when validation is off, so it's safe to always spread).

---

## 7. Designing for future providers (the abstraction the task asks for)

The request is usually *"write Netgsm, abstracted so Twilio can be added
later."* Here's what that means concretely in CTS terms.

- Each provider is a **separate enum value** and a **separate template
  folder**. Only **one** is active at a time (the category is a single
  enum, not a multi-select). `netgsm` and a future `twilio` both produce a
  `packages/sms` package — never both at once.
- "Abstraction" therefore means: **the package's public API is
  provider-neutral**, so swapping `netgsm` → `twilio` later changes only
  the internal client, not any consumer code. Design the package's
  `index.ts` to export a stable surface:

  ```ts
  // packages/sms/src/index.ts — same shape for every SMS provider
  export interface SendSmsInput { to: string; message: string; from?: string; }
  export interface SendSmsResult { id: string; provider: string; }
  export interface SmsProvider {
    sendSms(input: SendSmsInput): Promise<SendSmsResult>;
  }
  export { sms } from "./client";   // the concrete provider instance
  ```

  The `netgsm` template fills `./client` with a Netgsm implementation of
  `SmsProvider`. When Twilio is added later, its template fills `./client`
  with a Twilio implementation of the **same** interface — and `to`,
  `message`, `sendSms(...)` stay identical for whoever consumes the
  package. Keep provider-specific types (Netgsm response shapes, etc.)
  internal to `./client`, never in the public exports.

- Put the shared, provider-neutral pieces (the `SmsProvider` interface,
  input/output types) in files that you'd copy verbatim into the next
  provider, and keep the provider-specific HTTP/SDK calls isolated in one
  file.

---

## 8. The agent's working rules for writing the source

When you (the agent) actually write the provider's implementation:

1. **Read the official docs. Do not trust your own memory of the API.**
   Netgsm's HTTP endpoints, parameter names, auth scheme, and response
   formats change and are easy to misremember. Fetch the current docs,
   cite the exact endpoint/params you used, and implement against those.
   If you can't verify a detail, say so rather than inventing it.
2. **Output `.eta` templates, not loose `.ts`.** Everything that becomes
   project source must be an `.eta` under
   `packages/templates/src/integration/<category>/<provider>/`.
3. **Route every secret through env.** API keys, user codes, passwords →
   declared in `envVars()` and read via `it.envRef`/`it.envRefOpt`. Never
   hardcode, never raw `process.env`.
4. **Catalog versions go in one place.** Add the npm version to
   `packages/core/src/wiring/versions.ts` (the `VERSIONS` map) and
   reference `VERSIONS.netgsm` in `catalogEntries`; deps in the package use
   `"catalog:"`.
5. **Keep core platform-agnostic.** No Node APIs in the definition file.
   (The generated *project* code can use `fetch`, Node, etc. — that's
   template output, not core.)
6. **Hand the `.eta` + the definition diff back for placement.** The repo
   owner will run the build/test steps with you.

---

## 9. Checklist A — add a provider to an **existing** category

Use this when the category already exists (e.g. another `email` provider
like Loops, another `auth` provider, another `errorTracking` provider).
Engine derives everything except your specific pieces — **3 required
edits**, optionally a 4th for npm version + a 5th for builder polish.

**Required:**

1. **Schema enum** — add the value in
   `packages/schema/src/options/integrations.ts` (or `options/auth.ts`,
   `options/database.ts`, `options/api.ts` for the top-level slots). E.g.
   `ErrorTrackingSchema = z.enum(["sentry", "bugsnag", "none"])`.
2. **Provider definition** — add a `defineIntegration({...})` entry in the
   matching category file (`packages/core/src/integrations/<cat>.ts`) and
   append it to the exported `<cat>Integrations` array.
3. **Templates** — create
   `packages/templates/src/integration/<pkgName>/<provider>/src/*.eta`,
   then `cd packages/templates && bun run build:templates`. `<pkgName>` is
   the category name **unless** the category remaps it
   (`errorTracking` → `monitoring`, `rateLimit` → `rate-limit`,
   `database` → `db`) — see §4.

**Optional polish:**

4. **Versions** — add the npm version to
   `packages/core/src/wiring/versions.ts` (`VERSIONS.foo`), then reference
   `VERSIONS.foo` from `catalogEntries`. Skip if your provider uses only
   `fetch` (no SDK).
5. **Builder labels** — add `LABELS["category.provider"]` in
   `apps/web/src/lib/preset/schema-meta.ts` so the dropdown shows a nice
   name. Without it, the value still appears (humanized fallback).
6. **JSON Schema regen** — `cd packages/schema && bun run generate:schema`
   keeps `apps/web/public/schema/preset.json` in sync. CI will catch drift.

**Live demo in this repo:** the `bugsnag` provider in
`packages/core/src/integrations/error-tracking.ts` — exactly three edits
(schema enum + definition + one `.eta`).

**The engine auto-picks-up the new provider** in: catalog, env chain, CLI
prompt (`create` + `add integration`), `remove integration`, builder
dropdown, registry-sync guardrail test. No edits there.

---

## 10. Checklist B — add a **new** category (e.g. `cache`, `sms`)

A whole new category needs the schema contract + one core file + the
`.eta`. The engine derives the rest (the union, dispatch, auto-packages,
prompts, builder dropdown, registry-sync test — all auto-pick-up the new
category from the schema).

**Required (engine):**

1. **`packages/schema/src/options/integrations.ts`** — add the enum,
   extend `IntegrationsSchema`, and add the provider-values entry. Three
   lines in one file:
   ```ts
   export const CacheSchema = z.enum(["upstash", "none"]);
   export type Cache = z.infer<typeof CacheSchema>;

   export const IntegrationsSchema = z.object({
     // …existing…
     cache: CacheSchema.default("none"),
     envValidation: z.boolean().default(true),
   });

   export const INTEGRATION_PROVIDER_VALUES = {
     // …existing…
     cache: CacheSchema.options,
   } as const;
   ```

2. **`packages/core/src/integrations/<category>.ts`** (new file) — the
   `defineIntegration({...})`. Mirror `cache.ts`:
   ```ts
   import { renderSourceFiles } from "../render/render-source";
   import { VERSIONS } from "../wiring/versions";
   import { defineIntegration } from "./types";

   export const upstashCache = defineIntegration({
     category: "cache",
     provider: "upstash",
     label: "Upstash Redis cache",
     catalogEntries: () => [{ name: "@upstash/redis", version: VERSIONS.upstashRedis }],
     envVars: () => ({ server: [/* … */] }),
     resolvePackageFiles: (_preset, ctx) => [
       ...ctx.makeBase({ deps: { "@upstash/redis": "catalog:", ...ctx.env.workspaceDep } }),
       ...renderSourceFiles("integration/cache/upstash", ctx.base, { ...ctx.env.context }),
     ],
   });
   export const cacheIntegrations = [upstashCache];
   ```

3. **`packages/core/src/integrations/index.ts`** — one import, one spread
   into the `ALL` array. That's it.

4. **Templates** —
   `packages/templates/src/integration/<pkgName>/<provider>/src/*.eta`,
   then `cd packages/templates && bun run build:templates`. See §5 for the
   `it.*` contract and §7 for the provider-neutral surface pattern.

5. **(Only if package name ≠ category)** — add an entry in
   `INTEGRATION_PACKAGE_NAMES` in `options/integrations.ts`. Examples
   that need this: `errorTracking → monitoring`, `rateLimit → rate-limit`,
   `database → db`. A category named `cache` whose package is also `cache`
   needs nothing here.

**Optional polish:**

6. **`packages/core/src/wiring/versions.ts`** — npm version pin (skip if
   `fetch`-only provider).
7. **Builder labels** in `apps/web/src/lib/preset/schema-meta.ts` —
   add `INTEGRATION_CATEGORY_LABELS["category"]` for the field label and
   `LABELS["category.provider"]` for each option. Missing entries fall
   back to humanized ids; the dropdown still appears.
8. **`presets/*.json`** — set `"cat": "..."` in any bundled preset that
   should ship a demo. Then `cd packages/cli && bun run build:presets` to
   rebundle `BUILTIN_PRESETS`.
9. **`packages/analyzer/src/detectors/integrations.ts`** — write a
   `detectCat()` function if you want reverse-engineering support
   (`cts analyze` will then flag the category as detected on existing
   repos). Skipping it means analyzer reports `"none"`.

**Live demo in this repo:** the `cache` category (Upstash provider).
Files actually touched: items 1–4 + 7 + 8 + 9. Items 5 and 6 weren't
needed (`cache` package name matches category, `@upstash/redis` was
already pinned).

**The engine auto-picks-up the new category** in: `IntegrationCategory`
type, `INTEGRATION_CATEGORIES` list, `auto-packages.ts` loop,
`CATEGORY_BY_PACKAGE` (dispatch), `templateCategoryFor`, `preset.ts`
`allPackageNames`, `registry-sync.test.ts`, `create-flow.ts` prompt,
`add.ts` (`category select` + provider switch + `INTEGRATION_PACKAGE`),
`remove.ts`, `preset-factory.ts` (test default), the builder's
`schema-meta.ts` field list. **None of those needs editing.**

### Typed-propagation tax (unavoidable when `Integrations` gains a field)

These touch the typed `Integrations` shape in adjacent code; they happen
once per new category regardless of architecture:

- **Test fixtures with inline `integrations: {…}` literals** — a handful
  of test files in `packages/core/src/`. Either pass `cache: "none"` or
  refactor to use `makePreset()` (which auto-derives from the schema).
- **`apps/web/src/lib/preset/`** — if `defaults.ts`/`reducer.ts` hand-type
  `integrations`, add the new key. The Zod `.default("none")` covers
  parse-time fallback; this is just static typing.

> **`apps/web/src` coordination note.** UI/redesign work may be happening
> in parallel. The two data files inside it (`schema-meta.ts`,
> `preset/*.ts`) are safe to touch surgically; UI component files
> (`components/builder/*`) should be coordinated with the owner.

---

## 11. Verify (run after either checklist)

```bash
cd packages/templates && bun run build:templates   # regenerate the map
bun run type-check                                 # tsc per package
bun run test                                       # vitest — incl. registry-sync guardrail
bun run lint                                        # biome (run --write before committing)
```

The `registry-sync.test.ts` test is the key signal: it proves every
non-`none` enum value has a registered `IntegrationDefinition`. If it
fails, an enum value exists without a provider (or vice-versa).

Then smoke-test the real output (don't run `bun install` without asking
the repo owner):

```bash
# from a scratch dir, with the CLI built or via tsx
create-turbo-stack my-test --preset minimal   # then hand-edit the preset
# or craft a preset JSON with integrations.sms = "netgsm" and:
create-turbo-stack my-test --preset ./my-preset.json --no-install
```

Inspect the generated `my-test/packages/sms/`:
- `package.json` deps use `"catalog:"`, devDeps include
  `@scope/typescript-config`,
- `tsconfig.json` extends `@scope/typescript-config/library.json`,
- env vars appear in the `env` package and `.env.example`,
- `src/*.ts` read secrets via `env.NETGSM_*` (when env validation is on).

---

## 11b. `packageOverrides` — additive customization without forking

Auto-packages (`cache`, `db`, `monitoring`, …) are derived state — their
`name`/`type`/source belongs to the active provider. End users can't directly
edit those without breaking the dispatch contract. **`packageOverrides`** is
the supported escape hatch: a per-package, **additive** layer that runs as a
final pass over the resolver's output.

Field-by-field merge contract (see `applyPackageOverride` in
`packages/core/src/resolve/packages/index.ts`):

| Field | Merged into | Collision rule |
|---|---|---|
| `dependencies` | `package.json.dependencies` | override wins |
| `devDependencies` | `package.json.devDependencies` | override wins |
| `scripts` | `package.json.scripts` | override wins |
| `exports` | the package's `Package.exports` (and thus `package.json.exports`) | deduped union with provider's exports |
| `extraFiles` | written as new file nodes under `packages/<name>/` | **rejected** on path collision with a provider file |

```jsonc
// preset.json — add a README to packages/cache + extra entry point + a script
{
  "packageOverrides": {
    "cache": {
      "scripts": { "warm": "bun run scripts/warm.ts" },
      "exports": ["./pubsub"],
      "extraFiles": [
        { "path": "README.md", "content": "# @scope/cache\n\n…" },
        { "path": "src/pubsub.ts", "content": "export const pubsub = {…};\n" }
      ]
    }
  }
}
```

Keys (`"cache"`, `"db"`, `"ui"`, …) are validated against the set of packages
the resolver would emit (auto + user); typos fail at preset validation, not
silently. `extraFiles[].path` may not contain `..` or start with `/` — the
write target is always inside `packages/<name>/`.

What overrides **cannot** do (deliberately): rename the package, change its
type, remove provider-emitted files, or contradict provider env wiring. Those
require a different active provider or a custom registry package — both
already supported.

Reference: `packages/schema/src/options/package-override.ts` (schema),
`packages/core/src/resolve/packages/index.ts` (apply), and the merge contract
tests in `packages/core/src/resolve/packages/package-override.test.ts`.

---

## 12. Reference files (read these for the real shapes)

| Concern | File |
|---|---|
| The contract | `packages/core/src/integrations/types.ts` |
| Provider examples | `packages/core/src/integrations/email.ts`, `analytics.ts`, `rate-limit.ts` |
| Registration | `packages/core/src/integrations/index.ts`, `registry.ts` |
| Auto-package generation | `packages/core/src/resolve/auto-packages.ts` |
| Package dispatch | `packages/core/src/resolve/packages/index.ts`, `base.ts` |
| Template rendering | `packages/core/src/render/render-source.ts` |
| Env chain | `packages/core/src/wiring/env-chain.ts` |
| npm versions | `packages/core/src/wiring/versions.ts` |
| Schema enums | `packages/schema/src/options/integrations.ts` |
| `consumes` allowlist | `packages/schema/src/preset.ts` (`allPackageNames`) |
| Template build + key rules | `packages/templates/scripts/build-templates.ts` |
| Existing `.eta` | `packages/templates/src/integration/**` |
| Guardrail test | `packages/core/src/registry-sync.test.ts` |
| CLI prompt | `packages/cli/src/prompts/create-flow.ts` |
| Builder meta | `apps/web/src/lib/preset/schema-meta.ts` |

---

## 13. Commit rules (from the repo's CLAUDE.md)

- Conventional Commits: `<type>(<scope>): <description>` — scopes:
  `schema`, `core`, `templates`, `cli`, `web`.
- One logical change per commit. A whole new category may reasonably span
  schema → core → templates → cli, but keep it coherent.
- **No `Co-Authored-By` lines. Ever.**
- Run `biome check --write` before committing.
- Use targeted `git add <file>` — never `git add -A`.
