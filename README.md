# create-turbo-stack

Scaffold production-ready Turborepo monorepos.

```bash
npx create-turbo-stack my-project
```

`create-turbo-stack` is an opinionated CLI that generates a fully wired Turborepo workspace: catalog dependencies, TypeScript config inheritance, Tailwind 4 `@source` directives across packages, env validation chains, and integration glue (auth, DB, API, analytics) — the moving parts that make `create-turbo` only a starting point.

## What it does

- **Interactive scaffolding** — pick package manager, database, API, auth, CSS, UI library, integrations.
- **Wiring engine** — CSS `@source`, catalog deps, env chain, tsconfig inheritance, workspace refs are all computed, not hand-written.
- **Incremental edits** — `add app`, `add package`, `add integration`, `remove ...`. Conflicts with manual edits are detected and you're asked what to do.
- **Reverse engineering** — `analyze` reads an existing Turborepo and produces a preset JSON, with an optional builder URL.
- **Plugin architecture** — `defineAppType()` and `defineIntegration()` add new frameworks or providers in one file. User projects can pull plugins via `npm install` + `create-turbo-stack.json`.
- **Visual builder** — drag-drop preset configurator with file tree preview at [create-turbo-stack.dev](https://create-turbo-stack.dev).
- **MCP server** — Claude Code, Cursor, Windsurf can scaffold via Model Context Protocol.

## Stack options

| Category | Implemented |
|---|---|
| Package manager | bun, pnpm, npm, yarn |
| Database | Supabase, Drizzle (6 drivers), Prisma |
| API | tRPC v11, Hono, Next.js API Routes |
| Auth | Supabase Auth, Better Auth, Clerk, NextAuth, Lucia |
| CSS | Tailwind 4 (full), Tailwind 3 / vanilla / CSS Modules (basic) |
| UI | shadcn/ui, Radix |
| Apps | Next.js, Next.js API-only, Hono, Vite + React, SvelteKit, Astro, Remix |
| Integrations | Sentry, PostHog, Vercel Analytics, Plausible, React Email + Resend, Nodemailer, Upstash, Vercel AI SDK, Langchain |
| Linter | Biome |

App types declared in the schema but not yet implemented (Expo, Vite + Vue, Tauri) raise an explicit error rather than producing a broken project.

## Usage

```bash
# Interactive
npx create-turbo-stack

# From a preset (URL or path)
npx create-turbo-stack --preset https://create-turbo-stack.dev/s/saas-starter.json

# Inside an existing project
create-turbo-stack add app          # add a new app
create-turbo-stack add package      # add a workspace package
create-turbo-stack add integration  # set / change a provider
create-turbo-stack remove app       # remove an app and its files

# Reverse-engineer
create-turbo-stack analyze              # print preset JSON
create-turbo-stack analyze --open-builder

# AI agent integration
create-turbo-stack mcp
```

## Project config — `create-turbo-stack.json`

Optional. Drop one in your repo (or any parent directory) to set defaults, lock down choices, and load plugins:

```json
{
  "$schema": "https://create-turbo-stack.dev/schema/user-config.json",
  "defaults": {
    "basics": { "scope": "@acme", "packageManager": "pnpm" }
  },
  "policy": {
    "allow":   { "auth": ["clerk", "better-auth"] },
    "require": { "typescript": "strict", "envValidation": true }
  },
  "plugins": ["@acme/cts-plugins"]
}
```

`defaults` pre-fill prompts. `policy.allow` / `policy.forbid` filter prompt options; `policy.require` skips a prompt and locks the value. `plugins` are npm package names whose default export contributes `AppTypeDefinition` or `IntegrationDefinition` entries.

## Repo layout

```
apps/web/            Landing page, docs, visual builder
packages/cli/        CLI (npx entry point)
packages/core/       Platform-agnostic engine (runs in Node and browser)
packages/schema/     Zod 4 schemas
packages/templates/  Eta source-file templates
packages/analyzer/   Existing-project detection
```

`packages/core` has a hard rule: **no Node.js imports**. The browser builder uses the same engine.

## Contributing

See `CONTRIBUTING.md`. New frameworks: copy `packages/core/src/resolve/app-types/_TEMPLATE.ts`. New providers: see `packages/core/src/integrations/_TEMPLATE.ts`. Schema-vs-registry drift is enforced by `registry-sync.test.ts` in CI.

## License

[MIT](./LICENSE)
