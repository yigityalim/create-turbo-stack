// @create-turbo-stack/core
// Platform-agnostic business logic. No Node.js APIs allowed in this package.

// Diff engine (for add mode)
export { applyMutations, diffTree, type FileMutation, type TreeDiff } from "./diff/tree-diff";
// Preset migration registry
export {
  definePresetMigration,
  listPresetMigrations,
  migratePreset,
  type PresetMigration,
  registerPresetMigration,
} from "./migrations";
// Registry-first rendering pipeline. Mirrors browser.ts exports — Node-side
// consumers get the same surface so cts add / cts customize and the
// resolver hook all go through one substituter.
export {
  BUILTIN_REGISTRY_ITEM_COUNT,
  BUILTIN_REGISTRY_ITEMS,
  type ItemRequest,
  indexItemsBySlotVariant,
  KNOWN_PLACEHOLDERS,
  type KnownPlaceholder,
  type MaterializeContext,
  type MaterializeDiagnostic,
  type MaterializeOptions,
  type MaterializeResult,
  materializeRegistryItem,
  type ResolveContext,
  type ResolveOutput,
  resolveRegistryItems,
  type SubstitutionContext,
  selectRegistryItems,
  substituteRegistryItem,
} from "./registry";
// Registry supply-chain integrity
export {
  canonicalizeItem,
  computeChecksum,
  signChecksum,
  verifySignature,
} from "./registry/integrity";
export {
  SUPPORTED_APP_TYPES,
  type SupportedAppType,
  UnsupportedAppTypeError,
} from "./resolve/app-files";
// App type plugin system
export {
  type AppResolveContext,
  type AppTypeDefinition,
  defineAppType,
  getAppTypeDefinition,
  listSupportedAppTypes,
  registerAppType,
} from "./resolve/app-types";
export { resolveAutoPackages } from "./resolve/auto-packages";
// File tree resolution
export { type ResolveOptions, resolveFileTree } from "./resolve/file-tree";
export { fullPackageName, scopeToName, slugify } from "./utils/naming";
// Utils
export { basename, dirname, join, relativePath } from "./utils/path";
export { type CatalogEntry, computeCatalog } from "./wiring/catalog";
// Wiring computations
export { type CssSourceMap, computeCssSourceMap } from "./wiring/css-source";
export { computeEnvChain, type EnvChain, type EnvVar } from "./wiring/env-chain";
export { computeExportsMap } from "./wiring/exports-map";
export { getLinter, type LinterDef } from "./wiring/linters";
export { computeTsconfigChain, type TsconfigTarget } from "./wiring/tsconfig-chain";
export { computeTurboConfig, type TurboConfig } from "./wiring/turbo-tasks";
export { computeWorkspaceRefs } from "./wiring/workspace-refs";
