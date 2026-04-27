# create-turbo-stack

CLI tool that scaffolds production-ready Turborepo monorepos. This repo
is the monorepo containing the CLI, the core engine, and the public
web site.

## Architecture

```
packages/schema     Zod 4 schemas. Types only — no logic. Browser-safe.
packages/core       Platform-agnostic engine. Runs in Node and browser.
packages/templates  Eta source-file templates exported as strings.
packages/cli        Node-only entry point. Commander + @clack/prompts.
packages/analyzer   Reverse-engineer existing Turborepo projects.
apps/web            Fumadocs site: landing, docs, visual builder.
```

### Plugin systems (in `packages/core`)

- `resolve/app-types/` — App framework registry. One file per framework
  (`nextjs.ts`, `remix.ts`, ...). Switch-cases are gone; new framework
  = `defineAppType({...})` + entry in `app-types/index.ts`.
- `integrations/` — Integration provider registry, one file per
  category (`auth.ts`, `email.ts`, ...). New provider =
  `defineIntegration({...})` in the matching category.
- `_TEMPLATE.ts` files in both directories show the contract; they
  type-check against the real interface but are not registered.
- `registry-sync.test.ts` fails CI when a schema enum value is added
  without a matching plugin.

### Diff engine (in `packages/core/src/diff/`)

Five categories: `create`, `update`, `unchanged`, `delete`, `conflict`.
`conflict` is populated when disk content diverges from what the
previous preset would have produced — i.e. the user hand-edited it.
JSON merges are leaf-level so user-authored keys (custom scripts, ad-hoc
fields) survive `add` / `remove`.

## Key Rules

- **Core is platform-agnostic.** No `fs`, `path`, `child_process`, or
  any Node.js API in `packages/core`. It runs in the browser for the
  web builder's file tree preview.
- **Preset is the universal contract.** Every entry point (CLI prompts,
  web builder, community registry, MCP, plugin output) produces a
  Preset JSON. Core consumes it.
- **Wiring > scaffolding.** Correct cross-package wiring (CSS @source,
  catalog deps, env chains, tsconfig inheritance) is the value, not
  file count.
- **No Co-Authored-By.** Never add Co-Authored-By lines to any git
  commit.
- **Biome.** Run `biome check --write` before committing.
- **Zod 4.** All schemas use Zod v4. JSON Schema generation uses the
  built-in `z.toJSONSchema()`, not the third-party adapter.
- **Atomic apply.** Disk writes in `add` / `remove` snapshot the
  pre-state and roll back on any failure.

## User config (`create-turbo-stack.json`)

Optional. The CLI walks up from cwd to find it. Three keys:

- `defaults` — pre-fill prompt initial values
- `policy` — `allow` / `forbid` filter prompt options;
  `require` skips a prompt and locks the value
- `plugins` — npm package names; default export contributes
  `AppTypeDefinition` and/or `IntegrationDefinition` entries

Validated by `UserConfigSchema`; JSON Schema available at
`apps/web/public/schema/user-config.json`.

## Commands

```bash
bun install        Install dependencies
bun run dev        Dev mode (all packages + web)
bun run build      Build all packages
bun run lint       Biome
bun run test       Vitest 4
bun run type-check tsc --noEmit per package
```

## Git & Commit Rules

- **Conventional Commits**: `<type>(<scope>): <description>`
- **Types**: feat, fix, docs, chore, refactor, test, perf
- **Scopes**: schema, core, templates, cli, web (or omit for root)
- English, lowercase, imperative, max 72 char title
- One logical change per commit
- **Branching**: `main` ← `dev` ← `feat/*`, `fix/*`
- **Versioning**: SemVer. All packages share the same version.

## Tech Stack

- Zod 4, Vitest 4, Eta 4, Commander 14, @clack/prompts 1.x
- Next.js 16, Fumadocs 16, Tailwind CSS 4
- Biome 2.x, TypeScript 5.9, Bun 1.3

## Static Endpoints (`apps/web/public/`)

- `/schema/preset.json`        — Preset JSON Schema
- `/schema/registry.json`      — Registry JSON Schema
- `/schema/config.json`        — `.turbo-stack.json` (state) JSON Schema
- `/schema/user-config.json`   — `create-turbo-stack.json` JSON Schema
- `/s/minimal.json`, `/s/saas-starter.json`, `/s/api-only.json` — built-in presets
- `/s/registry.json`           — registry index

All schema files are regenerated from Zod by
`packages/schema/scripts/generate-json-schema.ts`.
