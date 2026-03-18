# create-turbo-stack — Software Design Document (SDD)

**Version:** 1.0.0-draft
**Author:** Mehmet Yigit Yalim
**Date:** 2026-03-18
**Status:** Draft
**Companion:** See `create-turbo-stack-srs.md` for requirements (what). This document covers design (how).

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [System Architecture](#2-system-architecture)
3. [Monorepo Structure](#3-monorepo-structure)
4. [Package: `@create-turbo-stack/schema`](#4-package-schema)
5. [Package: `@create-turbo-stack/core`](#5-package-core)
6. [Package: `@create-turbo-stack/templates`](#6-package-templates)
7. [Package: `create-turbo-stack` (CLI)](#7-package-cli)
8. [App: `web`](#8-app-web)
9. [Registry System](#9-registry-system)
10. [MCP Server](#10-mcp-server)
11. [Wiring Logic Detail](#11-wiring-logic-detail)
12. [Error Handling & Rollback](#12-error-handling--rollback)
13. [Testing Strategy](#13-testing-strategy)
14. [npm Publish Strategy](#14-npm-publish-strategy)
15. [Phase Breakdown (Implementation Order)](#15-phase-breakdown)

---

## 1. Design Philosophy

### 1.1 Core Principles

| Principle | Meaning |
|-----------|---------|
| **Platform-agnostic core** | `resolveFileTree()` runs in both browser and Node.js. No `fs`, `path`, or Node APIs in core. |
| **Preset-driven** | Every project is a materialized preset. Interactive prompts produce a preset. Builder UI produces a preset. Community shares presets. The preset JSON is the universal contract. |
| **Wiring over scaffolding** | The hard part isn't creating files — it's wiring them correctly (CSS `@source`, catalog deps, env chains, tsconfig extends). The wiring engine is the product. |
| **Idempotent operations** | Running `add package ui` twice doesn't duplicate anything. Running it once and then again after manual edits preserves manual work. |
| **No runtime dependency** | Generated projects have zero dependency on `create-turbo-stack`. The CLI is a dev tool, not a runtime. |

### 1.2 Naming

| Context | Name |
|---------|------|
| npm package (CLI) | `create-turbo-stack` |
| npx invocation | `npx create-turbo-stack` |
| Config file in generated projects | `.turbo-stack.json` |
| Web domain | `create-turbo-stack.dev` (planned) |
| Monorepo (this repo) | `create-turbo-stack` |
| Internal packages scope | `@create-turbo-stack/*` |

---

## 2. System Architecture

### 2.1 High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Entry Points                            │
│                                                                 │
│   Terminal              Web Browser           AI Agent          │
│   ┌──────────┐         ┌──────────────┐      ┌──────────┐       │
│   │   CLI    │         │  Builder UI  │      │   MCP    │       │
│   └────┬─────┘         └──────┬───────┘      └────┬─────┘       │
│        │                      │                    │            │
├────────┼──────────────────────┼────────────────────┼────────────┤
│        │                      │                    │            │
│        ▼                      ▼                    ▼            │
│   ┌─────────────────────────────────────────────────────┐       │
│   │                    @create-turbo-stack/core         │       │
│   │                                                     │       │
│   │  ┌───────────────┐  ┌──────────────┐  ┌─────────┐   │       │
│   │  │ resolveFile   │  │   wiring     │  │ config  │   │       │
│   │  │ Tree()        │  │   engine     │  │ schema  │   │       │
│   │  └───────────────┘  └──────────────┘  └─────────┘   │       │
│   └──────────────────────────┬──────────────────────────┘       │
│                              │                                  │
│   ┌──────────────────────────▼──────────────────────────┐       │
│   │              @create-turbo-stack/templates          │       │
│   │              (EJS files, read as strings)           │       │
│   └─────────────────────────────────────────────────────┘       │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                     I/O Layer (Node.js only)                    │
│                                                                 │
│   CLI:  fs.writeFile, child_process (git, package manager)      │
│   MCP:  same as CLI, invoked via MCP protocol                   │
│   Web:  NO I/O — uses resolveFileTree() for preview only        │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
Preset JSON ──► resolveFileTree() ──► FileTree ──► renderTemplates() ──► RenderedFile[]
                                         │                                      │
                                         │ (web: stops here,                    │ (CLI: writes to disk)
                                         │  shows preview)                      │
                                         ▼                                      ▼
                                    Visual Tree                           Actual Files
                                    in Browser                            on Filesystem
                                                                               │
                                                                               ▼
                                                                        wireProject()
                                                                        - CSS @source
                                                                        - catalog sync
                                                                        - env validation
                                                                        - turbo.json
```

### 2.3 Boundary Rules

| Module | Can import | Cannot import | Runs in |
|--------|-----------|---------------|---------|
| `schema` | zod | anything else | Browser + Node |
| `core` | `schema`, `templates` (as strings) | `fs`, `path`, `child_process` | Browser + Node |
| `templates` | nothing (passive data) | — | Read by core |
| `cli` | `core`, `schema`, Node APIs | — | Node only |
| `web` | `core`, `schema`, React | Node APIs | Browser only |
| `mcp` | `core`, `schema`, `cli` internals | — | Node only |

---

## 3. Monorepo Structure

```
create-turbo-stack/
├── apps/
│   └── web/                          # Next.js — landing + builder + registry
│       ├── src/
│       │   ├── app/
│       │   │   ├── page.tsx                    # Landing page
│       │   │   ├── builder/
│       │   │   │   └── page.tsx                # Interactive stack builder
│       │   │   ├── presets/
│       │   │   │   ├── page.tsx                # Community preset gallery
│       │   │   │   └── [slug]/page.tsx         # Individual preset page
│       │   │   └── docs/
│       │   │       └── [...slug]/page.tsx      # Documentation
│       │   ├── components/
│       │   │   ├── builder/
│       │   │   │   ├── stack-selector.tsx       # Main builder UI
│       │   │   │   ├── file-tree-preview.tsx    # Visual file tree
│       │   │   │   ├── config-panel.tsx         # Config editor
│       │   │   │   └── preset-export.tsx        # Export as URL/JSON/command
│       │   │   ├── landing/
│       │   │   └── shared/
│       │   └── lib/
│       │       └── tree-to-visual.ts           # FileTree → visual component data
│       ├── public/
│       │   └── s/                              # Built-in presets served as static JSON
│       │       ├── minimal.json
│       │       ├── saas-starter.json
│       │       └── api-only.json
│       ├── package.json
│       └── next.config.ts
│
├── packages/
│   ├── schema/                       # Zod schemas + JSON Schema generation
│   │   ├── src/
│   │   │   ├── index.ts              # Re-exports everything
│   │   │   ├── preset.ts             # PresetSchema — the universal contract
│   │   │   ├── config.ts             # TurboStackConfigSchema (.turbo-stack.json)
│   │   │   ├── registry.ts           # RegistrySchema (community registry format)
│   │   │   ├── registry-item.ts      # Individual registry item schema
│   │   │   ├── file-tree.ts          # FileTreeNode type definitions
│   │   │   └── options/              # Sub-schemas for each category
│   │   │       ├── basics.ts
│   │   │       ├── database.ts
│   │   │       ├── api.ts
│   │   │       ├── auth.ts
│   │   │       ├── app.ts
│   │   │       ├── package.ts
│   │   │       ├── css.ts
│   │   │       └── integrations.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── core/                         # Platform-agnostic business logic
│   │   ├── src/
│   │   │   ├── index.ts              # Public API exports
│   │   │   ├── resolve/
│   │   │   │   ├── file-tree.ts      # resolveFileTree(preset) → FileTree
│   │   │   │   ├── app-files.ts      # App-specific file resolution
│   │   │   │   ├── package-files.ts  # Package-specific file resolution
│   │   │   │   ├── config-files.ts   # Root config file resolution
│   │   │   │   └── integration-files.ts
│   │   │   ├── render/
│   │   │   │   ├── template-engine.ts    # EJS rendering (string in → string out)
│   │   │   │   ├── render-tree.ts        # FileTree → RenderedFile[] (with content)
│   │   │   │   └── template-context.ts   # Build template variables from preset
│   │   │   ├── wiring/
│   │   │   │   ├── css-source.ts         # @source directive computation
│   │   │   │   ├── catalog.ts            # Catalog dependency computation
│   │   │   │   ├── workspace-refs.ts     # workspace:* reference computation
│   │   │   │   ├── env-chain.ts          # Environment validation chain computation
│   │   │   │   ├── tsconfig-chain.ts     # TypeScript config chain computation
│   │   │   │   ├── turbo-tasks.ts        # turbo.json task graph computation
│   │   │   │   └── exports-map.ts        # Package exports field computation
│   │   │   ├── diff/
│   │   │   │   ├── tree-diff.ts          # Compare existing project ↔ desired state
│   │   │   │   └── merge-strategy.ts     # How to merge changes (add mode)
│   │   │   └── utils/
│   │   │       ├── path.ts               # Platform-agnostic path utilities (no Node path)
│   │   │       ├── naming.ts             # Slug, scope, package name conventions
│   │   │       └── dependency-graph.ts   # Package dependency graph utilities
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── templates/                    # EJS template files (passive data)
│   │   ├── src/
│   │   │   ├── index.ts              # Exports template strings by key
│   │   │   ├── app/
│   │   │   │   ├── nextjs/
│   │   │   │   │   ├── package.json.ejs
│   │   │   │   │   ├── next.config.ts.ejs
│   │   │   │   │   ├── tsconfig.json.ejs
│   │   │   │   │   ├── src/
│   │   │   │   │   │   ├── app/
│   │   │   │   │   │   │   ├── layout.tsx.ejs
│   │   │   │   │   │   │   ├── page.tsx.ejs
│   │   │   │   │   │   │   └── globals.css.ejs
│   │   │   │   │   │   └── env.ts.ejs
│   │   │   │   │   ├── postcss.config.mjs.ejs
│   │   │   │   │   └── tailwind.config.ts.ejs   # (if tw3)
│   │   │   │   ├── nextjs-api-only/
│   │   │   │   ├── expo/
│   │   │   │   ├── hono/
│   │   │   │   ├── vite-react/
│   │   │   │   ├── sveltekit/
│   │   │   │   ├── astro/
│   │   │   │   ├── remix/
│   │   │   │   ├── tauri/
│   │   │   │   └── vite-vue/
│   │   │   ├── package/
│   │   │   │   ├── ui/
│   │   │   │   │   ├── package.json.ejs
│   │   │   │   │   ├── tsconfig.json.ejs
│   │   │   │   │   └── src/
│   │   │   │   │       ├── index.ts.ejs
│   │   │   │   │       └── globals.css.ejs
│   │   │   │   ├── library/
│   │   │   │   ├── react-library/
│   │   │   │   ├── config/
│   │   │   │   └── utils/
│   │   │   ├── integration/
│   │   │   │   ├── supabase/
│   │   │   │   ├── drizzle/
│   │   │   │   ├── prisma/
│   │   │   │   ├── trpc/
│   │   │   │   ├── hono-api/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── supabase-auth/
│   │   │   │   │   ├── better-auth/
│   │   │   │   │   ├── clerk/
│   │   │   │   │   ├── next-auth/
│   │   │   │   │   └── lucia/
│   │   │   │   ├── i18n/
│   │   │   │   ├── sentry/
│   │   │   │   ├── analytics/
│   │   │   │   ├── email/
│   │   │   │   └── ai/
│   │   │   └── root/
│   │   │       ├── package.json.ejs          # Root package.json
│   │   │       ├── turbo.json.ejs
│   │   │       ├── biome.json.ejs
│   │   │       ├── .gitignore.ejs
│   │   │       ├── .npmrc.ejs
│   │   │       ├── .env.example.ejs
│   │   │       └── tsconfig/                 # typescript-config package templates
│   │   │           ├── base.json.ejs
│   │   │           ├── react.json.ejs
│   │   │           ├── nextjs.json.ejs
│   │   │           └── library.json.ejs
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── cli/                          # CLI entry point — Node.js only
│       ├── src/
│       │   ├── index.ts              # bin entry: parse args, route to command
│       │   ├── commands/
│       │   │   ├── create.ts         # `create-turbo-stack` or `create-turbo-stack create`
│       │   │   ├── add.ts            # `create-turbo-stack add <type>`
│       │   │   ├── preset.ts         # `create-turbo-stack preset <action>`
│       │   │   └── mcp.ts            # `create-turbo-stack mcp` — starts MCP server
│       │   ├── prompts/
│       │   │   ├── create-flow.ts    # Full interactive create flow
│       │   │   ├── add-app.ts        # Add app prompts
│       │   │   ├── add-package.ts    # Add package prompts
│       │   │   └── add-integration.ts
│       │   ├── io/
│       │   │   ├── writer.ts         # RenderedFile[] → disk (fs operations)
│       │   │   ├── reader.ts         # Read existing project state
│       │   │   ├── git.ts            # git init, .gitignore
│       │   │   └── pm.ts            # Package manager detection + install
│       │   ├── mcp/
│       │   │   ├── server.ts         # MCP server setup
│       │   │   ├── tools.ts          # MCP tool definitions
│       │   │   └── resources.ts      # MCP resource definitions
│       │   └── utils/
│       │       ├── logger.ts         # Styled output (@clack/prompts style)
│       │       └── fetch-preset.ts   # Fetch preset from URL
│       ├── bin/
│       │   └── create-turbo-stack.ts # Shebang entry
│       ├── package.json
│       └── tsconfig.json
│
├── presets/                          # Built-in preset source files
│   ├── minimal.json
│   ├── saas-starter.json
│   └── api-only.json
│
├── create-turbo-stack-srs.md         # Requirements (what)
├── create-turbo-stack-sdd.md         # Design (how) — this file
├── turbo.json
├── package.json
└── bun.lock
```

---

## 4. Package: `@create-turbo-stack/schema`

### 4.1 Purpose

Single source of truth for all data shapes. Every other package imports types and validators from here. Zero logic — only Zod schemas and TypeScript types derived from them.

### 4.2 Preset Schema

The preset is the **universal contract**. Every entry point (CLI prompts, web builder, community registry, MCP) produces a preset. Core consumes it.

```typescript
// packages/schema/src/options/basics.ts

import { z } from "zod";

export const PackageManagerSchema = z.enum(["bun", "pnpm", "npm", "yarn"]);
export const TypeScriptStrictnessSchema = z.enum(["strict", "relaxed"]);
export const LinterSchema = z.enum(["biome", "eslint-prettier"]);

export const BasicsSchema = z.object({
  projectName: z.string().min(1).regex(/^[a-z0-9-]+$/),
  packageManager: PackageManagerSchema.default("bun"),
  scope: z.string().regex(/^@[a-z0-9-]+$/),
  typescript: TypeScriptStrictnessSchema.default("strict"),
  linter: LinterSchema.default("biome"),
  gitInit: z.boolean().default(true),
});
```

```typescript
// packages/schema/src/options/database.ts

import { z } from "zod";

export const DatabaseStrategySchema = z.enum(["supabase", "drizzle", "prisma", "none"]);

export const DrizzleDriverSchema = z.enum([
  "postgres", "mysql", "sqlite", "turso", "neon", "planetscale"
]);

export const DatabaseSchema = z.discriminatedUnion("strategy", [
  z.object({
    strategy: z.literal("supabase"),
  }),
  z.object({
    strategy: z.literal("drizzle"),
    driver: DrizzleDriverSchema,
  }),
  z.object({
    strategy: z.literal("prisma"),
  }),
  z.object({
    strategy: z.literal("none"),
  }),
]);
```

```typescript
// packages/schema/src/options/api.ts

import { z } from "zod";

export const ApiStrategySchema = z.enum(["trpc", "hono", "rest-nextjs", "none"]);
// NOTE: graphql removed from SRS — no implementation detail existed, out of scope

export const HonoModeSchema = z.enum(["standalone-app", "nextjs-route"]);

export const ApiSchema = z.discriminatedUnion("strategy", [
  z.object({
    strategy: z.literal("trpc"),
    version: z.literal("v11").default("v11"),
  }),
  z.object({
    strategy: z.literal("hono"),
    mode: HonoModeSchema,
  }),
  z.object({
    strategy: z.literal("rest-nextjs"),
  }),
  z.object({
    strategy: z.literal("none"),
  }),
]);
```

```typescript
// packages/schema/src/options/auth.ts

import { z } from "zod";

export const AuthProviderSchema = z.enum([
  "supabase-auth", "better-auth", "clerk", "next-auth", "lucia", "none"
]);

export const AuthSchema = z.object({
  provider: AuthProviderSchema.default("none"),
  rbac: z.boolean().default(false),         // Role-based access control
  entitlements: z.boolean().default(false),  // Plan/entitlement system
});
```

```typescript
// packages/schema/src/options/app.ts

import { z } from "zod";

export const AppTypeSchema = z.enum([
  "nextjs", "nextjs-api-only", "expo", "hono-standalone",
  "vite-react", "vite-vue", "sveltekit", "astro", "remix", "tauri"
]);

export const CmsSchema = z.enum(["sanity", "keystatic", "none"]);

export const AppSchema = z.object({
  name: z.string().min(1).regex(/^[a-z0-9-]+$/),
  type: AppTypeSchema,
  port: z.number().int().min(1000).max(65535),
  i18n: z.boolean().default(false),
  cms: CmsSchema.default("none"),
  consumes: z.array(z.string()).default([]),  // package names to consume
});
```

```typescript
// packages/schema/src/options/package.ts

import { z } from "zod";

export const PackageTypeSchema = z.enum([
  "ui", "utils", "config", "library", "react-library"
]);

export const PackageSchema = z.object({
  name: z.string().min(1).regex(/^[a-z0-9-]+$/),
  type: PackageTypeSchema,
  producesCSS: z.boolean().default(false),
  exports: z.array(z.string()).default(["."]),  // subpath exports
});
```

```typescript
// packages/schema/src/options/css.ts

import { z } from "zod";

export const CssFrameworkSchema = z.enum(["tailwind4", "tailwind3", "vanilla", "css-modules"]);
export const UiLibrarySchema = z.enum(["shadcn", "radix-raw", "none"]);
export const StylingArchSchema = z.enum(["css-variables", "static"]);

export const CssSchema = z.object({
  framework: CssFrameworkSchema.default("tailwind4"),
  ui: UiLibrarySchema.default("none"),
  styling: StylingArchSchema.default("css-variables"),
});
```

```typescript
// packages/schema/src/options/integrations.ts

import { z } from "zod";

export const AnalyticsSchema = z.enum(["posthog", "vercel-analytics", "plausible", "none"]);
export const ErrorTrackingSchema = z.enum(["sentry", "none"]);
export const EmailSchema = z.enum(["react-email-resend", "nodemailer", "none"]);
export const RateLimitSchema = z.enum(["upstash", "none"]);
export const AiSchema = z.enum(["vercel-ai-sdk", "langchain", "none"]);

export const IntegrationsSchema = z.object({
  analytics: AnalyticsSchema.default("none"),
  errorTracking: ErrorTrackingSchema.default("none"),
  email: EmailSchema.default("none"),
  rateLimit: RateLimitSchema.default("none"),
  ai: AiSchema.default("none"),
  envValidation: z.boolean().default(true),  // t3-env — on by default
});
```

```typescript
// packages/schema/src/preset.ts

import { z } from "zod";
import { BasicsSchema } from "./options/basics";
import { DatabaseSchema } from "./options/database";
import { ApiSchema } from "./options/api";
import { AuthSchema } from "./options/auth";
import { AppSchema } from "./options/app";
import { PackageSchema } from "./options/package";
import { CssSchema } from "./options/css";
import { IntegrationsSchema } from "./options/integrations";

export const PresetSchema = z.object({
  $schema: z.string().optional(),
  name: z.string().min(1),
  version: z.string().default("1.0.0"),
  description: z.string().optional(),
  author: z.string().optional(),

  basics: BasicsSchema,
  database: DatabaseSchema,
  api: ApiSchema,
  auth: AuthSchema,
  css: CssSchema,
  integrations: IntegrationsSchema,

  apps: z.array(AppSchema).min(1),
  packages: z.array(PackageSchema).default([]),
});

export type Preset = z.infer<typeof PresetSchema>;
```

### 4.3 Validation Constraints (Cross-Field)

Some combinations are invalid. These are enforced via Zod `.refine()` on the top-level `PresetSchema`:

```typescript
// Added to PresetSchema via .superRefine()

export const ValidatedPresetSchema = PresetSchema.superRefine((data, ctx) => {
  // 1. If auth is supabase-auth, database must be supabase
  if (data.auth.provider === "supabase-auth" && data.database.strategy !== "supabase") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "supabase-auth requires database strategy 'supabase'",
      path: ["auth", "provider"],
    });
  }

  // 2. If api is hono with standalone-app, there should be a hono-standalone app
  if (data.api.strategy === "hono" && data.api.mode === "standalone-app") {
    const hasHonoApp = data.apps.some(a => a.type === "hono-standalone");
    if (!hasHonoApp) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Hono standalone API strategy requires at least one hono-standalone app",
        path: ["api"],
      });
    }
  }

  // 3. i18n only makes sense for web-facing apps
  for (const [i, app] of data.apps.entries()) {
    if (app.i18n && !["nextjs", "sveltekit", "astro", "remix"].includes(app.type)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `i18n is not supported for app type '${app.type}'`,
        path: ["apps", i, "i18n"],
      });
    }
  }

  // 4. App names must be unique
  const appNames = data.apps.map(a => a.name);
  const dupeApp = appNames.find((n, i) => appNames.indexOf(n) !== i);
  if (dupeApp) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Duplicate app name: '${dupeApp}'`,
      path: ["apps"],
    });
  }

  // 5. Package names must be unique
  const pkgNames = data.packages.map(p => p.name);
  const dupePkg = pkgNames.find((n, i) => pkgNames.indexOf(n) !== i);
  if (dupePkg) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Duplicate package name: '${dupePkg}'`,
      path: ["packages"],
    });
  }

  // 6. consumes references must point to existing packages or auto-generated ones
  const allPackageNames = new Set([
    ...pkgNames,
    // auto-generated packages based on selections:
    ...(data.database.strategy !== "none" ? ["db"] : []),
    ...(data.api.strategy !== "none" ? ["api"] : []),
    ...(data.auth.provider !== "none" ? ["auth"] : []),
    ...(data.integrations.envValidation ? ["env"] : []),
    "typescript-config",  // always generated
  ]);
  for (const [i, app] of data.apps.entries()) {
    for (const consumed of app.consumes) {
      if (!allPackageNames.has(consumed)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `App '${app.name}' consumes unknown package '${consumed}'`,
          path: ["apps", i, "consumes"],
        });
      }
    }
  }

  // 7. Port uniqueness
  const ports = data.apps.map(a => a.port);
  const dupePort = ports.find((p, i) => ports.indexOf(p) !== i);
  if (dupePort) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Duplicate port: ${dupePort}`,
      path: ["apps"],
    });
  }

  // 8. CMS only for nextjs apps
  for (const [i, app] of data.apps.entries()) {
    if (app.cms !== "none" && app.type !== "nextjs") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `CMS integration only supported for nextjs apps`,
        path: ["apps", i, "cms"],
      });
    }
  }
});
```

### 4.4 Config Schema (`.turbo-stack.json`)

This is what lives in a generated project. It's a superset of the preset with runtime state:

```typescript
// packages/schema/src/config.ts

import { z } from "zod";
import { PresetSchema } from "./preset";

export const TurboStackConfigSchema = PresetSchema.extend({
  // Runtime state (not in presets)
  generatedAt: z.string().datetime(),
  cliVersion: z.string(),

  // Resolved state after generation
  catalog: z.record(z.string(), z.string()).default({}),  // dep → version
  cssSourceMap: z.record(z.string(), z.array(z.string())).default({}),  // app → [packages]

  // Auto-generated packages (not user-specified)
  autoPackages: z.array(z.string()).default([]),  // ["db", "api", "auth", "env", "typescript-config"]
});

export type TurboStackConfig = z.infer<typeof TurboStackConfigSchema>;
```

### 4.5 Registry Schema

```typescript
// packages/schema/src/registry.ts

import { z } from "zod";

export const RegistryItemSchema = z.object({
  name: z.string().min(1),
  title: z.string(),
  description: z.string(),
  type: z.literal("registry:preset"),
  author: z.string().optional(),
  tags: z.array(z.string()).default([]),
  preset: z.string().url(),  // URL to preset JSON
});

export const RegistrySchema = z.object({
  $schema: z.string().optional(),
  name: z.string().min(1),
  homepage: z.string().url().optional(),
  items: z.array(RegistryItemSchema),
});

export type Registry = z.infer<typeof RegistrySchema>;
export type RegistryItem = z.infer<typeof RegistryItemSchema>;
```

### 4.6 FileTree Types

```typescript
// packages/schema/src/file-tree.ts

export interface FileTreeNode {
  /** Relative path from project root, e.g. "packages/ui/src/index.ts" */
  path: string;
  /** File content after template rendering. Undefined for directories. */
  content?: string;
  /** Whether this is a directory node */
  isDirectory: boolean;
  /** Template key used to generate this file (for debugging/tracing) */
  templateKey?: string;
  /** Metadata for wiring (which package produces this, etc.) */
  meta?: Record<string, unknown>;
}

export interface FileTree {
  /** Project root name */
  projectName: string;
  /** All nodes, flat list (directories implicit from paths) */
  nodes: FileTreeNode[];
}

export interface RenderedFile {
  /** Relative path from project root */
  path: string;
  /** Final file content (template rendered + wiring applied) */
  content: string;
}
```

---

## 5. Package: `@create-turbo-stack/core`

### 5.1 Purpose

All business logic that doesn't touch the filesystem. The core question it answers: "Given a preset, what files should exist and what should be in them?"

### 5.2 Public API

```typescript
// packages/core/src/index.ts — public API

export {
  resolveFileTree,
  type ResolveOptions,
} from "./resolve/file-tree";

export {
  renderTree,
} from "./render/render-tree";

export {
  computeCssSourceMap,
  computeCatalog,
  computeEnvChain,
  computeTurboTasks,
  computeTsconfigChain,
  computeWorkspaceRefs,
  computeExportsMap,
} from "./wiring";

export {
  diffTree,
  type TreeDiff,
} from "./diff/tree-diff";

export {
  buildTemplateContext,
} from "./render/template-context";
```

### 5.3 `resolveFileTree(preset): FileTree`

The main function. Takes a validated preset JSON and returns a complete file tree.

```typescript
// packages/core/src/resolve/file-tree.ts

import type { Preset } from "@create-turbo-stack/schema";
import type { FileTree, FileTreeNode } from "@create-turbo-stack/schema";
import { resolveRootFiles } from "./config-files";
import { resolveAppFiles } from "./app-files";
import { resolvePackageFiles } from "./package-files";
import { resolveIntegrationFiles } from "./integration-files";
import { resolveAutoPackages } from "./auto-packages";

export interface ResolveOptions {
  /** If true, include file content (rendered templates). If false, only paths. */
  includeContent: boolean;
}

export function resolveFileTree(
  preset: Preset,
  options: ResolveOptions = { includeContent: true }
): FileTree {
  const nodes: FileTreeNode[] = [];

  // 1. Root config files (package.json, turbo.json, biome.json, .gitignore, etc.)
  nodes.push(...resolveRootFiles(preset));

  // 2. Auto-generated packages (typescript-config, env, db, api, auth)
  const autoPackages = resolveAutoPackages(preset);
  for (const pkg of autoPackages) {
    nodes.push(...resolvePackageFiles(preset, pkg));
  }

  // 3. User-specified packages
  for (const pkg of preset.packages) {
    nodes.push(...resolvePackageFiles(preset, pkg));
  }

  // 4. Apps
  for (const app of preset.apps) {
    nodes.push(...resolveAppFiles(preset, app));
  }

  // 5. Integration files (cross-cutting: sentry config, analytics setup, etc.)
  nodes.push(...resolveIntegrationFiles(preset));

  // 6. If content not needed (preview mode), strip content
  if (!options.includeContent) {
    return {
      projectName: preset.basics.projectName,
      nodes: nodes.map(n => ({ ...n, content: undefined })),
    };
  }

  return {
    projectName: preset.basics.projectName,
    nodes,
  };
}
```

### 5.4 Auto-Generated Packages

Based on preset selections, some packages are automatically created:

```typescript
// packages/core/src/resolve/auto-packages.ts

import type { Preset } from "@create-turbo-stack/schema";
import type { PackageSchema } from "@create-turbo-stack/schema";

export function resolveAutoPackages(preset: Preset): Array<z.infer<typeof PackageSchema>> {
  const auto: Array<z.infer<typeof PackageSchema>> = [];

  // Always: typescript-config
  auto.push({
    name: "typescript-config",
    type: "config",
    producesCSS: false,
    exports: ["."],
  });

  // If env validation enabled
  if (preset.integrations.envValidation) {
    auto.push({
      name: "env",
      type: "library",
      producesCSS: false,
      exports: ["."],
    });
  }

  // If database !== none
  if (preset.database.strategy !== "none") {
    auto.push({
      name: "db",
      type: "library",
      producesCSS: false,
      exports: ["."],
    });
  }

  // If api !== none
  if (preset.api.strategy !== "none") {
    auto.push({
      name: "api",
      type: "library",
      producesCSS: false,
      exports: preset.api.strategy === "trpc"
        ? [".", "./server", "./client"]
        : ["."],
    });
  }

  // If auth !== none
  if (preset.auth.provider !== "none") {
    auto.push({
      name: "auth",
      type: "library",
      producesCSS: false,
      exports: [".", "./server", "./client", "./middleware"],
    });
  }

  return auto;
}
```

### 5.5 Template Rendering

Templates are EJS strings. Core renders them with a context built from the preset.

```typescript
// packages/core/src/render/template-context.ts

import type { Preset } from "@create-turbo-stack/schema";

export interface TemplateContext {
  // Basics
  projectName: string;
  scope: string;          // "@myorg"
  scopeName: string;      // "myorg" (without @)
  packageManager: string;
  isStrict: boolean;

  // App-specific (when rendering app templates)
  app?: {
    name: string;
    type: string;
    port: number;
    i18n: boolean;
    cms: string;
    consumes: string[];
  };

  // Package-specific (when rendering package templates)
  pkg?: {
    name: string;
    fullName: string;     // "@scope/name"
    type: string;
    producesCSS: boolean;
    exports: string[];
  };

  // Global selections
  database: { strategy: string; driver?: string };
  api: { strategy: string; version?: string; mode?: string };
  auth: { provider: string; rbac: boolean; entitlements: boolean };
  css: { framework: string; ui: string; styling: string };
  integrations: Record<string, string | boolean>;

  // Computed by wiring engine
  wiring: {
    cssSourceDirectives: string[];    // @source lines for globals.css
    catalogDeps: Record<string, string>;  // deps for this package/app
    devCatalogDeps: Record<string, string>;
    workspaceRefs: Record<string, string>;
    envVars: { server: string[]; client: string[] };
    turboTasks: Record<string, unknown>;
  };
}

export function buildTemplateContext(
  preset: Preset,
  target?: { type: "app" | "package"; name: string }
): TemplateContext {
  // Build full context from preset + wiring computations
  // ...implementation
}
```

```typescript
// packages/core/src/render/template-engine.ts

// Using a lightweight EJS-compatible renderer that works in browser.
// Options: ejs (node-only), eta (browser-compatible), or custom.
// Decision: Use Eta — EJS-compatible syntax, works in browser, small bundle.

import { Eta } from "eta";

const eta = new Eta({ autoEscape: false });

export function renderTemplate(
  templateString: string,
  context: TemplateContext
): string {
  return eta.renderString(templateString, context);
}
```

**Decision: Eta over EJS.** EJS uses `fs.readFile` internally and doesn't run in browser. Eta has identical `<%= %>` syntax but is platform-agnostic. Drop-in replacement.

### 5.6 App File Resolution

```typescript
// packages/core/src/resolve/app-files.ts

import type { Preset, AppSchema } from "@create-turbo-stack/schema";
import type { FileTreeNode } from "@create-turbo-stack/schema";
import { getTemplates } from "@create-turbo-stack/templates";
import { renderTemplate } from "../render/template-engine";
import { buildTemplateContext } from "../render/template-context";

export function resolveAppFiles(
  preset: Preset,
  app: z.infer<typeof AppSchema>
): FileTreeNode[] {
  const nodes: FileTreeNode[] = [];
  const ctx = buildTemplateContext(preset, { type: "app", name: app.name });
  const templates = getTemplates("app", app.type);

  // Each template maps to an output path:
  // Template: "app/nextjs/package.json.ejs"
  // Output:   "apps/{app.name}/package.json"

  for (const [templatePath, templateContent] of Object.entries(templates)) {
    const outputPath = resolveOutputPath(templatePath, app);
    const content = renderTemplate(templateContent, ctx);

    nodes.push({
      path: outputPath,
      content,
      isDirectory: false,
      templateKey: templatePath,
    });
  }

  // Conditional files based on selections
  if (app.i18n && ["nextjs", "sveltekit", "astro", "remix"].includes(app.type)) {
    const i18nTemplates = getTemplates("integration", "i18n");
    // Add i18n-specific files to this app
    for (const [templatePath, templateContent] of Object.entries(i18nTemplates)) {
      const outputPath = resolveI18nOutputPath(templatePath, app);
      const content = renderTemplate(templateContent, ctx);
      nodes.push({ path: outputPath, content, isDirectory: false, templateKey: templatePath });
    }
  }

  if (app.cms !== "none") {
    const cmsTemplates = getTemplates("integration", app.cms);
    // Add CMS-specific files
    // ...
  }

  return nodes;
}

function resolveOutputPath(templatePath: string, app: z.infer<typeof AppSchema>): string {
  // "app/nextjs/package.json.ejs" → "apps/web/package.json"
  // "app/nextjs/src/app/layout.tsx.ejs" → "apps/web/src/app/layout.tsx"
  const withoutPrefix = templatePath.replace(`app/${app.type}/`, "");
  const withoutEjs = withoutPrefix.replace(/\.ejs$/, "");
  return `apps/${app.name}/${withoutEjs}`;
}
```

### 5.7 Diff Engine (for `add` mode)

When running `add app` or `add package` on an existing project, we need to compute the diff between current state and desired state:

```typescript
// packages/core/src/diff/tree-diff.ts

import type { FileTreeNode } from "@create-turbo-stack/schema";

export interface TreeDiff {
  /** Files that should be created (don't exist yet) */
  create: FileTreeNode[];
  /** Files that exist and need to be updated (wiring changes) */
  update: Array<{
    path: string;
    /** Specific mutations to apply, not full replacement */
    mutations: FileMutation[];
  }>;
  /** Files that should not be touched */
  unchanged: string[];
}

export type FileMutation =
  | { type: "insert-line"; after: string | RegExp; content: string }
  | { type: "append-to-json"; jsonPath: string[]; value: unknown }
  | { type: "replace-block"; start: string | RegExp; end: string | RegExp; content: string }
  | { type: "insert-css-source"; directive: string };

export function diffTree(
  existingFiles: Map<string, string>,  // path → content (read from disk by CLI)
  desiredNodes: FileTreeNode[],
): TreeDiff {
  const diff: TreeDiff = { create: [], update: [], unchanged: [] };

  for (const node of desiredNodes) {
    if (node.isDirectory) continue;

    const existing = existingFiles.get(node.path);

    if (existing === undefined) {
      // File doesn't exist → create
      diff.create.push(node);
    } else if (existing === node.content) {
      // Identical → skip
      diff.unchanged.push(node.path);
    } else {
      // Exists but different → compute mutations
      const mutations = computeMutations(existing, node);
      if (mutations.length > 0) {
        diff.update.push({ path: node.path, mutations });
      } else {
        diff.unchanged.push(node.path);
      }
    }
  }

  return diff;
}
```

---

## 6. Package: `@create-turbo-stack/templates`

### 6.1 Purpose

Passive data package. Contains EJS template strings organized by category. Core imports these as string data.

### 6.2 How Templates Are Exported

Templates cannot use `fs.readFile` (browser constraint). Instead, they're bundled as string exports at build time:

```typescript
// packages/templates/src/index.ts

// Option A: Import as string (using bundler raw import)
// Option B: Inline templates as template literals
// Option C: Build step that reads .ejs files and generates a map

// Decision: Build step approach.
// A `build` script reads all .ejs files and generates a single
// templates-map.ts with all templates as string constants.

// Generated file (by build script):
export const templates: Record<string, Record<string, string>> = {
  "app/nextjs": {
    "package.json.ejs": `{...template content...}`,
    "next.config.ts.ejs": `{...template content...}`,
    // ...
  },
  "app/hono": { /* ... */ },
  "package/ui": { /* ... */ },
  "package/library": { /* ... */ },
  "integration/supabase": { /* ... */ },
  "root": { /* ... */ },
};

export function getTemplates(
  category: string,
  type: string
): Record<string, string> {
  const key = `${category}/${type}`;
  return templates[key] ?? {};
}
```

### 6.3 Build Script

```typescript
// packages/templates/scripts/build-templates.ts
// Runs during `turbo build` for the templates package

// 1. Recursively read all .ejs files in src/
// 2. Group by directory structure
// 3. Generate templates-map.ts with inline strings
// 4. Output to dist/

// This means:
// - Authoring: edit .ejs files normally in src/
// - Consuming: import from built package (string map)
// - Browser: works because it's just strings
```

### 6.4 Template Conventions

All templates follow these conventions:

```
<%= scope %>          → "@myorg"
<%= scopeName %>      → "myorg"
<%= projectName %>    → "my-project"
<%= app.name %>       → "web"
<%= app.port %>       → 3000
<%= pkg.name %>       → "ui"
<%= pkg.fullName %>   → "@myorg/ui"

<% if (css.framework === "tailwind4") { %>
  ...tailwind 4 specific content...
<% } %>

<% for (const dir of wiring.cssSourceDirectives) { %>
@source "<%= dir %>";
<% } %>
```

### 6.5 Example Template

```ejs
// templates/src/app/nextjs/package.json.ejs

{
  "name": "<%= app.name %>",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev --turbopack -p <%= app.port %>",
    "build": "next build",
    "start": "next start -p <%= app.port %>",
    "lint": "<%= linter === 'biome' ? 'biome check' : 'eslint .' %>",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    <% for (const [dep, version] of Object.entries(wiring.workspaceRefs)) { %>
    "<%= dep %>": "<%= version %>",
    <% } %>
    "next": "catalog:",
    "react": "catalog:",
    "react-dom": "catalog:"
    <% if (app.i18n) { %>,
    "next-intl": "catalog:"
    <% } %>
  },
  "devDependencies": {
    "<%= scope %>/typescript-config": "workspace:*",
    "@types/react": "catalog:",
    "@types/react-dom": "catalog:",
    "typescript": "catalog:"
    <% if (linter === 'biome') { %>,
    "@biomejs/biome": "catalog:"
    <% } %>
  }
}
```

---

## 7. Package: `create-turbo-stack` (CLI)

### 7.1 Purpose

The npm-published CLI. Entry point for terminal users. Handles I/O, prompts, filesystem operations, and package manager invocation.

### 7.2 npm Package Shape

```json
{
  "name": "create-turbo-stack",
  "version": "0.1.0",
  "bin": {
    "create-turbo-stack": "./bin/create-turbo-stack.js"
  },
  "type": "module",
  "dependencies": {
    "@create-turbo-stack/core": "workspace:*",
    "@create-turbo-stack/schema": "workspace:*",
    "@create-turbo-stack/templates": "workspace:*",
    "@clack/prompts": "...",
    "commander": "...",
    "picocolors": "..."
  }
}
```

Users run: `npx create-turbo-stack` or `npx create-turbo-stack@latest`

### 7.3 Command Routing

```typescript
// packages/cli/src/index.ts

import { Command } from "commander";

const program = new Command()
  .name("create-turbo-stack")
  .description("Scaffold production-ready Turborepo monorepos")
  .version(version);

// Default command: create
program
  .argument("[project-name]", "Project name")
  .option("--preset <url>", "Use a preset URL or file path")
  .option("--yes", "Accept all defaults")
  .action(createCommand);

// Subcommands
program
  .command("add <type>")
  .description("Add app, package, integration, or dependency")
  .action(addCommand);

program
  .command("preset <action>")
  .description("Save or validate presets")
  .action(presetCommand);

program
  .command("mcp")
  .description("Start MCP server for AI agent integration")
  .action(mcpCommand);

program.parse();
```

### 7.4 Create Flow

```typescript
// packages/cli/src/commands/create.ts

import { resolveFileTree, renderTree } from "@create-turbo-stack/core";
import { ValidatedPresetSchema } from "@create-turbo-stack/schema";
import { runCreatePrompts } from "../prompts/create-flow";
import { writeFiles } from "../io/writer";
import { initGit } from "../io/git";
import { installDependencies } from "../io/pm";

export async function createCommand(
  projectName: string | undefined,
  options: { preset?: string; yes?: boolean }
) {
  let preset: Preset;

  if (options.preset) {
    // 1a. Load preset from URL or file
    const raw = await fetchPreset(options.preset);
    preset = ValidatedPresetSchema.parse(raw);
    // If project name given as arg, override preset
    if (projectName) preset.basics.projectName = projectName;
  } else {
    // 1b. Interactive prompts → build preset
    preset = await runCreatePrompts(projectName);
  }

  // 2. Validate
  const validated = ValidatedPresetSchema.parse(preset);

  // 3. Resolve file tree
  const tree = resolveFileTree(validated);

  // 4. Write to disk
  const outputDir = path.resolve(process.cwd(), validated.basics.projectName);
  await writeFiles(outputDir, tree.nodes);

  // 5. Write .turbo-stack.json
  await writeTurboStackConfig(outputDir, validated);

  // 6. Git init
  if (validated.basics.gitInit) {
    await initGit(outputDir);
  }

  // 7. Install dependencies
  await installDependencies(outputDir, validated.basics.packageManager);

  // 8. Success message
  printSuccess(validated);
}
```

### 7.5 Add Flow

```typescript
// packages/cli/src/commands/add.ts

import { resolveFileTree, diffTree } from "@create-turbo-stack/core";
import { readTurboStackConfig, updateTurboStackConfig } from "../io/reader";

export async function addCommand(type: string) {
  // 1. Read existing .turbo-stack.json
  const config = await readTurboStackConfig(process.cwd());
  if (!config) {
    exitWithError("Not a create-turbo-stack project. Run `create-turbo-stack` first.");
  }

  // 2. Based on type, run prompts
  let updatedConfig: TurboStackConfig;
  switch (type) {
    case "app":
      updatedConfig = await addAppFlow(config);
      break;
    case "package":
      updatedConfig = await addPackageFlow(config);
      break;
    case "integration":
      updatedConfig = await addIntegrationFlow(config);
      break;
    case "dependency":
      updatedConfig = await addDependencyFlow(config);
      break;
    default:
      exitWithError(`Unknown type: ${type}. Use: app, package, integration, dependency`);
  }

  // 3. Resolve desired file tree from updated config
  const desiredTree = resolveFileTree(updatedConfig);

  // 4. Read existing files
  const existingFiles = await readExistingFiles(process.cwd());

  // 5. Compute diff
  const diff = diffTree(existingFiles, desiredTree.nodes);

  // 6. Apply diff (create new files, mutate existing files)
  await applyDiff(process.cwd(), diff);

  // 7. Update .turbo-stack.json
  await updateTurboStackConfig(process.cwd(), updatedConfig);

  // 8. Install new dependencies if any
  await installDependencies(process.cwd(), config.basics.packageManager);
}
```

### 7.6 Prompt Design

All prompts use `@clack/prompts` for consistent UX:

```typescript
// packages/cli/src/prompts/create-flow.ts

import * as p from "@clack/prompts";
import type { Preset } from "@create-turbo-stack/schema";

export async function runCreatePrompts(projectName?: string): Promise<Preset> {
  p.intro("create-turbo-stack");

  // Phase 1: Basics
  const basics = await promptBasics(projectName);

  // Phase 2: Database
  const database = await promptDatabase();

  // Phase 3: API
  const api = await promptApi();

  // Phase 4: Auth (context-aware — if supabase selected, suggest supabase-auth)
  const auth = await promptAuth(database);

  // Phase 5: CSS
  const css = await promptCss();

  // Phase 6: Apps (repeatable)
  const apps = await promptApps();

  // Phase 7: Packages (repeatable)
  const packages = await promptPackages();

  // Phase 8: Integrations
  const integrations = await promptIntegrations();

  // Phase 9: Review
  const preset: Preset = {
    name: basics.projectName,
    version: "1.0.0",
    basics,
    database,
    api,
    auth,
    css,
    integrations,
    apps,
    packages,
  };

  // Show summary
  await showSummary(preset);

  const confirmed = await p.confirm({ message: "Create project?" });
  if (!confirmed || p.isCancel(confirmed)) {
    p.cancel("Cancelled.");
    process.exit(0);
  }

  p.outro("Creating project...");
  return preset;
}
```

### 7.7 File Writer

```typescript
// packages/cli/src/io/writer.ts

import fs from "node:fs/promises";
import path from "node:path";
import type { FileTreeNode, RenderedFile } from "@create-turbo-stack/schema";

export async function writeFiles(
  outputDir: string,
  nodes: FileTreeNode[]
): Promise<void> {
  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  // Sort: directories first, then files (to ensure parent dirs exist)
  const sorted = [...nodes].sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.path.localeCompare(b.path);
  });

  for (const node of sorted) {
    const fullPath = path.join(outputDir, node.path);

    if (node.isDirectory) {
      await fs.mkdir(fullPath, { recursive: true });
    } else {
      // Ensure parent directory exists
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, node.content ?? "", "utf-8");
    }
  }
}
```

### 7.8 Package Manager Detection & Commands

```typescript
// packages/cli/src/io/pm.ts

export type PM = "bun" | "pnpm" | "npm" | "yarn";

export const pmCommands: Record<PM, {
  install: string;
  add: (dep: string) => string;
  addDev: (dep: string) => string;
  run: (script: string) => string;
  lockfile: string;
}> = {
  bun: {
    install: "bun install",
    add: (dep) => `bun add ${dep}`,
    addDev: (dep) => `bun add -d ${dep}`,
    run: (script) => `bun run ${script}`,
    lockfile: "bun.lock",
  },
  pnpm: {
    install: "pnpm install",
    add: (dep) => `pnpm add ${dep}`,
    addDev: (dep) => `pnpm add -D ${dep}`,
    run: (script) => `pnpm run ${script}`,
    lockfile: "pnpm-lock.yaml",
  },
  npm: {
    install: "npm install",
    add: (dep) => `npm install ${dep}`,
    addDev: (dep) => `npm install -D ${dep}`,
    run: (script) => `npm run ${script}`,
    lockfile: "package-lock.json",
  },
  yarn: {
    install: "yarn install",
    add: (dep) => `yarn add ${dep}`,
    addDev: (dep) => `yarn add -D ${dep}`,
    run: (script) => `yarn run ${script}`,
    lockfile: "yarn.lock",
  },
};

export async function installDependencies(dir: string, pm: PM): Promise<void> {
  const { execa } = await import("execa");
  const [cmd, ...args] = pmCommands[pm].install.split(" ");
  await execa(cmd!, args, { cwd: dir, stdio: "inherit" });
}
```

---

## 8. App: `web`

### 8.1 Purpose

Public-facing website with three main features:
1. **Landing page** — What is create-turbo-stack, why use it
2. **Builder** — Interactive stack configurator with live file tree preview
3. **Community presets** — Gallery of community-submitted presets (shadcn registry model)

### 8.2 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js (App Router) |
| Styling | Tailwind CSS 4 + shadcn/ui |
| State | React state (builder is client-side only) |
| Core integration | `@create-turbo-stack/core` imported directly |
| Deployment | Vercel |

### 8.3 Builder Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Builder Page                       │
│                                                       │
│  ┌──────────────────┐  ┌──────────────────────────┐  │
│  │  Config Panel     │  │  Preview Panel            │  │
│  │                   │  │                            │  │
│  │  ◆ Package mgr    │  │  ┌──────────────────────┐ │  │
│  │  ◆ Database       │  │  │  File Tree (visual)  │ │  │
│  │  ◆ API layer      │  │  │                      │ │  │
│  │  ◆ Auth           │  │  │  my-project/         │ │  │
│  │  ◆ Apps [+]       │  │  │  ├── apps/           │ │  │
│  │  ◆ Packages [+]   │  │  │  │   └── web/        │ │  │
│  │  ◆ CSS            │  │  │  │       ├── src/     │ │  │
│  │  ◆ Integrations   │  │  │  │       └── ...      │ │  │
│  │                   │  │  │  ├── packages/        │ │  │
│  │                   │  │  │  │   └── ui/          │ │  │
│  │                   │  │  │  └── turbo.json       │ │  │
│  │                   │  │  └──────────────────────┘ │  │
│  │                   │  │                            │  │
│  │                   │  │  ┌──────────────────────┐ │  │
│  │                   │  │  │  File Preview         │ │  │
│  │                   │  │  │  (click file to see   │ │  │
│  │                   │  │  │   rendered content)   │ │  │
│  │                   │  │  └──────────────────────┘ │  │
│  └──────────────────┘  └──────────────────────────┘  │
│                                                       │
│  ┌───────────────────────────────────────────────┐   │
│  │  Export Bar                                     │   │
│  │  [Copy npx command]  [Download preset]  [Share] │   │
│  └───────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### 8.4 Builder Data Flow

```typescript
// apps/web/src/components/builder/stack-selector.tsx

"use client";

import { useState, useMemo } from "react";
import { resolveFileTree } from "@create-turbo-stack/core";
import { ValidatedPresetSchema, type Preset } from "@create-turbo-stack/schema";
import { FileTreePreview } from "./file-tree-preview";
import { ConfigPanel } from "./config-panel";
import { PresetExport } from "./preset-export";

export function StackSelector() {
  // State: the preset being built
  const [presetDraft, setPresetDraft] = useState<Partial<Preset>>(defaultPreset);

  // Validate on every change
  const validation = useMemo(() => {
    return ValidatedPresetSchema.safeParse(presetDraft);
  }, [presetDraft]);

  // Resolve file tree (only paths, no content — fast)
  const fileTree = useMemo(() => {
    if (!validation.success) return null;
    return resolveFileTree(validation.data, { includeContent: false });
  }, [validation]);

  // For file preview: resolve with content on demand
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const fileContent = useMemo(() => {
    if (!selectedFile || !validation.success) return null;
    const fullTree = resolveFileTree(validation.data, { includeContent: true });
    return fullTree.nodes.find(n => n.path === selectedFile)?.content ?? null;
  }, [selectedFile, validation]);

  return (
    <div className="flex gap-6">
      <ConfigPanel
        preset={presetDraft}
        onChange={setPresetDraft}
        errors={validation.success ? [] : validation.error.issues}
      />
      <div className="flex-1 flex flex-col gap-4">
        {fileTree && (
          <FileTreePreview
            tree={fileTree}
            selectedFile={selectedFile}
            onSelectFile={setSelectedFile}
          />
        )}
        {fileContent && (
          <FilePreview path={selectedFile!} content={fileContent} />
        )}
      </div>
      <PresetExport
        preset={validation.success ? validation.data : null}
        disabled={!validation.success}
      />
    </div>
  );
}
```

### 8.5 Community Presets (Registry)

Following shadcn's model:

1. **Anyone** can create a preset JSON and host it at any URL
2. **Web gallery** shows curated/community presets
3. **CLI** can fetch any URL: `npx create-turbo-stack --preset https://example.com/my-stack.json`

Registry on our web:

```typescript
// apps/web/public/s/ contains built-in presets
// apps/web/src/app/presets/page.tsx shows gallery

// Community presets are submitted via GitHub PR to a registry.json
// or via a future API. For now, static JSON served from web.
```

### 8.6 Export Options

When user finishes building in the web UI:

| Export | Format |
|--------|--------|
| **CLI command** | `npx create-turbo-stack --preset https://create-turbo-stack.dev/s/custom-abc123.json` |
| **Download JSON** | Download the preset as a `.json` file |
| **Share URL** | `create-turbo-stack.dev/builder?config=base64encodedpreset` (state in URL) |
| **Copy to clipboard** | Raw JSON |

For share URLs, the preset is encoded in the URL query param (base64). No backend needed. If the preset is too large for URL, fallback to a short-lived paste service or download.

---

## 9. Registry System

### 9.1 Design (shadcn-inspired)

```
Registry URL (e.g., https://acme.com/turbo-stacks/registry.json)
│
├── registry.json             # Index of all presets
│   {
│     "name": "acme-stacks",
│     "homepage": "https://acme.com",
│     "items": [
│       {
│         "name": "saas-starter",
│         "title": "SaaS Starter",
│         "description": "Full-stack SaaS with Supabase + tRPC",
│         "type": "registry:preset",
│         "preset": "https://acme.com/turbo-stacks/saas-starter.json"
│       }
│     ]
│   }
│
├── saas-starter.json         # Individual preset (PresetSchema)
└── api-backend.json          # Another preset
```

### 9.2 CLI Integration

```bash
# Install from direct URL
npx create-turbo-stack --preset https://acme.com/turbo-stacks/saas-starter.json

# Install from registry (shorthand — resolves via registry.json)
npx create-turbo-stack --preset acme-stacks/saas-starter

# For shorthand to work, registry must be registered:
# Option A: well-known registries (like npm scopes)
# Option B: explicit registry flag
npx create-turbo-stack --registry https://acme.com/turbo-stacks --preset saas-starter
```

### 9.3 Our Built-in Registry

```
https://create-turbo-stack.dev/s/registry.json    # Index
https://create-turbo-stack.dev/s/minimal.json      # Preset
https://create-turbo-stack.dev/s/saas-starter.json # Preset
https://create-turbo-stack.dev/s/api-only.json     # Preset
```

These are served as static files from `apps/web/public/s/`.

---

## 10. MCP Server

### 10.1 Architecture

MCP server is a thin adapter over CLI/core. It runs as a subprocess started by the AI agent's host (Claude Code, Cursor, etc.).

```
AI Agent (Claude Code)
    │
    │ MCP Protocol (stdio)
    │
    ▼
MCP Server (packages/cli/src/mcp/server.ts)
    │
    │ calls core functions
    │
    ▼
@create-turbo-stack/core
    │
    │ returns FileTree / RenderedFile[]
    │
    ▼
CLI I/O layer (writer.ts)
    │
    │ writes to disk
    │
    ▼
Filesystem
```

### 10.2 MCP Configuration

```jsonc
// In user's .claude/mcp.json
{
  "mcpServers": {
    "turbo-stack": {
      "command": "npx",
      "args": ["create-turbo-stack", "mcp"],
      "cwd": "/path/to/project"
    }
  }
}
```

### 10.3 Tool Definitions

```typescript
// packages/cli/src/mcp/tools.ts

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerTools(server: McpServer) {

  server.tool(
    "add_app",
    "Scaffold a new app in the monorepo",
    {
      name: z.string().describe("App name (lowercase, kebab-case)"),
      type: z.enum(["nextjs", "nextjs-api-only", "expo", "hono-standalone", "vite-react"]),
      port: z.number().int().describe("Dev server port"),
      i18n: z.boolean().optional().describe("Enable i18n (next-intl)"),
      consumes: z.array(z.string()).optional().describe("Package names to consume"),
    },
    async (params) => {
      // 1. Read .turbo-stack.json
      // 2. Add app to config
      // 3. Resolve + diff + apply
      // 4. Return result
      return { content: [{ type: "text", text: `Created app: ${params.name}` }] };
    }
  );

  server.tool(
    "add_package",
    "Scaffold a new package in the monorepo",
    {
      name: z.string().describe("Package name"),
      type: z.enum(["ui", "utils", "config", "library", "react-library"]),
      producesCSS: z.boolean().optional(),
      exports: z.array(z.string()).optional(),
    },
    async (params) => { /* ... */ }
  );

  server.tool(
    "add_integration",
    "Add a cross-cutting integration",
    {
      integration: z.enum(["supabase", "trpc", "i18n", "sentry", "analytics", "email", "billing"]),
      config: z.record(z.unknown()).optional(),
    },
    async (params) => { /* ... */ }
  );

  server.tool(
    "get_workspace_info",
    "Get current workspace configuration",
    {},
    async () => {
      // Read and return .turbo-stack.json
    }
  );

  server.tool(
    "get_dependency_graph",
    "Get package dependency graph",
    {},
    async () => {
      // Compute and return dependency graph
    }
  );
}
```

### 10.4 Resource Definitions

```typescript
// packages/cli/src/mcp/resources.ts

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerResources(server: McpServer) {

  server.resource(
    "workspace-config",
    "workspace://config",
    async (uri) => {
      const config = await readTurboStackConfig(process.cwd());
      return {
        contents: [{
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(config, null, 2),
        }],
      };
    }
  );

  server.resource(
    "workspace-conventions",
    "workspace://conventions",
    async (uri) => {
      // Return a structured document of coding conventions
      // derived from .turbo-stack.json
      return {
        contents: [{
          uri: uri.href,
          mimeType: "text/markdown",
          text: generateConventionsDoc(config),
        }],
      };
    }
  );
}
```

---

## 11. Wiring Logic Detail

This is the heart of the product. Each wiring module is a pure function that computes what changes are needed.

### 11.1 CSS `@source` Wiring

```typescript
// packages/core/src/wiring/css-source.ts

import type { Preset } from "@create-turbo-stack/schema";

export interface CssSourceMap {
  /** app name → list of @source directives (relative paths) */
  [appName: string]: string[];
}

/**
 * Compute @source directives for each app's globals.css.
 *
 * Rule: Any package with producesCSS=true that is consumed by an app
 * must have its src/ directory as an @source in that app's globals.css.
 *
 * Path calculation:
 *   From: apps/{app}/src/app/globals.css
 *   To:   packages/{pkg}/src
 *   Relative: ../../../../packages/{pkg}/src
 */
export function computeCssSourceMap(preset: Preset): CssSourceMap {
  const map: CssSourceMap = {};

  // Collect all CSS-producing packages
  const cssPackages = new Set<string>();
  for (const pkg of preset.packages) {
    if (pkg.producesCSS) cssPackages.add(pkg.name);
  }
  // Auto packages that produce CSS (e.g., if ui is auto-generated)
  // For now, only user-specified packages can produce CSS

  for (const app of preset.apps) {
    // Only apps that have CSS (web apps, not API-only or standalone hono)
    if (!appSupportsCss(app.type)) continue;

    const sources: string[] = [];

    // App's own source
    sources.push("../../src");

    // Each consumed CSS-producing package
    for (const consumed of app.consumes) {
      if (cssPackages.has(consumed)) {
        // Path from apps/{app}/src/app/globals.css to packages/{consumed}/src
        sources.push(`../../../../packages/${consumed}/src`);
      }
    }

    map[app.name] = sources;
  }

  return map;
}

function appSupportsCss(type: string): boolean {
  return ["nextjs", "vite-react", "vite-vue", "sveltekit", "astro", "remix"].includes(type);
}
```

### 11.2 Catalog Dependency Computation

```typescript
// packages/core/src/wiring/catalog.ts

import type { Preset } from "@create-turbo-stack/schema";

export interface CatalogEntry {
  name: string;
  version: string;
}

/**
 * Compute the full dependency catalog based on preset selections.
 * Each integration/framework/tool contributes its dependencies.
 */
export function computeCatalog(preset: Preset): CatalogEntry[] {
  const catalog = new Map<string, string>();

  // Always needed
  addDep(catalog, "typescript", "^5.9.0");

  // Linter
  if (preset.basics.linter === "biome") {
    addDep(catalog, "@biomejs/biome", "^1.9.0");
  } else {
    addDep(catalog, "eslint", "^9.0.0");
    addDep(catalog, "prettier", "^3.8.0");
  }

  // CSS framework
  if (preset.css.framework === "tailwind4") {
    addDep(catalog, "tailwindcss", "^4.0.0");
    addDep(catalog, "@tailwindcss/postcss", "^4.0.0");
  } else if (preset.css.framework === "tailwind3") {
    addDep(catalog, "tailwindcss", "^3.4.0");
    addDep(catalog, "postcss", "^8.0.0");
    addDep(catalog, "autoprefixer", "^10.0.0");
  }

  if (preset.css.ui === "shadcn") {
    addDep(catalog, "tw-animate-css", "^1.0.0");
    // shadcn components pulled via shadcn CLI, not catalog
  }

  // Apps
  for (const app of preset.apps) {
    if (app.type === "nextjs" || app.type === "nextjs-api-only") {
      addDep(catalog, "next", "^15.0.0");
      addDep(catalog, "react", "^19.0.0");
      addDep(catalog, "react-dom", "^19.0.0");
      addDep(catalog, "@types/react", "^19.0.0");
      addDep(catalog, "@types/react-dom", "^19.0.0");
    }
    if (app.i18n) {
      addDep(catalog, "next-intl", "^4.0.0");
    }
    // ... more per app type
  }

  // Database
  if (preset.database.strategy === "supabase") {
    addDep(catalog, "@supabase/supabase-js", "^2.0.0");
    addDep(catalog, "@supabase/ssr", "^0.5.0");
  } else if (preset.database.strategy === "drizzle") {
    addDep(catalog, "drizzle-orm", "^0.38.0");
    addDep(catalog, "drizzle-kit", "^0.30.0");
    // Driver-specific deps added based on preset.database.driver
  } else if (preset.database.strategy === "prisma") {
    addDep(catalog, "prisma", "^6.0.0");
    addDep(catalog, "@prisma/client", "^6.0.0");
  }

  // API
  if (preset.api.strategy === "trpc") {
    addDep(catalog, "@trpc/server", "^11.0.0");
    addDep(catalog, "@trpc/client", "^11.0.0");
    addDep(catalog, "@trpc/react-query", "^11.0.0");
    addDep(catalog, "@tanstack/react-query", "^5.0.0");
    addDep(catalog, "superjson", "^2.0.0");
    addDep(catalog, "zod", "^3.24.0");
  } else if (preset.api.strategy === "hono") {
    addDep(catalog, "hono", "^4.0.0");
  }

  // Auth
  if (preset.auth.provider === "better-auth") {
    addDep(catalog, "better-auth", "^1.0.0");
  } else if (preset.auth.provider === "clerk") {
    addDep(catalog, "@clerk/nextjs", "^6.0.0");
  } else if (preset.auth.provider === "next-auth") {
    addDep(catalog, "next-auth", "^5.0.0");
  }

  // Env validation
  if (preset.integrations.envValidation) {
    addDep(catalog, "@t3-oss/env-nextjs", "^0.12.0");
    addDep(catalog, "zod", "^3.24.0");  // may already be added
  }

  // Integrations
  if (preset.integrations.analytics === "posthog") {
    addDep(catalog, "posthog-js", "^1.0.0");
    addDep(catalog, "posthog-node", "^4.0.0");
  }
  if (preset.integrations.errorTracking === "sentry") {
    addDep(catalog, "@sentry/nextjs", "^9.0.0");
  }
  if (preset.integrations.email === "react-email-resend") {
    addDep(catalog, "resend", "^4.0.0");
    addDep(catalog, "@react-email/components", "^0.1.0");
  }
  if (preset.integrations.ai === "vercel-ai-sdk") {
    addDep(catalog, "ai", "^4.0.0");
    addDep(catalog, "@ai-sdk/openai", "^1.0.0");
  }

  return Array.from(catalog.entries()).map(([name, version]) => ({ name, version }));
}

function addDep(catalog: Map<string, string>, name: string, version: string) {
  // Don't overwrite if already set (first writer wins)
  if (!catalog.has(name)) {
    catalog.set(name, version);
  }
}
```

### 11.3 Environment Validation Chain

```typescript
// packages/core/src/wiring/env-chain.ts

import type { Preset } from "@create-turbo-stack/schema";

export interface EnvChain {
  /** Base env vars (in @scope/env package) */
  base: {
    server: EnvVar[];
    client: EnvVar[];
  };
  /** Per-app extensions */
  apps: Record<string, {
    server: EnvVar[];
    client: EnvVar[];
  }>;
  /** All env vars for .env.example */
  allVars: EnvVar[];
  /** Vars that should be in turbo.json globalEnv */
  globalEnv: string[];
}

export interface EnvVar {
  name: string;
  zodType: string;       // e.g., "z.string().url()", "z.string().min(1)"
  example: string;       // Example value for .env.example
  description: string;   // Comment for .env.example
}

export function computeEnvChain(preset: Preset): EnvChain {
  const base: EnvChain["base"] = { server: [], client: [] };

  // Database env vars
  if (preset.database.strategy === "supabase") {
    base.server.push({
      name: "SUPABASE_URL",
      zodType: "z.string().url()",
      example: "https://xxx.supabase.co",
      description: "Supabase project URL",
    });
    base.server.push({
      name: "SUPABASE_ANON_KEY",
      zodType: "z.string().min(1)",
      example: "eyJ...",
      description: "Supabase anonymous key",
    });
    base.server.push({
      name: "SUPABASE_SERVICE_ROLE_KEY",
      zodType: "z.string().min(1)",
      example: "eyJ...",
      description: "Supabase service role key (server-only)",
    });
    base.client.push({
      name: "NEXT_PUBLIC_SUPABASE_URL",
      zodType: "z.string().url()",
      example: "https://xxx.supabase.co",
      description: "Supabase URL (client-accessible)",
    });
    base.client.push({
      name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      zodType: "z.string().min(1)",
      example: "eyJ...",
      description: "Supabase anon key (client-accessible)",
    });
  }

  // ... similar for other strategies

  // Per-app env vars
  const apps: EnvChain["apps"] = {};
  for (const app of preset.apps) {
    apps[app.name] = { server: [], client: [] };

    // Each app gets NEXT_PUBLIC_APP_URL
    if (["nextjs", "nextjs-api-only"].includes(app.type)) {
      apps[app.name]!.client.push({
        name: "NEXT_PUBLIC_APP_URL",
        zodType: "z.string().url()",
        example: `http://localhost:${app.port}`,
        description: `${app.name} app URL`,
      });
    }
  }

  // Collect all for .env.example and globalEnv
  const allVars = [
    ...base.server,
    ...base.client,
    ...Object.values(apps).flatMap(a => [...a.server, ...a.client]),
  ];

  const globalEnv = allVars.map(v => v.name);

  return { base, apps, allVars, globalEnv };
}
```

### 11.4 TypeScript Config Chain

```typescript
// packages/core/src/wiring/tsconfig-chain.ts

import type { Preset } from "@create-turbo-stack/schema";

export interface TsconfigTarget {
  /** Path to tsconfig.json */
  path: string;
  /** Which base config to extend */
  extends: string;
  /** Compiler options overrides */
  compilerOptions: Record<string, unknown>;
  /** Include patterns */
  include: string[];
  /** Exclude patterns */
  exclude: string[];
}

export function computeTsconfigChain(preset: Preset): TsconfigTarget[] {
  const targets: TsconfigTarget[] = [];
  const scope = preset.basics.scope;

  // typescript-config package itself has no tsconfig.json (it IS the configs)

  // Each package
  for (const pkg of [...preset.packages]) {
    const baseConfig = mapPackageTypeToTsconfig(pkg.type);
    targets.push({
      path: `packages/${pkg.name}/tsconfig.json`,
      extends: `${scope}/typescript-config/${baseConfig}`,
      compilerOptions: {
        outDir: "./dist",
        rootDir: "./src",
      },
      include: ["src/**/*"],
      exclude: ["node_modules", "dist"],
    });
  }

  // Each app
  for (const app of preset.apps) {
    const baseConfig = mapAppTypeToTsconfig(app.type);
    targets.push({
      path: `apps/${app.name}/tsconfig.json`,
      extends: `${scope}/typescript-config/${baseConfig}`,
      compilerOptions: app.type.startsWith("nextjs") ? {} : { outDir: "./dist", rootDir: "./src" },
      include: app.type.startsWith("nextjs") ? ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"] : ["src/**/*"],
      exclude: ["node_modules", "dist", ".next"],
    });
  }

  return targets;
}

function mapPackageTypeToTsconfig(type: string): string {
  switch (type) {
    case "ui":
    case "react-library":
      return "react.json";
    case "library":
    case "utils":
      return "library.json";
    case "config":
      return "base.json";
    default:
      return "base.json";
  }
}

function mapAppTypeToTsconfig(type: string): string {
  switch (type) {
    case "nextjs":
    case "nextjs-api-only":
      return "nextjs.json";
    case "vite-react":
    case "expo":
      return "react.json";
    default:
      return "base.json";
  }
}
```

### 11.5 turbo.json Task Computation

```typescript
// packages/core/src/wiring/turbo-tasks.ts

import type { Preset } from "@create-turbo-stack/schema";

export interface TurboConfig {
  $schema: string;
  ui: string;
  tasks: Record<string, TurboTask>;
  globalDependencies: string[];
  globalEnv: string[];
}

interface TurboTask {
  dependsOn?: string[];
  outputs?: string[];
  cache?: boolean;
  persistent?: boolean;
  inputs?: string[];
}

export function computeTurboConfig(preset: Preset, globalEnv: string[]): TurboConfig {
  const tasks: Record<string, TurboTask> = {};

  // Build
  const buildOutputs: string[] = [];
  if (preset.apps.some(a => a.type.startsWith("nextjs"))) buildOutputs.push(".next/**", "!.next/cache/**");
  if (preset.apps.some(a => ["vite-react", "vite-vue", "astro", "sveltekit", "remix"].includes(a.type))) buildOutputs.push("dist/**");

  tasks.build = {
    dependsOn: ["^build"],
    inputs: ["$TURBO_DEFAULT$", ".env*"],
    outputs: buildOutputs,
  };

  // Dev
  tasks.dev = {
    cache: false,
    persistent: true,
  };

  // Lint
  tasks.lint = {
    dependsOn: ["^lint"],
  };

  // Type check
  tasks["type-check"] = {
    dependsOn: ["^type-check"],
  };

  // DB-specific tasks
  if (preset.database.strategy === "drizzle") {
    tasks["db:generate"] = { cache: false };
    tasks["db:migrate"] = { cache: false };
    tasks["db:push"] = { cache: false };
  } else if (preset.database.strategy === "prisma") {
    tasks["db:generate"] = { cache: false };
    tasks["db:migrate"] = { cache: false };
  }

  return {
    $schema: "https://turborepo.dev/schema.json",
    ui: "tui",
    tasks,
    globalDependencies: [".env.*local"],
    globalEnv,
  };
}
```

### 11.6 Workspace References

```typescript
// packages/core/src/wiring/workspace-refs.ts

import type { Preset } from "@create-turbo-stack/schema";

/**
 * For each app/package, compute which workspace packages it should depend on.
 * Returns: targetName → { depName: "workspace:*" }
 */
export function computeWorkspaceRefs(
  preset: Preset
): Record<string, Record<string, string>> {
  const refs: Record<string, Record<string, string>> = {};
  const scope = preset.basics.scope;

  for (const app of preset.apps) {
    const appRefs: Record<string, string> = {};

    // typescript-config always as devDep (handled separately in template)

    // Consumed packages
    for (const consumed of app.consumes) {
      appRefs[`${scope}/${consumed}`] = "workspace:*";
    }

    // Auto-consumed based on app type
    if (preset.integrations.envValidation) {
      appRefs[`${scope}/env`] = "workspace:*";
    }
    if (preset.api.strategy !== "none") {
      appRefs[`${scope}/api`] = "workspace:*";
    }
    if (preset.auth.provider !== "none") {
      appRefs[`${scope}/auth`] = "workspace:*";
    }

    refs[app.name] = appRefs;
  }

  // Package cross-references
  // e.g., auth package might depend on db package
  if (preset.auth.provider !== "none" && preset.database.strategy !== "none") {
    refs["auth"] = { [`${scope}/db`]: "workspace:*" };
  }
  if (preset.api.strategy !== "none" && preset.database.strategy !== "none") {
    refs["api"] = {
      ...(refs["api"] ?? {}),
      [`${scope}/db`]: "workspace:*",
    };
  }

  return refs;
}
```

---

## 12. Error Handling & Rollback

### 12.1 Create Mode

Simple: if scaffolding fails, delete the output directory.

```typescript
export async function createWithRollback(preset: Preset, outputDir: string) {
  try {
    await createProject(preset, outputDir);
  } catch (error) {
    // Clean up
    await fs.rm(outputDir, { recursive: true, force: true });
    throw error;
  }
}
```

### 12.2 Add Mode

More complex: existing files are being modified.

Strategy: **snapshot affected files before modification**, restore on failure.

```typescript
export async function addWithRollback(diff: TreeDiff, projectDir: string) {
  const snapshots = new Map<string, string>();

  // Snapshot files that will be updated
  for (const update of diff.update) {
    const fullPath = path.join(projectDir, update.path);
    const content = await fs.readFile(fullPath, "utf-8");
    snapshots.set(update.path, content);
  }

  try {
    await applyDiff(projectDir, diff);
  } catch (error) {
    // Restore snapshots
    for (const [filePath, content] of snapshots) {
      await fs.writeFile(path.join(projectDir, filePath), content, "utf-8");
    }
    // Delete created files
    for (const node of diff.create) {
      await fs.rm(path.join(projectDir, node.path), { force: true });
    }
    throw error;
  }
}
```

No `.turbo-stack-backup/` directory — snapshots are in-memory for the duration of the operation. Simpler, no cleanup needed.

---

## 13. Testing Strategy

### 13.1 Unit Tests (core)

```typescript
// Test resolveFileTree with various presets
describe("resolveFileTree", () => {
  it("minimal preset produces correct file list", () => {
    const preset = minimalPreset();
    const tree = resolveFileTree(preset);

    expect(tree.nodes.map(n => n.path)).toContain("turbo.json");
    expect(tree.nodes.map(n => n.path)).toContain("apps/web/package.json");
    expect(tree.nodes.map(n => n.path)).toContain("packages/typescript-config/base.json");
  });

  it("CSS source map is correct for multi-app multi-package", () => {
    const preset = fullPreset();
    const cssMap = computeCssSourceMap(preset);

    expect(cssMap["web"]).toContain("../../../../packages/ui/src");
    expect(cssMap["api"]).toBeUndefined(); // API app has no CSS
  });
});
```

### 13.2 Snapshot Tests (templates)

```typescript
// Test that rendered templates match expected output
describe("template rendering", () => {
  it("nextjs package.json renders correctly", () => {
    const ctx = buildTemplateContext(saasPreset(), { type: "app", name: "web" });
    const template = getTemplates("app", "nextjs")["package.json.ejs"];
    const result = renderTemplate(template, ctx);

    expect(JSON.parse(result)).toMatchSnapshot();
  });
});
```

### 13.3 Integration Tests (CLI)

```typescript
// Test full create flow in a temp directory
describe("create command", () => {
  it("scaffolds a minimal project", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "cts-test-"));
    const preset = minimalPreset();
    preset.basics.projectName = "test-project";

    await createProject(preset, path.join(tmpDir, "test-project"));

    // Verify key files exist
    expect(await fileExists(path.join(tmpDir, "test-project/turbo.json"))).toBe(true);
    expect(await fileExists(path.join(tmpDir, "test-project/apps/web/package.json"))).toBe(true);

    // Verify JSON is valid
    const turboJson = JSON.parse(await fs.readFile(
      path.join(tmpDir, "test-project/turbo.json"), "utf-8"
    ));
    expect(turboJson.tasks.build).toBeDefined();

    // Cleanup
    await fs.rm(tmpDir, { recursive: true });
  });
});
```

### 13.4 Validation Tests (schema)

```typescript
describe("preset validation", () => {
  it("rejects supabase-auth without supabase database", () => {
    const result = ValidatedPresetSchema.safeParse({
      ...minimalPreset(),
      database: { strategy: "drizzle", driver: "postgres" },
      auth: { provider: "supabase-auth", rbac: false, entitlements: false },
    });

    expect(result.success).toBe(false);
  });

  it("rejects duplicate app names", () => {
    const result = ValidatedPresetSchema.safeParse({
      ...minimalPreset(),
      apps: [
        { name: "web", type: "nextjs", port: 3000 },
        { name: "web", type: "nextjs", port: 3001 },
      ],
    });

    expect(result.success).toBe(false);
  });
});
```

### 13.5 Test Infrastructure

| Layer | Tool | What |
|-------|------|------|
| Unit | Vitest | Core functions, wiring logic, schema validation |
| Snapshot | Vitest | Rendered template output |
| Integration | Vitest + temp dirs | Full create/add flows |
| E2E | (future) | CLI invocation → `bun install` → `bun run build` passes |

---

## 14. npm Publish Strategy

### 14.1 What Gets Published

| Package | npm Name | Published? | Why |
|---------|----------|-----------|-----|
| `packages/schema` | `@create-turbo-stack/schema` | Yes | Others may validate presets |
| `packages/core` | `@create-turbo-stack/core` | Yes | Web imports it; others can build tools |
| `packages/templates` | `@create-turbo-stack/templates` | Yes | Core depends on it at runtime |
| `packages/cli` | `create-turbo-stack` | Yes | The main CLI (`npx create-turbo-stack`) |
| `apps/web` | — | No | Deployed to Vercel, not published |

### 14.2 Versioning

All packages share the same version (monorepo single-version policy). Bumped together.

### 14.3 Build & Publish Flow

```bash
# Build all packages
turbo run build

# Publish (using changesets or manual)
# Option A: Changesets (recommended for OSS)
npx changeset
npx changeset version
npx changeset publish

# Option B: Manual
cd packages/schema && npm publish
cd packages/core && npm publish
cd packages/templates && npm publish
cd packages/cli && npm publish
```

### 14.4 CLI Binary

```json
// packages/cli/package.json
{
  "name": "create-turbo-stack",
  "bin": {
    "create-turbo-stack": "./dist/bin/create-turbo-stack.js"
  },
  "files": ["dist"]
}
```

Build target: `tsup` or `unbuild` → single ESM bundle in `dist/`.

---

## 15. Phase Breakdown (Implementation Order)

### Phase 1 — Foundation (v0.1.0)

**Goal:** `npx create-turbo-stack my-project` produces a working turborepo with apps and packages.

**Scope:**
- `@create-turbo-stack/schema` — `PresetSchema`, `BasicsSchema`, `AppSchema` (nextjs only), `PackageSchema`, `CssSchema` (tailwind4 only)
- `@create-turbo-stack/core` — `resolveFileTree` for: root files, nextjs app, library/ui/react-library package types, typescript-config auto-package
- `@create-turbo-stack/templates` — Templates for: root configs, nextjs app, library package, ui package, typescript-config
- `create-turbo-stack` CLI — `create` command only, interactive prompts, file writer, git init

**Not in scope:** database, API, auth, integrations, `add` command, MCP, web app

**Exit criteria:** Running `npx create-turbo-stack my-app` with bun, adding 1 Next.js app and 1 UI package, produces a project where `bun install && bun run build && bun run dev` works.

### Phase 2 — Database & API (v0.2.0)

**Scope:**
- Schema: `DatabaseSchema`, `ApiSchema`
- Core: DB/API auto-packages, Supabase/Drizzle/Prisma file resolution, tRPC/Hono file resolution
- Templates: supabase, drizzle, prisma, trpc, hono templates
- Wiring: catalog deps for DB/API, env chain for DB credentials
- CLI: `add app`, `add package` commands
- Config: `.turbo-stack.json` read/write, diff engine

### Phase 3 — Auth & Integrations (v0.3.0)

**Scope:**
- Schema: `AuthSchema`, `IntegrationsSchema`
- Core: Auth auto-package, integration file resolution
- Templates: all auth providers, sentry, posthog, react-email, i18n
- CLI: `add integration` command
- Presets: built-in presets (minimal, saas-starter, api-only)

### Phase 4 — Web & Builder (v0.4.0)

**Scope:**
- `apps/web` — Landing page, Builder UI, file tree preview
- Core imported in browser (verify tree-shaking, bundle size)
- Preset export (URL, JSON download, share link)
- Community presets gallery (static for now)
- Registry schema and serving

### Phase 5 — MCP & Registry (v0.5.0)

**Scope:**
- MCP server implementation
- All MCP tools and resources
- Registry system for community presets
- `add dependency` command
- Preset `save` and `validate` commands

### Phase 6 — Ecosystem (v1.0.0)

**Scope:**
- Additional app types: Expo, Tauri, SvelteKit, Astro, Remix, Vite-Vue
- `add route` / `add component` / `add action` generators
- Plugin architecture (if validated by community demand)
- Documentation site on web
- Comprehensive E2E tests

---

## Appendix A: Dependency Summary

### CLI Dependencies

```
@create-turbo-stack/core
@create-turbo-stack/schema
@create-turbo-stack/templates
@clack/prompts          — Interactive terminal prompts
commander               — CLI argument parsing
picocolors              — Terminal colors (lightweight)
execa                   — Child process execution
eta                     — EJS-compatible template engine (browser-safe)
zod                     — Runtime validation (via schema package)
```

### Core Dependencies

```
@create-turbo-stack/schema
@create-turbo-stack/templates
eta                     — Template rendering
zod                     — Via schema
```

### Web Dependencies

```
@create-turbo-stack/core
@create-turbo-stack/schema
next
react
tailwindcss
shadcn/ui components
```

---

## Appendix B: Example Built-in Presets

### minimal.json

```json
{
  "$schema": "https://create-turbo-stack.dev/schema/preset.json",
  "name": "minimal",
  "version": "1.0.0",
  "description": "Minimal turborepo with one Next.js app and one UI package",
  "basics": {
    "projectName": "my-project",
    "packageManager": "bun",
    "scope": "@my-project",
    "typescript": "strict",
    "linter": "biome",
    "gitInit": true
  },
  "database": { "strategy": "none" },
  "api": { "strategy": "none" },
  "auth": { "provider": "none", "rbac": false, "entitlements": false },
  "css": { "framework": "tailwind4", "ui": "shadcn", "styling": "css-variables" },
  "integrations": {
    "analytics": "none",
    "errorTracking": "none",
    "email": "none",
    "rateLimit": "none",
    "ai": "none",
    "envValidation": true
  },
  "apps": [
    { "name": "web", "type": "nextjs", "port": 3000, "i18n": false, "cms": "none", "consumes": ["ui"] }
  ],
  "packages": [
    { "name": "ui", "type": "react-library", "producesCSS": true, "exports": ["."] }
  ]
}
```

### saas-starter.json

```json
{
  "$schema": "https://create-turbo-stack.dev/schema/preset.json",
  "name": "saas-starter",
  "version": "1.0.0",
  "description": "Full-stack SaaS with Supabase, tRPC, shadcn/ui, and more",
  "basics": {
    "projectName": "my-saas",
    "packageManager": "bun",
    "scope": "@my-saas",
    "typescript": "strict",
    "linter": "biome",
    "gitInit": true
  },
  "database": { "strategy": "supabase" },
  "api": { "strategy": "trpc", "version": "v11" },
  "auth": { "provider": "supabase-auth", "rbac": true, "entitlements": false },
  "css": { "framework": "tailwind4", "ui": "shadcn", "styling": "css-variables" },
  "integrations": {
    "analytics": "posthog",
    "errorTracking": "sentry",
    "email": "react-email-resend",
    "rateLimit": "none",
    "ai": "none",
    "envValidation": true
  },
  "apps": [
    { "name": "web", "type": "nextjs", "port": 3000, "i18n": true, "cms": "none", "consumes": ["ui", "api", "auth"] },
    { "name": "api", "type": "nextjs-api-only", "port": 3001, "i18n": false, "cms": "none", "consumes": ["api", "auth"] }
  ],
  "packages": [
    { "name": "ui", "type": "react-library", "producesCSS": true, "exports": ["."] },
    { "name": "utils", "type": "utils", "producesCSS": false, "exports": ["."] }
  ]
}
```

---

## Appendix C: Decision Log

| Decision | Choice | Alternatives | Rationale |
|----------|--------|-------------|-----------|
| Template engine | Eta | EJS, Handlebars, custom | EJS-compatible syntax but works in browser. EJS depends on Node fs. Handlebars is more limited. |
| CLI framework | Commander + @clack/prompts | oclif, inquirer, yargs | Commander for routing, clack for beautiful prompts. oclif is too heavy. Inquirer is legacy. |
| Schema validation | Zod | io-ts, ajv, typebox | Best TypeScript inference. Works in browser. De facto standard in TS ecosystem. |
| Config file name | `.turbo-stack.json` | `.better-turbo.json`, `turbo-stack.config.ts` | JSON for simplicity and MCP readability. Dotfile for convention. Name matches CLI name. |
| Core platform constraint | Browser-compatible | Node-only | Web builder needs core for file tree preview. Worth the constraint. |
| Rollback strategy | In-memory snapshots | Backup directory, git stash | Simpler, no cleanup, sufficient for single operations. |
| Monorepo packages scope | `@create-turbo-stack/*` | `@cts/*`, unscoped | Clear, matches npm package name, no collision risk. |
| GraphQL support | Removed | Include in SRS | No implementation detail, no clear template pattern, can add later. |
| Template storage | Build step → string map | Raw fs reads, import assertions | Must work in browser. Build step is one-time cost, simple output. |
| Community presets | shadcn registry model | npm packages, git submodules | Proven model, URL-based, no registry infrastructure needed. |

---

*This SDD is a companion to the SRS. The SRS defines what; this document defines how. Both are living documents.*
