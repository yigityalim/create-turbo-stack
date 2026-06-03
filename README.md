# create-turbo-stack

Scaffold production-ready Turborepo monorepos.

```bash
npx @create-turbo-stack/cli my-project
```

`create-turbo-stack` is an opinionated CLI that generates a fully wired Turborepo workspace: catalog dependencies, TypeScript config inheritance, Tailwind 4 `@source` directives across packages, env validation chains, and integration glue (auth, DB, API, analytics) — the moving parts that make `create-turbo` only a starting point.

## What it does

- **Interactive scaffolding** — pick package manager, database, API, auth, CSS, UI library, integrations.
- **Wiring engine** — CSS `@source`, catalog deps, env chain, tsconfig inheritance, workspace refs are all computed, not hand-written.
- **Incremental edits** — `add app`, `add package`, `add integration`, `remove ...`. Conflicts with manual edits are detected and you're asked what to do.
- **Package registry** — `cts add <name>` copies a whole workspace package into your monorepo (shadcn-for-packages). Supply-chain integrity via SHA-256 checksums and optional Ed25519 signatures.
- **Reverse engineering** — `analyze` reads an existing Turborepo and produces a preset JSON, with an optional builder URL.
- **Plugin architecture** — `defineAppType()` and `defineIntegration()` add new frameworks or providers in one file. User projects can pull plugins via `npm install` + config.
- **Visual builder** — drag-drop preset configurator with file tree preview at [create-turbo-stack.dev](https://create-turbo-stack.dev).
- **MCP server** — Claude Code, Cursor, Windsurf can scaffold via Model Context Protocol.

## Stack options

| Category | Supported |
|---|---|
| Package manager | bun, pnpm, npm, yarn |
| Database | Drizzle (postgres / mysql / sqlite), Prisma (postgres / mysql / sqlite), Supabase (supabase-js) |
| API | tRPC v11, Hono, Next.js API Routes |
| Auth | Better Auth, Clerk, Supabase Auth, NextAuth (Auth.js) |
| CSS | Tailwind 4 |
| UI | shadcn/ui |
| Apps | Next.js, Next.js API-only, Hono standalone, Vite + React, SvelteKit, Astro |
| Linter | Biome, Oxlint, ESLint + Prettier |
| Integrations | Sentry, PostHog, Vercel Analytics, Plausible, React Email + Resend, Nodemailer, Upstash, Vercel AI SDK, LangChain, Bugsnag |

## Usage

```bash
# Interactive create
npx @create-turbo-stack/cli

# From a preset (URL, file, or built-in name)
npx @create-turbo-stack/cli --preset minimal
npx @create-turbo-stack/cli --preset https://create-turbo-stack.dev/s/saas-starter.json

# Inside an existing project
cts add app               # add a new app
cts add package           # add a workspace package
cts add integration       # set / change an integration provider
cts add <name>            # install a package from the registry
cts remove app <name>     # remove an app and its files
cts remove integration    # revert an integration to none
cts switch db postgres    # swap database provider

# Sync state
cts reconcile             # report .turbo-stack.json ↔ disk drift
cts upgrade               # migrate config to latest schema version

# Reverse-engineer an existing project
cts analyze
cts analyze --open-builder

# AI agent integration
cts mcp
```

## Project config

Config lives under the `config` key of `.turbo-stack.json` (one file per project).
An optional `create-turbo-stack.json` (walked up from cwd) or
`~/.create-turbo-stack/config.json` provides org/team defaults.

```json
{
  "$schema": "https://create-turbo-stack.dev/schema/config.json",
  "config": {
    "defaults": {
      "basics": { "scope": "@acme", "packageManager": "pnpm" }
    },
    "policy": {
      "allow":   { "auth": ["clerk", "better-auth"] },
      "require": { "typescript": "strict", "envValidation": true }
    },
    "plugins": ["@acme/cts-plugins"],
    "registries": {
      "acme": {
        "url": "https://registry.acme.dev/r/{name}.json",
        "publicKey": "<ed25519-spki-base64>"
      }
    },
    "conflictPolicy": "prompt"
  }
}
```

`defaults` pre-fill prompts. `policy.allow` / `policy.forbid` filter prompt options;
`policy.require` locks a value. `plugins` contribute app types or integrations.
`registries` configure `cts add @acme/<name>` with optional Ed25519 verification.

## Repo layout

```
apps/web/            Landing page, docs, visual builder
packages/cli/        CLI (npx entry point)
packages/core/       Platform-agnostic engine (runs in Node and browser)
packages/schema/     Zod 4 schemas
packages/analyzer/   Existing-project detection
registry/            First-party registry item sources
```

`packages/core` has a hard rule: **no Node.js imports**. The browser builder uses the same engine.

## Contributing

See `CONTRIBUTING.md`.

New app framework: copy `packages/core/src/resolve/app-types/_TEMPLATE.ts`.
New integration provider: see `packages/core/src/integrations/_TEMPLATE.ts`.
New registry package: follow `registry/README.md`.

Schema-vs-registry drift is enforced by `registry-sync.test.ts` in CI.

## License

[MIT](./LICENSE)
