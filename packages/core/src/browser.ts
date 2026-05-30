/**
 * Browser-safe entry for `@create-turbo-stack/core`.
 *
 * Every export here MUST be reachable from a JS bundle targeting the browser
 * — no `node:*` builtins, no `eta`, no module-side-effect loads that pull
 * either. The web builder (and any future browser-side consumer) imports
 * from `@create-turbo-stack/core/browser`; the default entry (`.`) keeps the
 * full Node-only surface.
 *
 * ⚠️  Before adding an export here, verify the full transitive import graph
 * with the regression test (`test/browser-safety.test.ts`). The test walks
 * every module reachable from this file and fails if any reaches `eta` or a
 * `node:*` module. Common pitfalls:
 *
 *   - `integrations/index.ts`   side-effect-loads every plugin file; each
 *                               plugin top-imports `render-source` → `eta`.
 *                               Export `INTEGRATION_OPTION_CATEGORIES` /
 *                               `integrationPackageName` from
 *                               `@create-turbo-stack/schema` instead.
 *   - `resolve/file-tree.ts`    renders templates, definitionally Node-only.
 *   - `resolve/app-files.ts`    imports `renderSourceFiles`; even though its
 *                               public exports are constants/types, the
 *                               module-level import drags `eta` in.
 *   - `wiring/catalog.ts`       queries the integrations registry, which
 *   `wiring/env-chain.ts`       transitively side-effect-loads plugins.
 *
 * If a browser consumer needs derived data (e.g. "which packages will the
 * engine create?"), prefer a schema-only helper (e.g.
 * `autoPackageNames(preset)` in `@create-turbo-stack/schema`) over calling
 * into core.
 */

// Diff engine
export { applyMutations, diffTree, type FileMutation, type TreeDiff } from "./diff/tree-diff";
// Preset migration registry
export {
  definePresetMigration,
  listPresetMigrations,
  migratePreset,
  type PresetMigration,
  registerPresetMigration,
} from "./migrations";
// Registry-first rendering pipeline (Phase 2 — not yet wired into the
// resolver; exported here for the web builder and tests to consume early).
export {
  type ItemRequest,
  KNOWN_PLACEHOLDERS,
  type KnownPlaceholder,
  type MaterializeContext,
  type MaterializeDiagnostic,
  type MaterializeOptions,
  type MaterializeResult,
  materializeRegistryItem,
  type SubstitutionContext,
  selectRegistryItems,
  substituteRegistryItem,
} from "./registry";
// Runtime template registry (plugins ship inline templates here)
export {
  getRegisteredTemplates,
  listRegisteredCategories,
  registerTemplates,
} from "./render/template-registry";
// App type plugin system (plugin files are metadata-only — no render imports)
export {
  type AppResolveContext,
  type AppTypeDefinition,
  defineAppType,
  getAppTypeDefinition,
  listSupportedAppTypes,
  registerAppType,
} from "./resolve/app-types";
// Utils
export { fullPackageName, scopeToName, slugify } from "./utils/naming";
export {
  appDirOf,
  autoPackageDir,
  distinctLocations,
  memberDir,
  packageDirByName,
  packageDirOf,
  workspaceGlobs,
} from "./utils/package-path";
export { basename, dirname, join, relativePath } from "./utils/path";
// Pure wiring computations (Preset → derived structure; no integrations registry)
export { type CssSourceMap, computeCssSourceMap } from "./wiring/css-source";
export { computeExportsMap } from "./wiring/exports-map";
export { computeTsconfigChain, type TsconfigTarget } from "./wiring/tsconfig-chain";
export { computeTurboConfig, type TurboConfig } from "./wiring/turbo-tasks";
export { computeWorkspaceRefs } from "./wiring/workspace-refs";
