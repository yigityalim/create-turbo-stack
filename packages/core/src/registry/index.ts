/**
 * Registry-only rendering pipeline. Browser-safe — no node:*, no template
 * engine. This is the sole content path; there is no Eta fallback layer.
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
 * Wired into `resolveFileTree` via `resolve/auto-packages.ts` and
 * `resolve/app-files.ts`. Slots without a matching item produce empty
 * output — a missing item is a registry bug surfaced by the resolver's
 * `unmet` diagnostic, not a soft-failure path.
 */

export {
  BUILTIN_REGISTRY_ITEM_COUNT,
  BUILTIN_REGISTRY_ITEMS,
} from "./builtin-items.js";
export type {
  MaterializeContext,
  MaterializeDiagnostic,
  MaterializeOptions,
  MaterializeResult,
} from "./materialize.js";
export { materializeRegistryItem } from "./materialize.js";
export type { ResolveContext, ResolveOutput } from "./resolve.js";
export {
  indexItemsBySlotVariant,
  resolveRegistryItems,
} from "./resolve.js";
export type {
  LoadedItem,
  RegistryItemLoader,
  ResolvedItem,
  ResolveTreeOptions,
} from "./loader.js";
export { resolveRegistryTree } from "./loader.js";
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
