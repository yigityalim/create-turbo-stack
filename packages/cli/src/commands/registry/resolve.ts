import fs from "node:fs/promises";
import path from "node:path";
import { computeChecksum, verifySignature } from "@create-turbo-stack/core";
import type { PackageRegistryItem, RegistryConfigEntry } from "@create-turbo-stack/schema";
import { PackageRegistryItemSchema } from "@create-turbo-stack/schema";
import { expandEnv } from "./env";

const DEFAULT_REGISTRY = "https://create-turbo-stack.dev/r";
const NAMESPACE_RE = /^(@[a-zA-Z0-9][\w-]*)\/(.+)$/;

export interface ResolveOptions {
  registry?: string;
  registries?: Record<string, RegistryConfigEntry>;
}

export interface ResolvedItem {
  item: PackageRegistryItem;
  /** How this item was resolved — recorded for drift detection / reconcile. */
  ref: string;
}

/** Split "name@version" / "@scope/name@version" into [name, version?]. */
export function parseDep(spec: string): [string, string] {
  const at = spec.lastIndexOf("@");
  if (at > 0) return [spec.slice(0, at), spec.slice(at + 1)];
  return [spec, "latest"];
}

/** The package name a registryDependency installs to (bare / @ns/name / URL). */
export function depPackageName(ref: string): string {
  if (/^https?:\/\//.test(ref)) return path.basename(ref).replace(/\.json$/, "");
  const ns = ref.match(NAMESPACE_RE);
  return ns ? ns[2] : ref;
}

async function fetchItem(url: string, headers: Record<string, string>): Promise<string> {
  const res = await fetch(url, { headers });
  if (res.status === 401) throw new Error("unauthorized (401) — check your registry token");
  if (res.status === 403) throw new Error("forbidden (403) — token lacks access");
  if (!res.ok) throw new Error(`fetch ${url} → ${res.status}`);
  return res.text();
}

function namespaceRequest(entry: RegistryConfigEntry, resource: string) {
  const template = typeof entry === "string" ? entry : entry.url;
  const url = new URL(expandEnv(template.replace(/\{name\}/g, resource)));
  const headers: Record<string, string> = {};
  if (typeof entry !== "string") {
    for (const [k, v] of Object.entries(entry.headers ?? {})) headers[k] = expandEnv(v);
    for (const [k, v] of Object.entries(entry.params ?? {})) url.searchParams.set(k, expandEnv(v));
  }
  return { url: url.toString(), headers };
}

/** The configured Ed25519 public key for a namespace, if any. */
function namespacePublicKey(opts: ResolveOptions, base: string): string | undefined {
  if (!base.startsWith("@")) return undefined;
  const entry = opts.registries?.[base];
  return typeof entry === "object" ? entry.publicKey : undefined;
}

/**
 * Supply-chain gate before any file is written. The checksum (always present on
 * built items) catches tampering/corruption between build and install. The
 * signature — verified only when the registry has a `publicKey` configured —
 * is the out-of-band trust anchor that a self-embedded checksum cannot provide.
 */
async function verifyIntegrity(item: PackageRegistryItem, publicKey?: string): Promise<void> {
  if (item.checksum) {
    const actual = await computeChecksum(item);
    if (actual !== item.checksum) {
      throw new Error(
        `checksum mismatch for "${item.name}" — content does not match its stamp ` +
          `(expected ${item.checksum}, got ${actual}). Refusing to install.`,
      );
    }
  }
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

/**
 * Load one item + the `base` to resolve ITS bare `registryDependencies`.
 * A ref can be a URL, `@ns/name`, or a bare name; a bare name resolves
 * against the parent's base (so a dep of an `@store` item stays in `@store`),
 * falling back to `--registry` / the default registry at the root.
 */
async function loadItem(
  ref: string,
  opts: ResolveOptions,
  base: string,
): Promise<{ item: PackageRegistryItem; base: string }> {
  const parse = (raw: string) => PackageRegistryItemSchema.parse(JSON.parse(raw));

  if (/^https?:\/\//.test(ref)) {
    return { item: parse(await fetchItem(ref, {})), base: ref.replace(/\/[^/]*$/, "") };
  }

  const ns = ref.match(NAMESPACE_RE);
  if (ns) {
    const [, namespace, resource] = ns;
    const entry = opts.registries?.[namespace];
    if (!entry) {
      throw new Error(
        `unknown registry "${namespace}" — add it to .turbo-stack.json:\n` +
          `  { "config": { "registries": { "${namespace}": "https://.../{name}.json" } } }`,
      );
    }
    const { url, headers } = namespaceRequest(entry, resource);
    return { item: parse(await fetchItem(url, headers)), base: namespace };
  }

  // Bare name — resolve against the parent base, then the root registry.
  if (base.startsWith("@")) return loadItem(`${base}/${ref}`, opts, base);
  if (/^https?:\/\//.test(base)) {
    return { item: parse(await fetchItem(`${base}/${ref}.json`, {})), base };
  }
  if (base) {
    return { item: parse(await fs.readFile(path.join(base, `${ref}.json`), "utf-8")), base };
  }

  const registry = opts.registry ?? DEFAULT_REGISTRY;
  if (/^https?:\/\//.test(registry)) {
    const root = registry.replace(/\/$/, "");
    return { item: parse(await fetchItem(`${root}/${ref}.json`, {})), base: root };
  }
  const stat = await fs.stat(registry).catch(() => null);
  const dir = stat?.isDirectory() ? registry : path.dirname(registry);
  const file = stat?.isDirectory() ? path.join(registry, `${ref}.json`) : registry;
  return { item: parse(await fs.readFile(file, "utf-8")), base: dir };
}

/**
 * Resolve the full install set: the item plus its `registryDependencies`,
 * recursively. Deps come before dependents (topological), deduped by name,
 * cycle-safe, and each is integrity-verified as it loads.
 */
export async function resolveTree(rootRef: string, opts: ResolveOptions): Promise<ResolvedItem[]> {
  const ordered: ResolvedItem[] = [];
  const done = new Set<string>();
  const onStack = new Set<string>();

  async function visit(ref: string, base: string): Promise<void> {
    const { item, base: childBase } = await loadItem(ref, opts, base);
    await verifyIntegrity(item, namespacePublicKey(opts, childBase));
    if (done.has(item.name) || onStack.has(item.name)) return;
    onStack.add(item.name);
    for (const dep of item.registryDependencies) await visit(dep, childBase);
    onStack.delete(item.name);
    done.add(item.name);
    ordered.push({
      item,
      ref: childBase.startsWith("@") ? `${childBase}/${item.name}` : item.name,
    });
  }

  await visit(rootRef, "");
  return ordered;
}
