import fs from "node:fs/promises";
import path from "node:path";
import type { RegistryItemLoader, LoadedItem, ResolvedItem, ResolveTreeOptions } from "@create-turbo-stack/core";
import { resolveRegistryTree } from "@create-turbo-stack/core";
import type { PackageRegistryItem, RegistryConfigEntry } from "@create-turbo-stack/schema";
import { PackageRegistryItemSchema } from "@create-turbo-stack/schema";
import { expandEnv } from "./env";

export type { ResolvedItem };

const DEFAULT_REGISTRY = "https://create-turbo-stack.dev/r";
const NAMESPACE_RE = /^(@[a-zA-Z0-9][\w-]*)\/(.+)$/;

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

export interface ResolveOptions {
  registry?: string;
  registries?: Record<string, RegistryConfigEntry>;
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

/**
 * Node.js registry item loader. Resolves refs from the filesystem, HTTP
 * endpoints, and namespaced registries configured in `.turbo-stack.json`.
 *
 * Implements `RegistryItemLoader` from `@create-turbo-stack/core` so that
 * `resolveRegistryTree` (which owns cycle detection, topo sort, and integrity
 * verification) can remain browser-safe in core.
 */
export class FsHttpLoader implements RegistryItemLoader {
  constructor(private readonly opts: ResolveOptions) {}

  async load(ref: string, base: string): Promise<LoadedItem> {
    const parse = (raw: string): PackageRegistryItem =>
      PackageRegistryItemSchema.parse(JSON.parse(raw));

    if (/^https?:\/\//.test(ref)) {
      return { item: parse(await fetchItem(ref, {})), base: ref.replace(/\/[^/]*$/, "") };
    }

    const ns = ref.match(NAMESPACE_RE);
    if (ns) {
      const [, namespace, resource] = ns;
      const entry = this.opts.registries?.[namespace];
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
    if (base.startsWith("@")) return this.load(`${base}/${ref}`, base);
    if (/^https?:\/\//.test(base)) {
      return { item: parse(await fetchItem(`${base}/${ref}.json`, {})), base };
    }
    if (base) {
      return { item: parse(await fs.readFile(path.join(base, `${ref}.json`), "utf-8")), base };
    }

    const registry = this.opts.registry ?? DEFAULT_REGISTRY;
    if (/^https?:\/\//.test(registry)) {
      const root = registry.replace(/\/$/, "");
      return { item: parse(await fetchItem(`${root}/${ref}.json`, {})), base: root };
    }
    const stat = await fs.stat(registry).catch(() => null);
    const dir = stat?.isDirectory() ? registry : path.dirname(registry);
    const file = stat?.isDirectory() ? path.join(registry, `${ref}.json`) : registry;
    return { item: parse(await fs.readFile(file, "utf-8")), base: dir };
  }
}

/**
 * Resolve the full install set for `rootRef` using the Node.js fs+http loader.
 * Returns items in dependency-first (topological) order, deduped and integrity-verified.
 */
export async function resolveTree(
  rootRef: string,
  opts: ResolveOptions,
  treeOpts?: ResolveTreeOptions,
): Promise<ResolvedItem[]> {
  const loader = new FsHttpLoader(opts);
  const publicKeys: Record<string, string> = {};
  for (const [ns, entry] of Object.entries(opts.registries ?? {})) {
    if (typeof entry === "object" && entry.publicKey) publicKeys[ns] = entry.publicKey;
  }
  return resolveRegistryTree(rootRef, loader, { ...treeOpts, publicKeys });
}
