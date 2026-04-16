# @create-turbo-stack/cli

Scaffold production-ready Turborepo monorepos in seconds.

## Quick Start

```bash
bunx @create-turbo-stack/cli my-app
```

Or with npx:

```bash
npx @create-turbo-stack/cli my-app
```

## Commands

### `create` (default)

Interactive prompts to scaffold a full Turborepo monorepo.

```bash
bunx @create-turbo-stack/cli my-app
bunx @create-turbo-stack/cli my-app --preset https://create-turbo-stack.dev/s/saas-starter.json
bunx @create-turbo-stack/cli my-app --yes  # accept defaults
```

### `add`

Incrementally add apps, packages, or integrations to an existing project.

```bash
create-turbo-stack add app
create-turbo-stack add package
create-turbo-stack add integration
```

### `analyze`

Reverse-engineer an existing Turborepo project into a preset.

```bash
create-turbo-stack analyze
create-turbo-stack analyze --output preset.json
create-turbo-stack analyze --open-builder
create-turbo-stack analyze --json
```

### `preset`

Save or validate preset configurations.

```bash
create-turbo-stack preset save
create-turbo-stack preset validate preset.json
```

### `mcp`

Start an MCP server for AI agent integration.

```bash
create-turbo-stack mcp
```

## Stack Options

- **Apps**: Next.js, Next.js API-only, Hono, Vite-React, SvelteKit, Astro, Remix
- **Database**: Supabase, Drizzle (Postgres/MySQL/SQLite/Turso/Neon/PlanetScale), Prisma
- **API**: tRPC v11, Hono, Next.js API Routes
- **Auth**: Supabase Auth, Better Auth, Clerk, NextAuth, Lucia
- **CSS**: Tailwind CSS 4/3, vanilla, CSS Modules + shadcn/ui
- **Integrations**: PostHog, Vercel Analytics, Sentry, React Email, Upstash, Vercel AI SDK

## Links

- [Website & Builder](https://create-turbo-stack.dev)
- [Documentation](https://create-turbo-stack.dev/docs)
- [GitHub](https://github.com/yigityalim/create-turbo-stack)

## License

MIT
