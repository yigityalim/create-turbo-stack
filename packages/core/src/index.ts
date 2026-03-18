// @create-turbo-stack/core
// Platform-agnostic business logic. No Node.js APIs allowed in this package.

// File tree resolution
export { resolveFileTree } from "./resolve/file-tree";

// Template rendering
export { renderTree } from "./render/render-tree";
export { buildTemplateContext } from "./render/template-context";

// Wiring computations
export { computeCssSourceMap } from "./wiring/css-source";
export { computeCatalog } from "./wiring/catalog";
export { computeWorkspaceRefs } from "./wiring/workspace-refs";
export { computeEnvChain } from "./wiring/env-chain";
export { computeTsconfigChain } from "./wiring/tsconfig-chain";
export { computeTurboConfig } from "./wiring/turbo-tasks";
export { computeExportsMap } from "./wiring/exports-map";

// Diff engine (for add mode)
export { diffTree } from "./diff/tree-diff";
