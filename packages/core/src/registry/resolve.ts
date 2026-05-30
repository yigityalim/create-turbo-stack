/**
 * Registry-first resolver hook.
 *
 * Bridges `selectRegistryItems(preset)` (what does the preset want?) and
 * `materializeRegistryItem(item, ctx)` (turn an item into files) into a
 * single call the broader resolver can plug in next to its existing Eta
 * path:
 *
 *   const { nodes, unmet } = resolveRegistryItems(preset, items, ctx);
 *   // nodes  → ready for the FileTree
 *   // unmet  → slot/variant pairs the resolver should fall back to Eta for
 *
 * The "items" input is whatever the caller has loaded — bundled built-ins
 * in the CLI, a fetched registry JSON in the web builder, a test fixture
 * in unit tests. This module does NOT load items from disk; it's a pure
 * function so it stays browser-safe.
 *
 * The transitional design (fallback to Eta when an item is missing) lets
 * us migrate one slot at a time without breaking presets that touch slots
 * we haven't moved yet. Once every shipped slot has at least one item, the
 * Eta path can be deleted and `unmet` should always be empty.
 */

import type {
  FileTreeNode,
  PackageManager,
  PackageRegistryItem,
  Preset,
} from "@create-turbo-stack/schema";
import { type MaterializeDiagnostic, materializeRegistryItem } from "./materialize.js";
import { type ItemRequest, selectRegistryItems } from "./select.js";

export interface ResolveContext {
  /**
   * The user's scope from `preset.basics.scope`. Used as `{{scope}}`.
   * Passed in explicitly (rather than read off the preset inside) so
   * tests can override without constructing a whole Preset.
   */
  scope: string;
  /** Selected package manager, drives `{{pm-*}}` placeholders. */
  pm: PackageManager;
  /**
   * Resolve a slot+pkgName pair to the directory the item materializes
   * into. Implementations:
   *   - default for non-app slots: `<location>/<pkgName>` where location
   *     defaults to `"packages"` (or `preset.autoPackageLocations[pkgName]`)
   *   - default for app slots: `<location>/<appName>` from
   *     `preset.apps[i].location`
   * The caller injects this so the registry module stays free of the
   * preset's relocation rules.
   */
  resolvePkgRoot(request: ItemRequest): string;
}

export interface ResolveOutput {
  /** Materialized FileTreeNodes ready to merge into the larger tree. */
  nodes: FileTreeNode[];
  /**
   * Requests for which no matching item was found in `items`. The caller's
   * Eta fallback should serve these. Empty when every slot has an item.
   */
  unmet: ItemRequest[];
  /**
   * Per-file diagnostics from `materializeRegistryItem` — typically empty;
   * a non-empty list means a shipped item is missing inlined `content`,
   * which is a registry-build bug worth surfacing in CI.
   */
  diagnostics: MaterializeDiagnostic[];
}

/**
 * Walk a preset's item requests and materialize every one we can serve.
 *
 * Items are matched by `(slot, variant)` — exact, no fuzzy. The function
 * is order-preserving: nodes come out in the same order as the requests
 * `selectRegistryItems` produced, which keeps typescript-config first and
 * env second so writers downstream see deps before consumers.
 */
export function resolveRegistryItems(
  preset: Preset,
  items: ReadonlyArray<PackageRegistryItem>,
  ctx: ResolveContext,
): ResolveOutput {
  const nodes: FileTreeNode[] = [];
  const unmet: ItemRequest[] = [];
  const diagnostics: MaterializeDiagnostic[] = [];

  for (const request of selectRegistryItems(preset)) {
    const item = items.find((i) => i.slot === request.slot && i.variant === request.variant);
    if (!item) {
      unmet.push(request);
      continue;
    }
    const result = materializeRegistryItem(item, {
      scope: ctx.scope,
      pkgName: request.pkgName,
      pm: ctx.pm,
      pkgRoot: ctx.resolvePkgRoot(request),
    });
    nodes.push(...result.nodes);
    diagnostics.push(...result.diagnostics);
  }

  return { nodes, unmet, diagnostics };
}

/**
 * Helper for building a registry-item lookup map keyed by `slot:variant`,
 * useful for callers that prefer a Map to a linear scan (large registries,
 * many requests). Order-preserving in the sense that the first item with a
 * given `(slot, variant)` wins — later duplicates are ignored.
 */
export function indexItemsBySlotVariant(
  items: ReadonlyArray<PackageRegistryItem>,
): Map<string, PackageRegistryItem> {
  const map = new Map<string, PackageRegistryItem>();
  for (const item of items) {
    if (!item.slot || !item.variant) continue;
    const key = `${item.slot}:${item.variant}`;
    if (!map.has(key)) map.set(key, item);
  }
  return map;
}
