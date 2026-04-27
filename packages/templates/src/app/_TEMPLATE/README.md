# `_TEMPLATE/` — reference for new app frameworks

This directory is a **copy-paste reference**. The build script
(`scripts/build-templates.ts`) skips any directory whose name starts
with `_` so this content does NOT end up in `templates-map.ts` (and
therefore not in the browser builder's bundle, not in the CLI's bundle).

To include it during local exploration:

```bash
bun run scripts/build-templates.ts --include-all
```

## How to use this as a starting point

1. Copy this entire directory to `app/<framework>/` (e.g. `app/nuxt/`).
2. Replace the `.eta` files with real framework source.
3. Pair it with an `AppTypeDefinition` in
   `packages/core/src/resolve/app-types/<framework>.ts` (start from
   `_TEMPLATE.ts` there).
4. The `templateCategory` field of your AppTypeDefinition must match
   the directory name (`app/<framework>`).
5. Run `bun run build:templates` to regenerate the templates map.

## What goes in here

- `.eta` files only. Anything else (this README) is ignored by
  the build script — it only collects `*.eta`.
- Use `<%= it.app.name %>`, `<%= it.scope %>`, etc. The available
  `it.*` fields come from your `AppTypeDefinition.buildTemplateContext`.
- File paths are mirrored 1:1: `src/index.ts.eta` becomes
  `apps/<your-app>/src/index.ts`.

## What does NOT go in here

- `package.json` — built in code by `AppTypeDefinition.buildPackageJson`.
- `tsconfig.json` — built in code by `AppTypeDefinition.buildTsconfig`.

These are programmatic so the wiring (workspace refs, catalog deps,
linter switches) stays a single source of truth. Only put templated
*source code* in `.eta` files.
