/**
 * Registry-first rendering pipeline. Browser-safe — no node:* / no eta.
 *
 * `selectRegistryItems(preset)` → list of `(slot, variant, pkgName)`
 *   requests the resolver will look up.
 *
 * `materializeRegistryItem(item, ctx)` → `FileTreeNode[]` ready for the
 *   FileTree the user's project lands in.
 *
 * `substituteRegistryItem(text, ctx)` → text with `{{scope}}` etc. resolved;
 *   exported separately for use cases that touch raw strings (preview
 *   surface, registry CLI, …).
 *
 * Phase 2: these three are SHIPPED but NOT wired into `resolveFileTree`.
 * Phase 3 (next session): replace the Eta-driven branches of
 * `resolve/auto-packages.ts` and `resolve/app-files.ts` with calls to
 * these, one slot at a time.
 */

export type {
  MaterializeContext,
  MaterializeDiagnostic,
  MaterializeOptions,
  MaterializeResult,
} from "./materialize.js";
export { materializeRegistryItem } from "./materialize.js";
export type { ItemRequest } from "./select.js";
export { selectRegistryItems } from "./select.js";
export type {
  KnownPlaceholder,
  SubstitutionContext,
} from "./substitute.js";
export {
  KNOWN_PLACEHOLDERS,
  substituteRegistryItem,
} from "./substitute.js";
