# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-03-19

### Added

- `create` command — interactive prompts to scaffold a full Turborepo monorepo
- `add` command — incrementally add apps, packages, and integrations to existing projects
- `analyze` command — reverse-engineer existing Turborepo projects into preset JSON
- `mcp` command — MCP server for AI agent integration (Claude Code, Cursor, Windsurf)
- `preset` command — save and validate preset configurations
- **Schema package** — Zod 4 schemas for presets, config, registry, file trees
- **Core engine** — platform-agnostic file tree resolution, template rendering (Eta), wiring computation
- **Templates** — 88 Eta templates across 28 categories (apps, db, api, auth, integrations)
- **Analyzer** — 10 detectors with confidence levels for stack detection
- **Web builder** — visual stack configurator with real-time file tree preview
- **Documentation** — Fumadocs site with guides for builder, MCP, analyze, wiring
- App types: Next.js, Next.js API-only, Hono standalone, Vite-React, SvelteKit, Astro, Remix
- Database: Supabase, Drizzle (6 drivers), Prisma
- API: tRPC v11, Hono, REST (Next.js API routes)
- Auth: Supabase Auth, Better Auth, Clerk, NextAuth, Lucia
- CSS: Tailwind 4, Tailwind 3, vanilla, CSS Modules + shadcn/ui
- Integrations: PostHog, Vercel Analytics, Plausible, Sentry, React Email + Resend, Nodemailer, Upstash, Vercel AI SDK
- Wiring: CSS `@source` directives, catalog dependencies, workspace refs, env chains, tsconfig inheritance, turbo tasks
- Diff engine for incremental operations (add mode)
- Built-in presets: minimal, saas-starter, api-only
- Community preset registry system
- 995+ tests across analyzer (321) and core (674) packages
