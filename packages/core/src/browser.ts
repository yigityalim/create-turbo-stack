// Browser-safe exports — no Eta, no node:fs dependency.
// Use this entry point in client-side code (web builder, etc.)

// Diff engine
export { applyMutations, diffTree, type FileMutation, type TreeDiff } from "./diff/tree-diff";
export { resolveAutoPackages } from "./resolve/auto-packages";
// File tree resolution (browser-safe)
export { type ResolveOptions, resolveFileTree } from "./resolve/file-tree";
export { fullPackageName, scopeToName, slugify } from "./utils/naming";
// Utils
export { basename, dirname, join, relativePath } from "./utils/path";
export { type CatalogEntry, computeCatalog } from "./wiring/catalog";
// Wiring computations (all pure functions, browser-safe)
export { type CssSourceMap, computeCssSourceMap } from "./wiring/css-source";
export { computeEnvChain, type EnvChain, type EnvVar } from "./wiring/env-chain";
export { computeExportsMap } from "./wiring/exports-map";
export { computeTsconfigChain, type TsconfigTarget } from "./wiring/tsconfig-chain";
export { computeTurboConfig, type TurboConfig } from "./wiring/turbo-tasks";
export { computeWorkspaceRefs } from "./wiring/workspace-refs";
