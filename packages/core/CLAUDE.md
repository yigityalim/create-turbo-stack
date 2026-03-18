# packages/core

Platform-agnostic business logic. Runs in both Node.js and browser.

## CRITICAL: No Node.js APIs

Do NOT import `fs`, `path`, `child_process`, or any Node.js module. Use `src/utils/path.ts` for path operations.

## Key Modules

- `src/resolve/file-tree.ts` — `resolveFileTree(preset)` → complete FileTree
- `src/resolve/auto-packages.ts` — Determines auto-generated packages (typescript-config, env, db, api, auth)
- `src/resolve/config-files.ts` — Root files (package.json, turbo.json, biome.json, etc.)
- `src/resolve/app-files.ts` — App files (Next.js only in Phase 1)
- `src/resolve/package-files.ts` — Package files + typescript-config package
- `src/wiring/*.ts` — Pure computation: CSS @source, catalog, workspace refs, env chain, tsconfig chain, turbo tasks, exports map
- `src/render/template-engine.ts` — Eta template rendering (browser-safe)
- `src/render/template-context.ts` — Build context for templates from preset + wiring
- `src/diff/tree-diff.ts` — Diff engine for `add` mode (Phase 2)

## How resolveFileTree Works

1. Compute root config files (package.json with catalog, turbo.json, biome, .gitignore, .env.example)
2. Resolve auto-generated packages based on preset selections
3. Resolve user-specified packages
4. Resolve app files
5. Return flat FileTreeNode[] with path + content
