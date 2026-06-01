# packages/core

Platform-agnostic business logic. Runs in both Node.js and browser.

## CRITICAL: No Node.js APIs

Do NOT import `fs`, `path`, `child_process`, or any Node.js module. Use `src/utils/path.ts` for path operations. The negative assertion in `src/browser-safety.test.ts` fails CI if a `node:*` or `eta` import sneaks in via the browser entry.

## Key Modules

- `src/resolve/file-tree.ts` — `resolveFileTree(preset, { items })` → complete FileTree
- `src/resolve/auto-packages.ts` — Determines auto-generated packages from the items the preset selects (typescript-config + the registry slot map)
- `src/resolve/config-files.ts` — Root files (package.json, turbo.json, biome.json, etc.)
- `src/resolve/app-files.ts` — App files: package.json + tsconfig come from the app-type definition, source files come from the matching `slot: "app"` registry item
- `src/resolve/packages/` — Shared package builder (base.ts) and the empty-output generic path when no item matches
- `src/resolve/app-types/*.ts` — One file per framework. `defineAppType({ type, buildPackageJson, buildTsconfig, buildExtraFiles? })`
- `src/registry/*.ts` — Sole content path. `selectRegistryItems` → `materializeRegistryItem` → FileTree nodes; substitution is `{{scope}}` / `{{pkg-name}}` / `{{pm-*}}`, no expressions
- `src/wiring/*.ts` — Pure computation: CSS @source, catalog, workspace refs, env chain, tsconfig chain, turbo tasks, exports map. Catalog + env-chain both read from items
- `src/diff/tree-diff.ts` — Diff engine for `add` mode

## How resolveFileTree Works

1. Compute root config files (package.json with catalog, turbo.json, biome, .gitignore, .env.example)
2. Walk `selectRegistryItems(preset)` and materialize each `(slot, variant)` against the items array passed in (CLI passes `BUILTIN_REGISTRY_ITEMS`; web builder passes the same)
3. Apply app-type rules (package.json + tsconfig) around each `slot: "app"` item
4. Return flat FileTreeNode[] with path + content. A slot with no matching item produces empty output — that's a registry gap, surfaced by the resolver's `unmet` diagnostic, not a runtime fallback
