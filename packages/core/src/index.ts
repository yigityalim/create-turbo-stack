// @create-turbo-stack/core
// Platform-agnostic business logic. No Node.js APIs allowed in this package.

// File tree resolution
export { resolveFileTree, type ResolveOptions } from "./resolve/file-tree";
export { resolveAutoPackages } from "./resolve/auto-packages";

// Template rendering
export { renderTree } from "./render/render-tree";
export { buildTemplateContext, type TemplateContext } from "./render/template-context";
export { renderTemplate } from "./render/template-engine";

// Wiring computations
export { computeCssSourceMap, type CssSourceMap } from "./wiring/css-source";
export { computeCatalog, type CatalogEntry } from "./wiring/catalog";
export { computeWorkspaceRefs } from "./wiring/workspace-refs";
export { computeEnvChain, type EnvChain, type EnvVar } from "./wiring/env-chain";
export { computeTsconfigChain, type TsconfigTarget } from "./wiring/tsconfig-chain";
export { computeTurboConfig, type TurboConfig } from "./wiring/turbo-tasks";
export { computeExportsMap } from "./wiring/exports-map";

// Diff engine (for add mode)
export { diffTree, type TreeDiff } from "./diff/tree-diff";

// Utils
export { join, dirname, basename, relativePath } from "./utils/path";
export { scopeToName, fullPackageName, slugify } from "./utils/naming";
