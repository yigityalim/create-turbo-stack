# create-turbo-stack

CLI tool that scaffolds production-ready Turborepo monorepos. This repo
is the monorepo containing the CLI, the core engine, and the public
web site.

## Architecture

```
packages/schema     Zod 4 schemas. Types only — no logic. Browser-safe.
packages/core       Platform-agnostic engine. Runs in Node and browser.
packages/cli        Node-only entry point. Commander + @clack/prompts.
packages/analyzer   Reverse-engineer existing Turborepo projects.
apps/web            Fumadocs site: landing, docs, visual builder.
registry/           First-party registry item sources (authoring only).
```

### Registry system (in `packages/core/src/registry/`)

The sole content pipeline. Eta templates are gone. Every file the tool
generates comes from a registry item:

1. `selectRegistryItems(preset)` — maps preset fields to `(slot, variant)` pairs
2. `resolveRegistryItems()` — fetches items (built-in bundle or remote URL),
   verifies SHA-256 checksum and optional Ed25519 signature
3. `materializeRegistryItem(item, ctx)` — substitutes closed-vocabulary
   placeholders (`{{scope}}`, `{{pkg-name}}`, `{{pm-*}}`) and returns `FileTreeNode[]`

Registry items are **real TypeScript source files** authored under `registry/`,
built once via `bun run build:registry`, and served from `apps/web/public/r/`.
No runtime templating — no conditionals, no expressions inside files.
One variant per combination (e.g. `db-drizzle-postgres`, `db-drizzle-sqlite`).

### Plugin architecture (in `packages/core/src/resolve/`)

- `app-types/` — App framework registry. One file per framework. New framework
  = `defineAppType({...})` + entry in `app-types/index.ts`.
- `integrations/` — Integration provider registry, one file per category.
  New provider = `defineIntegration({...})` in the matching category.
- `_TEMPLATE.ts` files show the contract and type-check against the real interface.
- `registry-sync.test.ts` fails CI when a schema enum value has no matching plugin.

### Diff engine (in `packages/core/src/diff/`)

Five categories: `create`, `update`, `unchanged`, `delete`, `conflict`.
`conflict` fires when disk content diverges from what the previous preset
would have produced — the user hand-edited the file.
JSON merges are leaf-level: user-authored keys survive `add` / `remove`.

### Package registry (`cts add`)

shadcn-for-packages model. `cts add <name>` copies a whole workspace package
into an existing monorepo, resolves `registryDependencies` recursively, merges
catalog deps, wires env vars into the load-bearing env package, and pins the
SHA-256 checksum in `.turbo-stack.json`. Namespaced registries (`@ns/name`)
with optional Bearer auth and Ed25519 signature verification are supported.

## Key Rules

- **Core is platform-agnostic.** No `fs`, `path`, `child_process`, or
  any Node.js API in `packages/core`. It runs in the browser for the
  web builder's file tree preview.
- **Preset is the universal contract.** Every entry point (CLI prompts,
  web builder, community registry, MCP, plugin output) produces a
  Preset JSON. Core consumes it.
- **Registry-only rendering.** No Eta, no runtime templates. One variant
  per combination. Conditionals live in the selector, not inside files.
- **Wiring > scaffolding.** Correct cross-package wiring (CSS @source,
  catalog deps, env chains, tsconfig inheritance) is the value, not file count.
- **No Co-Authored-By.** Never add Co-Authored-By lines to any git commit.
- **Biome.** Run `biome check --write` before committing.
- **Zod 4.** All schemas use Zod v4. JSON Schema generation uses the
  built-in `z.toJSONSchema()`, not the third-party adapter.
- **Atomic apply.** Disk writes in `add` / `remove` snapshot the
  pre-state and roll back on any failure.
- **Supply-chain integrity.** Every registry item carries a SHA-256
  checksum recomputed on `cts add`; mismatch aborts. Ed25519 signatures
  are verified for registries that publish a `publicKey`.

## User config

Resolved in order (later wins): `~/.create-turbo-stack/config.json` →
`create-turbo-stack.json` (walked up from cwd) → `.turbo-stack.json` `config` block.

Four keys (`UserConfigSchema`):

- `defaults` — pre-fill prompt initial values
- `policy` — `allow` / `forbid` filter prompt options;
  `require` skips a prompt and locks the value
- `plugins` — npm package names; default export contributes
  `AppTypeDefinition` and/or `IntegrationDefinition` entries
- `registries` — namespaced package registries (`@ns` → URL template /
  `{url,headers,params,publicKey}`) for `cts add @ns/name`
- `conflictPolicy` — `"prompt"` (default) | `"keep"` | `"overwrite"` | `"abort"`

**One file per project:** put this config under the `config` key of
`.turbo-stack.json`. JSON Schema: `apps/web/public/schema/config.json`.

## Commands

```bash
bun install        Install dependencies
bun run dev        Dev mode (all packages + web)
bun run build      Build all packages
bun run lint       Biome
bun run test       Vitest 4
bun run type-check tsc --noEmit per package
bun run e2e        Scaffold + install + build all built-in presets
```

## Git & Commit Rules

- **Conventional Commits**: `<type>(<scope>): <description>`
- **Types**: feat, fix, docs, chore, refactor, test, perf
- **Scopes**: schema, core, cli, web, registry, analyzer (or omit for root)
- English, lowercase, imperative, max 72 char title
- One logical change per commit
- **Branching**: `main` ← `dev` ← `feat/*`, `fix/*`
- **Versioning**: SemVer. All packages share the same version.

## Tech Stack

- Zod 4, Vitest 4, Commander 14, @clack/prompts 1.x
- Next.js 16, Fumadocs 16, Tailwind CSS 4
- Biome 2.x, TypeScript 5.9, Bun 1.3

## Static Endpoints (`apps/web/public/`)

- `/schema/preset.json`          — Preset JSON Schema
- `/schema/registry.json`        — Registry JSON Schema
- `/schema/config.json`          — `.turbo-stack.json` (state) JSON Schema
- `/schema/user-config.json`     — `create-turbo-stack.json` JSON Schema
- `/schema/package-registry.json`— Package registry item JSON Schema
- `/s/minimal.json`, `/s/saas-starter.json`, `/s/api-only.json` — built-in presets
- `/s/registry.json`             — preset registry index
- `/r/<name>.json`               — built-in package registry items
- `/r/registry.json`             — package registry index

All schema files are regenerated from Zod by
`packages/schema/scripts/generate-json-schema.ts`.
Registry items are built by `bun run build:registry` in `registry/`.
