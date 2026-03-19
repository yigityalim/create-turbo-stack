# create-turbo-stack — Software Requirements Specification (SRS)

**Version:** 1.0.0-draft
**Author:** Mehmet Yiğit Yalım
**Date:** 2026-03-18
**Status:** Draft

---

## 1. Executive Summary

`create-turbo-stack` is an opinionated, interactive CLI tool that scaffolds production-ready Turborepo monorepo projects and manages them throughout their lifecycle. Unlike `create-turbo` which gives you a minimal skeleton, this CLI generates a fully wired workspace with real-world patterns: database layer, auth, API routing, shared UI, environment validation, cross-package Tailwind CSS, i18n, and more — all based on battle-tested patterns from large-scale Turborepo projects (13+ apps, 22+ packages).

The tool operates in two modes:
1. **`create`** — Interactive project scaffolding from scratch
2. **`add`** — Incremental additions to an existing workspace (new app, new package, new integration)

The CLI also exposes an **MCP (Model Context Protocol) server** so that AI agents (Claude Code, Cursor, etc.) can invoke it programmatically — "add a db package" triggers the CLI, not raw file creation.

---

## 2. Problem Statement

### 2.1 Pain Points (Observed from Real Experience)

| Problem | Impact |
|---------|--------|
| `create-turbo` generates a near-empty skeleton — no DB, no auth, no API, no shared UI | Hours/days of manual wiring before writing any business logic |
| Adding a new package requires editing 5+ files: `package.json`, `tsconfig.json`, `turbo.json`, consumer app imports, CSS `@source` directives | High friction for every incremental change |
| Tailwind 4 cross-package `@source` directives must be manually added to every consuming app's `globals.css` — missing one causes silent class purging | 1 week debugging invisible CSS bugs |
| Catalog dependency management (`catalog:` protocol in `package.json`) must be manually synchronized across all workspaces | Version drift, duplicate dependencies |
| Environment variables are scattered; validation (`@t3-oss/env-nextjs`) must be manually wired per app with correct `extends` chains | Runtime crashes from missing env vars |
| tRPC router wiring, Supabase client setup, auth middleware — all require copy-paste boilerplate with subtle per-app differences | Inconsistency across apps |
| No standard way for AI tools to understand the monorepo's conventions | AI generates wrong patterns, creates files instead of running generators |

### 2.2 Target Users

- **Solo developers / small teams** starting a new large-scale Turborepo project
- **Existing monorepo maintainers** who want to add apps/packages without manual wiring
- **AI agents** (via MCP) that need to scaffold workspace artifacts correctly

---

## 3. Functional Requirements

### 3.1 `create-turbo-stack` (Init Mode)

Interactive prompts that scaffold a complete monorepo.

#### 3.1.1 Project Basics

| Prompt | Options | Default |
|--------|---------|---------|
| Project name | Free text | Directory name |
| Package manager | `bun` / `pnpm` / `npm` / `yarn` | `bun` |
| Organization scope | `@myorg` format | `@{project-name}` |
| Git init | Yes / No | Yes |
| TypeScript strictness | `strict` / `relaxed` | `strict` |

#### 3.1.2 Database & ORM

| Prompt | Options | Effect |
|--------|---------|--------|
| Database strategy | `supabase` / `drizzle` / `prisma` / `none` | — |
| If Supabase: URL + Anon Key + Service Role Key | Env values | Writes `.env.local`, creates `@scope/env` package with validation |
| If Drizzle: Which driver? | `postgres` / `mysql` / `sqlite` / `turso` / `neon` / `planetscale` | Installs driver, generates `drizzle.config.ts` |
| If Prisma: Database URL | Connection string | Generates `schema.prisma`, creates db package |
| Generate types package? | Yes / No | Creates `@scope/types` with Zod schemas + DB types |

**Output:** `packages/db/` or integrated into `packages/types/` depending on choice.

#### 3.1.3 API Layer

| Prompt | Options | Effect |
|--------|---------|--------|
| API strategy | `trpc` / `rest-hono` / `rest-nextjs` / `graphql` / `none` | — |
| If tRPC: Version | `v11` (default) | Creates `@scope/api` with routers, server, client exports |
| If Hono: Standalone or embedded? | `standalone-app` / `nextjs-route` | Creates Hono app or integrates into Next.js |
| If REST Next.js: — | — | Generates route handler patterns |

**Output:** `packages/api/` and/or `apps/api/` depending on choice.

#### 3.1.4 Authentication

| Prompt | Options | Effect |
|--------|---------|--------|
| Auth provider | `supabase-auth` / `better-auth` / `clerk` / `next-auth` / `lucia` / `none` | — |
| If Supabase Auth: Env values | URL, keys | Creates `@scope/auth` with server/client split, middleware, components |
| Role-based access? | Yes / No | Creates `@scope/auth-guard` with polymorphic guards |
| Entitlement/plan system? | Yes / No | Creates `@scope/entitlement` |

#### 3.1.5 Apps

Repeatable prompt loop: "Add an app? (Yes/No)"

| Prompt | Options | Effect |
|--------|---------|--------|
| App name | Free text | Directory under `apps/` |
| App type | `nextjs` / `nextjs-api-only` / `expo` / `tauri` / `sveltekit` / `astro` / `remix` / `hono-standalone` / `vite-react` / `vite-vue` | — |
| Port number | Number | Sets dev/start port |
| If Next.js: i18n? | Yes / No | Adds `next-intl`, `[locale]` routing, i18n sync scripts |
| If Next.js: CMS? | `sanity` / `keystatic` / `none` | Adds CMS integration |
| Which packages to consume? | Multi-select from created packages | Wires `workspace:*` deps, CSS `@source`, imports |

#### 3.1.6 Packages

Repeatable prompt loop: "Add a package? (Yes/No)"

| Prompt | Options | Effect |
|--------|---------|--------|
| Package name | Free text | `@scope/{name}` under `packages/` |
| Package type | `ui` / `utils` / `config` / `library` / `react-library` | Determines tsconfig extends, exports pattern |
| Contains TSX / CSS? | Yes / No | If yes: marks as CSS-producing for `@source` registration |
| Export subpaths? | Define list | Generates `exports` map in `package.json` |

#### 3.1.7 Shared Infrastructure

| Prompt | Options | Effect |
|--------|---------|--------|
| Linter/Formatter | `biome` / `eslint+prettier` | Config + scripts |
| UI library | `shadcn` / `radix-raw` / `none` | If shadcn: `components.json`, base components |
| CSS framework | `tailwind4` / `tailwind3` / `vanilla` / `css-modules` | PostCSS config, globals.css with `@source` |
| Styling architecture | `css-variables` / `static` | Theme setup (OKLch, etc.) |
| Analytics | `posthog` / `vercel-analytics` / `plausible` / `none` | Creates analytics/pixels packages |
| Error tracking | `sentry` / `none` | Wires Sentry across apps |
| Email | `react-email+resend` / `nodemailer` / `none` | Creates email package with templates |
| Rate limiting | `upstash` / `none` | Adds to utils package |
| AI integration | `vercel-ai-sdk` / `langchain` / `none` | Creates AI package |
| Environment validation | `t3-env` / `none` (default: `t3-env`) | Creates `@scope/env` with composed validation |

#### 3.1.8 Turbo Configuration

Auto-generated `turbo.json` based on all selections:
- Task pipeline with correct `dependsOn` graph
- `globalDependencies` for `.env` files
- `globalEnv` populated from all selected integrations
- Special task overrides for packages that need them (e.g., native crypto builds)

---

### 3.2 `create-turbo-stack add` (Incremental Mode)

Operates on an existing `create-turbo-stack` project (detected by `.better-turbo.json` config or heuristics).

#### 3.2.1 `add app`

```bash
create-turbo-stack add app
```

Interactive prompts (same as §3.1.5). Additionally:
- Auto-detects existing packages and offers them for consumption
- Wires CSS `@source` directives for all CSS-producing packages
- Adds to `turbo.json` if needed
- Registers in workspace config

#### 3.2.2 `add package`

```bash
create-turbo-stack add package
```

Interactive prompts (same as §3.1.6). Additionally:
- If package produces CSS/TSX: **automatically updates `globals.css` in every consuming app** with the correct `@source` directive
- Adds catalog entries for any new external dependencies
- Updates `turbo.json` if package needs special task config

#### 3.2.3 `add integration`

```bash
create-turbo-stack add integration
```

Add a cross-cutting concern to an existing project:
- `add integration supabase` — Adds Supabase to an existing project (env, types, auth)
- `add integration trpc` — Adds tRPC layer
- `add integration i18n` — Adds internationalization to selected apps
- `add integration sentry` — Wires error tracking
- `add integration analytics` — Adds analytics package + pixel tracking
- `add integration billing` — Adds billing/payment package

#### 3.2.4 `add dependency`

```bash
create-turbo-stack add dependency zod --to @scope/types
```

- Adds to catalog (root `package.json` catalog section) if not present
- Adds `catalog:` reference to target package
- Resolves latest version or accepts pinned version

#### 3.2.5 `add route` / `add component` / `add action`

Granular generators within an app:

```bash
create-turbo-stack add route --app candidate --path /dashboard/settings
create-turbo-stack add component --package ui --name DataTable
create-turbo-stack add action --app partner --name createJobPosting
```

---

### 3.2.5 `analyze` (Reverse Engineering)

```bash
create-turbo-stack analyze [path]
```

Scans an existing Turborepo workspace and generates a Preset JSON from it. This enables:

- **Migration:** Bring an existing project into the create-turbo-stack ecosystem
- **Builder link:** `--open-builder` flag generates a URL that opens the web builder pre-filled with the analyzed config
- **Audit:** Compare actual project state against the preset to detect drift

#### Detection targets

| Category | Detection method |
|----------|-----------------|
| Package manager | Lock file presence (`bun.lock`, `pnpm-lock.yaml`, etc.) |
| Linter | `biome.json` or `.eslintrc.*` |
| TypeScript | `tsconfig.json` strictness flags |
| Apps | `apps/*/package.json` with framework detection (Next.js, Hono, Expo, etc.) |
| Packages | `packages/*/package.json` with type inference (ui, utils, config, library) |
| Database | Drizzle config, Prisma schema, Supabase deps |
| API | tRPC router exports, Hono app exports, Next.js route handlers |
| Auth | Auth provider package deps + config detection |
| CSS | Tailwind config version, PostCSS config, globals.css analysis |
| Integrations | Package.json dep scanning (Sentry, PostHog, Resend, etc.) |

#### Output

```bash
# Generate preset JSON
create-turbo-stack analyze . --output preset.json

# Open in web builder
create-turbo-stack analyze . --open-builder

# Compare with existing preset
create-turbo-stack analyze . --diff preset.json
```

---

### 3.3 Project Config File (`.better-turbo.json`)

Persisted at project root. Tracks:

```jsonc
{
  "version": "1.0.0",
  "scope": "@cvisioner",
  "packageManager": "bun",
  "database": "supabase",
  "api": "trpc",
  "auth": "supabase-auth",
  "css": "tailwind4",
  "linter": "biome",
  "apps": {
    "candidate": { "type": "nextjs", "port": 3000, "i18n": true, "consumes": ["ui", "api", "auth", "builder"] },
    "api": { "type": "nextjs-api-only", "port": 3001, "consumes": ["api", "auth"] }
  },
  "packages": {
    "ui": { "type": "react-library", "producesCSS": true, "exports": ["./components/*", "./globals.css"] },
    "api": { "type": "library", "producesCSS": false },
    "types": { "type": "library", "producesCSS": false }
  },
  "catalog": { /* tracked external deps */ },
  "cssSourceMap": {
    "candidate": ["ui", "builder", "pixels", "analytics"],
    "partner": ["ui", "builder", "pixels"]
  }
}
```

This file is the **single source of truth** the CLI reads when running `add` commands.

---

### 3.4 MCP Server

The CLI exposes an MCP server for AI agent integration.

#### 3.4.1 Tools Exposed

| Tool | Description | Parameters |
|------|-------------|------------|
| `add_app` | Scaffold a new app | `{ name, type, port, i18n, packages }` |
| `add_package` | Scaffold a new package | `{ name, type, producesCSS, exports }` |
| `add_integration` | Add cross-cutting integration | `{ integration, config }` |
| `add_dependency` | Add dependency via catalog | `{ name, version?, target }` |
| `get_workspace_info` | Return `.better-turbo.json` | — |
| `get_dependency_graph` | Return package dependency graph | — |
| `add_route` | Generate route in app | `{ app, path, type }` |
| `add_component` | Generate component in package | `{ package, name, type }` |
| `add_action` | Generate server action | `{ app, name, schema }` |

#### 3.4.2 Resources Exposed

| Resource | Description |
|----------|-------------|
| `workspace://config` | Current `.better-turbo.json` |
| `workspace://apps` | List of apps with metadata |
| `workspace://packages` | List of packages with metadata |
| `workspace://conventions` | Coding conventions, file patterns, CSS rules |

#### 3.4.3 Intent

When an AI agent says "add a database package", the MCP tool `add_package` runs the CLI programmatically. The AI does **not** create files manually — it delegates to the CLI which knows all the wiring rules.

---

## 4. Non-Functional Requirements

### 4.1 Performance

- Project scaffolding (full init) completes in < 30 seconds (excluding `install`)
- `add` commands complete in < 5 seconds
- Dependency installation delegated to package manager (not measured)

### 4.2 Compatibility

- Node.js >= 20
- Bun >= 1.1, pnpm >= 9, npm >= 10, yarn >= 4
- macOS, Linux, Windows (WSL2)
- Turborepo >= 2.0

### 4.3 Extensibility

- **Template system**: Templates stored as EJS/Handlebars files within the CLI package
- **Plugin architecture**: Third-party plugins can register new app types, package types, and integrations
- **Custom presets**: Users can save their preferred configuration as a preset file and reuse it: `create-turbo-stack --preset ./my-preset.json`

### 4.4 Idempotency

- Running `add package ui` when `packages/ui` already exists should warn and skip (not overwrite)
- All `add` operations are idempotent for wiring (re-running updates missing pieces without duplicating)

### 4.5 Rollback

- Failed scaffolding cleans up partially created files
- `add` commands create a `.better-turbo-backup/` snapshot before modifying existing files

---

## 5. Technical Architecture

### 5.1 Tech Stack (CLI Itself)

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js (for max compatibility) + Bun optional |
| CLI framework | `@clack/prompts` (beautiful interactive prompts) |
| File generation | EJS templates + programmatic AST transforms |
| Package.json manipulation | `read-pkg` / `write-pkg` or raw JSON with comment preservation |
| AST transforms | `magicast` (for JS/TS config files), `postcss` (for CSS manipulation) |
| MCP server | `@modelcontextprotocol/sdk` |
| Testing | Vitest + filesystem snapshots |
| Distribution | npm package (`npx create-turbo-stack`) |

### 5.2 Internal Module Structure

```
create-turbo-stack/
├── src/
│   ├── cli/
│   │   ├── index.ts              # Entry point, command routing
│   │   ├── create.ts             # Init mode orchestrator
│   │   ├── add.ts                # Add mode orchestrator
│   │   └── prompts/              # Prompt definitions per category
│   │       ├── basics.ts
│   │       ├── database.ts
│   │       ├── api.ts
│   │       ├── auth.ts
│   │       ├── apps.ts
│   │       ├── packages.ts
│   │       └── infra.ts
│   ├── generators/
│   │   ├── app/
│   │   │   ├── nextjs.ts
│   │   │   ├── expo.ts
│   │   │   ├── tauri.ts
│   │   │   ├── sveltekit.ts
│   │   │   ├── hono.ts
│   │   │   └── vite.ts
│   │   ├── package/
│   │   │   ├── ui.ts
│   │   │   ├── library.ts
│   │   │   ├── react-library.ts
│   │   │   ├── config.ts
│   │   │   └── utils.ts
│   │   ├── integration/
│   │   │   ├── supabase.ts
│   │   │   ├── trpc.ts
│   │   │   ├── i18n.ts
│   │   │   ├── sentry.ts
│   │   │   ├── analytics.ts
│   │   │   └── billing.ts
│   │   └── shared/
│   │       ├── turbo-json.ts      # turbo.json generator/updater
│   │       ├── tsconfig.ts        # tsconfig generator
│   │       ├── package-json.ts    # package.json with catalog support
│   │       ├── globals-css.ts     # CSS @source wiring
│   │       ├── env-validation.ts  # t3-env setup
│   │       └── biome.ts           # Linter config
│   ├── templates/                 # EJS/Handlebars templates
│   │   ├── app/
│   │   ├── package/
│   │   └── config/
│   ├── wiring/
│   │   ├── css-source.ts          # @source directive management
│   │   ├── catalog.ts             # Catalog dependency management
│   │   ├── workspace-refs.ts      # workspace:* reference management
│   │   ├── turbo-tasks.ts         # turbo.json task management
│   │   └── exports-map.ts         # Package exports field management
│   ├── mcp/
│   │   ├── server.ts              # MCP server entry
│   │   ├── tools.ts               # Tool definitions
│   │   └── resources.ts           # Resource definitions
│   ├── config/
│   │   ├── reader.ts              # Read .better-turbo.json
│   │   ├── writer.ts              # Write .better-turbo.json
│   │   └── schema.ts              # Zod schema for config
│   └── utils/
│       ├── fs.ts                  # File system helpers
│       ├── git.ts                 # Git operations
│       ├── pm.ts                  # Package manager detection/commands
│       └── logger.ts              # Styled console output
├── templates/                     # Template files (EJS)
├── presets/                       # Built-in presets
│   ├── minimal.json
│   ├── saas-fullstack.json
│   └── api-only.json
├── tests/
├── package.json
└── tsconfig.json
```

### 5.3 Critical Wiring Logic

#### 5.3.1 CSS @source Auto-Wiring

This is the **single most painful manual step** in large Turborepo projects with Tailwind 4.

**Rule:** Any package that contains `.tsx` files with Tailwind classes MUST have its `src/` directory registered as a `@source` in every consuming app's `globals.css`.

**Implementation:**

```
When: add package (with producesCSS=true) OR add app (consuming CSS packages)
Do:
  1. Read .better-turbo.json → cssSourceMap
  2. For each consuming app:
     a. Parse apps/{app}/src/app/globals.css
     b. Calculate relative path: ../../../../packages/{pkg}/src
     c. Insert @source directive if not present (after existing @source block)
     d. Write file
  3. Update .better-turbo.json cssSourceMap
```

#### 5.3.2 Catalog Dependency Sync

**Rule:** All external dependencies MUST be pinned once in root `package.json` `catalog` section. Workspaces reference via `catalog:`.

**Implementation:**

```
When: add dependency OR scaffold new package/app
Do:
  1. Check if dep exists in root catalog
  2. If not: resolve latest version, add to catalog
  3. In target package.json: add as "dep-name": "catalog:"
  4. If dep has @types/*: also add to catalog + devDependencies
```

#### 5.3.3 Environment Validation Chain

**Rule:** Each app composes env validation from a base `@scope/env` package + app-specific vars.

**Implementation:**

```
When: add app OR add integration (that introduces env vars)
Do:
  1. Ensure @scope/env package exists with base env schema
  2. In app's env.ts: import base + extend with app-specific vars
  3. Update .env.example with all required vars
  4. Update turbo.json globalEnv if needed
```

#### 5.3.4 TypeScript Config Chain

**Rule:** All packages extend from `@scope/typescript-config/{base|react|nextjs|library}.json`.

**Implementation:**

```
When: add package OR add app
Do:
  1. Select correct base config based on type
  2. Generate tsconfig.json with extends + correct paths/includes
  3. Ensure @scope/typescript-config is in devDependencies
```

---

## 6. CLI UX Design

### 6.1 Init Flow Example

```
$ npx create-turbo-stack my-saas

  ╭──────────────────────────────────╮
  │  create-turbo-stack v1.0.0      │
  │  Production-ready Turborepo CLI  │
  ╰──────────────────────────────────╯

  ◆ Package manager?
  │ ● bun (recommended)
  │ ○ pnpm
  │ ○ npm
  │ ○ yarn
  └

  ◆ Organization scope?
  │ @my-saas
  └

  ◆ Database strategy?
  │ ● Supabase (Postgres + Auth + Realtime)
  │ ○ Drizzle ORM
  │ ○ Prisma
  │ ○ None
  └

  ◆ Supabase Project URL?
  │ https://xxx.supabase.co
  └

  ◆ API layer?
  │ ● tRPC v11 (type-safe, recommended)
  │ ○ Hono (lightweight REST)
  │ ○ Next.js API Routes
  │ ○ None
  └

  ◆ Add apps (press Enter when done)
  │ ✓ web — Next.js — port 3000
  │ ✓ api — Next.js API-only — port 3001
  │ + Add another app...
  └

  ◆ Add packages
  │ ✓ ui — React component library (CSS-producing)
  │ ✓ utils — Utility library
  │ (api, types, auth, env auto-created based on selections)
  │ + Add another package...
  └

  ◆ Extras
  │ ☑ shadcn/ui components
  │ ☑ Biome (linter + formatter)
  │ ☑ PostHog analytics
  │ ☑ Sentry error tracking
  │ ☐ React Email + Resend
  │ ☐ i18n (next-intl)
  │ ☐ AI integration (Vercel AI SDK)
  └

  ◇ Scaffolding project...

  ✓ Created 2 apps, 6 packages
  ✓ Wired CSS @source directives
  ✓ Generated turbo.json with 4 tasks
  ✓ Set up catalog with 47 dependencies
  ✓ Environment validation configured
  ✓ Git initialized

  Next steps:
  1. cd my-saas
  2. cp .env.example .env.local  (fill in your keys)
  3. bun install
  4. bun dev
```

### 6.2 Add Flow Example

```
$ cd my-saas
$ npx create-turbo-stack add package

  ◆ Package name?
  │ billing
  └

  ◆ Package type?
  │ ○ UI (React components)
  │ ● Library (TypeScript)
  │ ○ React Library (hooks + components)
  │ ○ Config (shared configuration)
  └

  ◆ Contains TSX with Tailwind classes?
  │ ○ Yes → No
  └

  ◆ Export subpaths? (comma-separated, or empty for single export)
  │ ./client, ./server, ./types
  └

  ◇ Creating @my-saas/billing...

  ✓ packages/billing/ created
  ✓ package.json with catalog dependencies
  ✓ tsconfig.json extending @my-saas/typescript-config/library
  ✓ src/index.ts + src/client.ts + src/server.ts + src/types.ts
  ✓ Registered in .better-turbo.json
  ✓ Added to root workspace

  To use in an app:
    npx create-turbo-stack add dependency @my-saas/billing --to web
```

---

## 7. Built-in Presets

### 7.1 `minimal`
- 1 Next.js app, 1 UI package, Biome, Tailwind 4
- No database, no auth, no API package

### 7.2 `saas-fullstack`
- Next.js web + API app
- Supabase (DB + Auth)
- tRPC, shadcn/ui, i18n
- Analytics, Sentry, Email
- Billing package

### 7.3 `api-only`
- Hono standalone API app
- Drizzle ORM
- No frontend, no Tailwind

### 7.4 Custom Presets
```bash
# Save current config as preset
create-turbo-stack preset save ./my-team-preset.json

# Create from preset
create-turbo-stack --preset ./my-team-preset.json new-project
```

---

## 8. MCP Integration Detail

### 8.1 Configuration

```jsonc
// .claude/mcp.json or claude_desktop_config.json
{
  "mcpServers": {
    "better-turbo": {
      "command": "npx",
      "args": ["create-turbo-stack", "mcp"],
      "cwd": "/path/to/project"
    }
  }
}
```

### 8.2 AI Interaction Examples

**User → AI:** "Bu projeye bir notifications paketi ekle"
**AI → MCP:** `add_package({ name: "notifications", type: "react-library", producesCSS: true, exports: ["./components", "./hooks", "./provider"] })`
**MCP → CLI:** Runs full scaffolding + wiring
**CLI → AI:** Returns created files list + next steps

**User → AI:** "API app'ine yeni bir /webhooks route ekle"
**AI → MCP:** `add_route({ app: "api", path: "/webhooks", type: "api-route" })`

### 8.3 Conventions Resource

The MCP `workspace://conventions` resource returns a structured document that teaches the AI:

```markdown
## File Patterns
- Apps use `src/app/[locale]/` routing with next-intl
- Server actions go in `src/actions/`
- All imports from workspace packages use `@scope/pkg` or `@scope/pkg/subpath`

## CSS Rules
- NEVER add Tailwind classes in a package without ensuring @source is registered
- globals.css MUST import @scope/ui/globals.css
- @source paths are relative from the app's globals.css location

## Dependency Rules
- ALWAYS use catalog: protocol, NEVER pin versions in workspace packages
- workspace:* for internal dependencies

## Environment Rules
- All env vars MUST be validated in the app's env.ts using @t3-oss/env-nextjs
- Server-only vars: NEXT_PUBLIC_ prefix absent
- Client vars: NEXT_PUBLIC_ prefix required
```

---

## 9. Milestones & Roadmap

### Phase 1 — MVP (v0.1.0)
- `create` command with: project basics, Next.js apps, library packages
- Tailwind 4 CSS @source wiring
- Catalog dependency management
- TypeScript config chain
- Biome setup
- `.better-turbo.json` config tracking

### Phase 2 — Database & API (v0.2.0)
- Supabase / Drizzle / Prisma scaffolding
- tRPC / Hono / Next.js API route generators
- Environment validation (`@t3-oss/env-nextjs`)
- `add app` and `add package` commands

### Phase 3 — Auth & Integrations (v0.3.0)
- Auth providers (Supabase Auth, Better Auth, Clerk, NextAuth)
- `add integration` command
- Sentry, PostHog, React Email integrations
- Preset system

### Phase 4 — MCP & AI (v0.4.0)
- MCP server implementation
- Tool definitions for all `add` commands
- Resource definitions for workspace conventions
- AI agent testing (Claude Code, Cursor)

### Phase 5 — Ecosystem (v1.0.0)
- Plugin architecture for third-party extensions
- Expo / Tauri / SvelteKit app generators
- `add route` / `add component` / `add action` granular generators
- Community presets
- Documentation site

---

## 10. Success Criteria

| Metric | Target |
|--------|--------|
| Time to scaffold a full-stack monorepo (5 apps, 10 packages) | < 2 minutes (vs. 2-3 days manual) |
| Time to add a new CSS-producing package with correct wiring | < 10 seconds (vs. 30+ minutes manual) |
| Zero CSS @source bugs from CLI-scaffolded projects | 100% correct wiring |
| AI agents can add packages without manual file creation | Via MCP tools |
| New team member onboarding time for monorepo patterns | < 1 hour (just run CLI) |

---

## 11. Appendix: Patterns Extracted from cvisioner

These are the real-world patterns the CLI must replicate:

### A. globals.css Template (for Next.js app consuming UI + other TSX packages)

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "@{scope}/ui/globals.css";

@source "../../src";
@source "../../../../packages/ui/src";
/* Auto-generated: one @source per CSS-producing package */

@custom-variant dark (&:is(.dark *));

@theme inline {
  /* Generated theme variables */
}
```

### B. package.json Template (library package)

```json
{
  "name": "@{scope}/{name}",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": { "types": "./src/index.ts", "default": "./src/index.ts" }
  },
  "scripts": {
    "lint": "biome check",
    "format": "biome format --write",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {},
  "devDependencies": {
    "@{scope}/typescript-config": "workspace:*",
    "@biomejs/biome": "catalog:",
    "typescript": "catalog:"
  }
}
```

### C. tsconfig.json Template (react library)

```json
{
  "extends": "@{scope}/typescript-config/react.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### D. PostCSS Config (identical across all apps)

```javascript
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

### E. Environment Validation Pattern

```typescript
import { createEnv } from "@t3-oss/env-nextjs";
import { baseEnv } from "@{scope}/env";
import { z } from "zod";

export const env = createEnv({
  extends: [baseEnv],
  server: {
    APP_SPECIFIC_SECRET: z.string().min(1),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
  },
  runtimeEnv: {
    APP_SPECIFIC_SECRET: process.env.APP_SPECIFIC_SECRET,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
});
```

### F. turbo.json Task Pattern

```jsonc
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**", "!.next/cache/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "type-check": {
      "dependsOn": ["^type-check"]
    }
  },
  "globalDependencies": [".env.*local"],
  "globalEnv": [
    /* populated based on integrations */
  ]
}
```

---

*This SRS is a living document. It will evolve as `create-turbo-stack` is developed and community feedback is incorporated.*
