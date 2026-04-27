// @create-turbo-stack/core
// Platform-agnostic business logic. No Node.js APIs allowed in this package.

// Diff engine (for add mode)
export { applyMutations, diffTree, type FileMutation, type TreeDiff } from "./diff/tree-diff";
// Integration plugin system
export {
  type CatalogEntrySpec,
  defineIntegration,
  type EnvVarSpec,
  getIntegration,
  type IntegrationCategory,
  type IntegrationDefinition,
  listIntegrations,
  registerIntegration,
} from "./integrations";
// Preset migration registry
export {
  definePresetMigration,
  listPresetMigrations,
  migratePreset,
  type PresetMigration,
  registerPresetMigration,
} from "./migrations";
// Template rendering
export { buildTemplateContext, type TemplateContext } from "./render/template-context";
export { renderTemplate } from "./render/template-engine";
export {
  getRegisteredTemplates,
  listRegisteredCategories,
  registerTemplates,
} from "./render/template-registry";
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
export { computeTsconfigChain, type TsconfigTarget } from "./wiring/tsconfig-chain";
export { computeTurboConfig, type TurboConfig } from "./wiring/turbo-tasks";
export { computeWorkspaceRefs } from "./wiring/workspace-refs";
