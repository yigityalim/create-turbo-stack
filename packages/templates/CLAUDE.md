# packages/templates

Passive data package. Contains EJS template strings.

## Current State

Phase 1 uses inline string generation in core resolvers. This package is a skeleton for Phase 2+ when templates will be extracted into .ejs files and bundled as a string map via build script.

## Future Structure

```
src/app/nextjs/        — Next.js app templates
src/app/hono/          — Hono app templates
src/package/ui/        — UI package templates
src/package/library/   — Library package templates
src/integration/       — Integration templates (supabase, trpc, etc.)
src/root/              — Root config templates
```

Templates use Eta syntax (`<%= %>`, `<% %>`) — same as EJS but browser-compatible.
