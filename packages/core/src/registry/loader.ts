/**
 * Abstract registry item loader interface.
 *
 * `resolveRegistryTree` owns the dependency-walk logic (topological sort,
 * cycle detection, deduplication, integrity verification). The only I/O it
 * needs is loading a single item by ref — that is injected via this interface.
 *
 * Concrete implementations:
 *   - CLI: `FsHttpLoader` in packages/cli (uses node:fs + fetch, env expansion,
 *     namespace auth headers). Created per-command and passed in.
 *   - Web builder: `HttpLoader` (fetch-only, no env expansion, no fs).
 *     Enables previewing `cts add <name>` output in the builder without
 *     any Node.js dependency.
 *   - Tests: in-memory fixture loader, no network.
 *
 * The loader owns the I/O; this module owns the traversal.
 */

import type { PackageRegistryItem } from "@create-turbo-stack/schema";
import { computeChecksum, verifySignature } from "./integrity.js";

export interface LoadedItem {
  item: PackageRegistryItem;
  /**
   * The "base" context for resolving bare `registryDependencies` of this item.
   * Typically the namespace (`"@acme"`), the URL prefix, or an empty string for
   * the default registry. The loader sets this on each load result so the tree
   * walker can propagate context without knowing the loading strategy.
   */
  base: string;
}

export interface RegistryItemLoader {
  /**
   * Load a single item by ref.
   *
   * @param ref  The ref to load — bare name (`"crypto"`), namespaced
   *             (`"@acme/crypto"`), or a full URL.
   * @param base The base context inherited from the parent item's load result.
   *             An empty string means "root / default registry". The loader
   *             uses this to resolve bare refs (e.g. a dep of an `@acme` item
   *             stays in `@acme` unless explicitly prefixed).
   */
  load(ref: string, base: string): Promise<LoadedItem>;
}

export interface ResolvedItem {
  item: PackageRegistryItem;
  /** Canonical ref recorded in `.turbo-stack.json` for drift detection. */
  ref: string;
}

export interface ResolveTreeOptions {
  /**
   * Per-namespace Ed25519 public keys. When provided for the namespace that
   * served an item, the item's `signature` field is verified against it.
   * Items from namespaces without a `publicKey` entry have their checksum
   * verified only (always required for built items).
   */
  publicKeys?: Record<string, string>;
}

/**
 * Resolve the full install set for `rootRef`: the item plus all
 * `registryDependencies`, recursively. Returns items in dependency-first
 * (topological) order. Deduplicates by name; cycle-safe.
 *
 * Each item is integrity-verified (SHA-256 checksum, and Ed25519 signature
 * when a `publicKey` is configured for its namespace) before it enters the
 * ordered set. A verification failure throws immediately.
 *
 * This function is browser-safe. All I/O is delegated to `loader`.
 */
export async function resolveRegistryTree(
  rootRef: string,
  loader: RegistryItemLoader,
  opts: ResolveTreeOptions = {},
): Promise<ResolvedItem[]> {
  const ordered: ResolvedItem[] = [];
  const done = new Set<string>();
  const onStack = new Set<string>();

  async function visit(ref: string, base: string): Promise<void> {
    const { item, base: childBase } = await loader.load(ref, base);

    await verifyItemIntegrity(item, childBase, opts.publicKeys);

    if (done.has(item.name) || onStack.has(item.name)) return;
    onStack.add(item.name);

    for (const dep of item.registryDependencies ?? []) {
      await visit(dep, childBase);
    }

    onStack.delete(item.name);
    done.add(item.name);

    const canonicalRef = childBase.startsWith("@") ? `${childBase}/${item.name}` : item.name;

    ordered.push({ item, ref: canonicalRef });
  }

  await visit(rootRef, "");
  return ordered;
}

/**
 * Verify the supply-chain integrity of a single item before installation.
 *
 * Two gates:
 *   1. SHA-256 checksum — always checked when present (all built items carry one).
 *      Catches tampering or corruption between build and install.
 *   2. Ed25519 signature — verified only when the item's namespace has a
 *      `publicKey` configured. Required for private/paid registries;
 *      optional for the public registry.
 */
async function verifyItemIntegrity(
  item: PackageRegistryItem,
  base: string,
  publicKeys?: Record<string, string>,
): Promise<void> {
  if (item.checksum) {
    const actual = await computeChecksum(item);
    if (actual !== item.checksum) {
      throw new Error(
        `checksum mismatch for "${item.name}" — content does not match its stamp ` +
          `(expected ${item.checksum}, got ${actual}). Refusing to install.`,
      );
    }
  }

  const publicKey = base.startsWith("@") ? publicKeys?.[base] : undefined;
  if (publicKey) {
    if (!item.signature) {
      throw new Error(`"${item.name}" is unsigned but its registry requires a signature`);
    }
    if (!item.checksum) {
      throw new Error(`"${item.name}" carries a signature but no checksum to verify against`);
    }
    if (!(await verifySignature(item.checksum, item.signature, publicKey))) {
      throw new Error(`invalid signature for "${item.name}" — check the registry publicKey`);
    }
  }
}
