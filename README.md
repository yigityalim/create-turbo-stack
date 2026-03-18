# create-turbo-stack

Scaffold production-ready Turborepo monorepos in seconds, not days.

`create-turbo-stack` is an opinionated, interactive CLI that generates fully wired Turborepo workspaces with real-world patterns: database layer, auth, API routing, shared UI, environment validation, cross-package Tailwind CSS, and more.

## Why?

`create-turbo` gives you a near-empty skeleton. Getting from skeleton to production-ready requires days of manual wiring:

- Tailwind 4 `@source` directives across packages (miss one → silent CSS purging)
- `catalog:` dependency management synchronized across all workspaces
- `@t3-oss/env-nextjs` validation chains per app
- tRPC router wiring, Supabase client setup, auth middleware
- TypeScript config inheritance chains

**create-turbo-stack** automates all of this.

## Quick Start

```bash
npx create-turbo-stack my-project
```

Or use a preset:

```bash
npx create-turbo-stack --preset https://create-turbo-stack.dev/s/saas-starter.json
```

## Features

- **Interactive scaffolding** — Choose your stack: database, API, auth, CSS, integrations
- **Wiring engine** — CSS `@source`, catalog deps, env chains, tsconfig inheritance — all automated
- **Incremental additions** — `create-turbo-stack add app`, `add package`, `add integration`
- **Preset system** — Save, share, and reuse stack configurations (inspired by shadcn registry)
- **Web builder** — Visual stack configurator with live file tree preview at [create-turbo-stack.dev](https://create-turbo-stack.dev)
- **MCP server** — AI agents (Claude Code, Cursor) can scaffold via Model Context Protocol
- **Idempotent operations** — Safe to re-run, won't duplicate or overwrite manual changes

## Stack Options

| Category | Options |
|----------|---------|
| **Package Manager** | bun, pnpm, npm, yarn |
| **Database** | Supabase, Drizzle, Prisma, none |
| **API** | tRPC v11, Hono, Next.js API Routes, none |
| **Auth** | Supabase Auth, Better Auth, Clerk, NextAuth, Lucia, none |
| **CSS** | Tailwind 4, Tailwind 3, vanilla, CSS Modules |
| **UI** | shadcn/ui, Radix (raw), none |
| **Apps** | Next.js, Expo, Hono, Vite (React/Vue), SvelteKit, Astro, Remix, Tauri |
| **Integrations** | Sentry, PostHog, Plausible, React Email + Resend, Upstash, Vercel AI SDK |

## Usage

### Create a new project

```bash
npx create-turbo-stack
```

Interactive prompts guide you through every decision.

### Add to an existing project

```bash
# Add a new app
npx create-turbo-stack add app

# Add a new package
npx create-turbo-stack add package

# Add an integration (e.g., Sentry, analytics)
npx create-turbo-stack add integration
```

### Use a preset

```bash
# Built-in presets
npx create-turbo-stack --preset minimal
npx create-turbo-stack --preset saas-starter
npx create-turbo-stack --preset api-only

# Community presets (any URL)
npx create-turbo-stack --preset https://example.com/my-stack.json
```

### MCP Server (for AI agents)

```bash
npx create-turbo-stack mcp
```

See [MCP documentation](./docs/mcp.md) for setup with Claude Code, Cursor, etc.

## Community Presets

Share your stack with the community! Create a preset JSON conforming to the [preset schema](https://create-turbo-stack.dev/schema/preset.json) and host it at any URL.

```bash
# Anyone can use your preset
npx create-turbo-stack --preset https://your-site.com/your-stack.json
```

See [Registry documentation](./docs/registry.md) for details on creating and publishing presets.

## Project Structure

This is a Turborepo monorepo:

```
create-turbo-stack/
├── apps/
│   └── web/              # Landing page + builder + community presets
├── packages/
│   ├── cli/              # CLI entry point (npx create-turbo-stack)
│   ├── core/             # Platform-agnostic business logic
│   ├── schema/           # Zod schemas for presets, config, registry
│   └── templates/        # EJS template files for code generation
├── presets/              # Built-in preset definitions
└── docs/                 # Documentation
```

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

[MIT](./LICENSE)
