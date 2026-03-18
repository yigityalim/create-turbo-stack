# create-turbo-stack

## Project Overview

CLI tool that scaffolds production-ready Turborepo monorepos. This repo is the monorepo that contains the CLI itself, the core engine, and the web site.

## Architecture

- `packages/schema` — Zod 4 schemas. No logic, only types and validation. Browser-safe.
- `packages/core` — Business logic. **Must have zero Node.js imports** (runs in browser too). Uses Eta for templates.
- `packages/templates` — EJS template files exported as strings. Passive data.
- `packages/cli` — CLI entry point. Node.js only. Uses Commander + @clack/prompts.
- `apps/web` — Fumadocs site: landing page, docs, visual builder, community presets.

## Key Rules

- **Core is platform-agnostic**: No `fs`, `path`, `child_process`, or any Node.js API in `packages/core`. It must run in the browser for the web builder's file tree preview.
- **Preset is the universal contract**: Every entry point (CLI prompts, web builder, community registry, MCP) produces a Preset JSON. Core consumes it.
- **Wiring over scaffolding**: The value is in correct cross-package wiring (CSS @source, catalog deps, env chains, tsconfig inheritance), not just file creation.
- **No Co-Authored-By**: Never add Co-Authored-By lines to any git commit.
- **Biome not ESLint**: All linting/formatting via Biome. Run `biome check --fix --unsafe .` before committing.
- **Zod 4**: All schemas use Zod v4. Not v3.

## Commands

```bash
bun install          # Install dependencies
bun run dev          # Dev mode (all packages + web)
bun run build        # Build all packages
bun run lint         # Lint with Biome
bun run test         # Run tests (Vitest 4)
bun run type-check   # TypeScript type checking
```

## Git & Commit Rules

- **Conventional Commits**: `<type>(<scope>): <description>`
- **Types**: feat, fix, docs, chore, refactor, test, perf
- **Scopes**: schema, core, templates, cli, web (or omit for root)
- English, lowercase, imperative mood, max 72 chars title
- One logical change per commit
- **Branching**: `main` (stable) ← `dev` (integration) ← `feat/*`, `fix/*`
- **Versioning**: SemVer. All packages share same version. `0.x.y` until stable.

## Tech Stack Versions

- Zod 4, Vitest 4, Eta 4, Commander 14, @clack/prompts 1.x
- Next.js 16, Fumadocs 16, Tailwind CSS 4
- Biome 2.x, TypeScript 5.9, Bun 1.3

## Documentation

- `create-turbo-stack-srs.md` — Requirements (what to build)
- `create-turbo-stack-sdd.md` — Design (how to build it)
- `ROADMAP.md` — Implementation phases
- `CONTRIBUTING.md` — Full commit, branching, and PR rules

## Static Endpoints (served from apps/web/public/)

- `/schema/preset.json` — Preset JSON Schema (generated from Zod)
- `/schema/registry.json` — Registry JSON Schema
- `/schema/config.json` — Config JSON Schema
- `/s/minimal.json`, `/s/saas-starter.json`, `/s/api-only.json` — Built-in presets
- `/s/registry.json` — Registry index
