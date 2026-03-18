# apps/web

Fumadocs-powered Next.js 16 site for create-turbo-stack.

## Structure

- `src/app/(home)/` — Landing page (route group, uses HomeLayout)
- `src/app/docs/` — Documentation pages (Fumadocs DocsLayout)
- `src/app/api/search/` — Fumadocs search API
- `src/app/og/` — OG image generation
- `src/app/llms.txt/`, `llms-full.txt/`, `llms.mdx/` — LLM-friendly docs routes
- `content/docs/` — MDX documentation files
- `source.config.ts` — Fumadocs MDX source config
- `src/lib/layout.shared.tsx` — Shared nav options (title, links, GitHub)
- `src/lib/source.ts` — Fumadocs source adapter
- `public/schema/` — JSON Schema files (generated, do not edit manually)
- `public/s/` — Static preset files + registry index

## Key Points

- Uses Fumadocs UI layouts: `HomeLayout` for (home), `DocsLayout` for /docs
- `@create-turbo-stack/core` and `@create-turbo-stack/schema` are workspace deps
- Core runs in browser — used for file tree preview in builder
- Fonts: Geist Sans + Geist Mono
- Fumadocs handles dark mode, search, sidebar, TOC automatically
- Run `fumadocs-mdx` postinstall to generate `.source/` types
- Biome for linting (web has its own biome.json with fumadocs-specific ignores)

## Adding Docs

Add MDX files to `content/docs/`. They auto-appear in the sidebar.

```mdx
---
title: My Page
description: Page description
---

Content here.
```
