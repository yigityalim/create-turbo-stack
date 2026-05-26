/**
 * Build a CTS package registry.
 *
 * Reads an authored `registry.json` (items reference real files by path),
 * inlines each file's content, stamps a SHA-256 `checksum` (and, when a signing
 * key is given, an Ed25519 `signature`), and writes the served registry:
 *   - <outDir>/<name>.json   — full item, file contents inlined, checksum
 *   - <outDir>/registry.json — index (metadata, no file contents)
 *
 * `registry.json` may `include` other registry / single-item JSON files —
 * literal paths or globs like `*​/registry-item.json` — so a registry with
 * 100+ packages keeps one item per file instead of one giant `items` array.
 * Includes resolve recursively and merge (name conflicts error out).
 *
 * `cts add <name>` consumes the per-item JSON and re-verifies the checksum.
 * Same producer/consumer split as `.eta → templates-map`. `buildRegistry` is
 * exported so a private registry server can reuse it (via the published
 * `@create-turbo-stack/core`) to build its own signed registry.
 *
 * Run: `bun run build:registry`.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { computeChecksum, signChecksum } from "../packages/core/src/registry/integrity";
import {
  type PackageRegistryItem,
  PackageRegistryItemSchema,
  PackageRegistrySchema,
} from "../packages/schema/src/package-registry";

const isGlob = (s: string) => /[*?{[]/.test(s);

/**
 * Resolve a registry file plus everything it `include`s into a flat,
 * name-deduped item map. `dir` is the directory the file lives in, so its
 * `include` / `files` paths resolve relative to it.
 */
function collectItems(file: string, into: Map<string, PackageRegistryItem>): string | undefined {
  const dir = path.dirname(file);
  const raw = JSON.parse(readFileSync(file, "utf-8"));

  // A single-item file (registry-item.json style) has no `items`/`include`.
  if (!Array.isArray(raw.items) && !Array.isArray(raw.include)) {
    addItem(PackageRegistryItemSchema.parse(raw), dir, into);
    return undefined;
  }

  const registry = PackageRegistrySchema.parse(raw);
  for (const entry of registry.include) {
    for (const inc of isGlob(entry)
      ? [...new Bun.Glob(entry).scanSync({ cwd: dir })].sort()
      : [entry]) {
      collectItems(path.resolve(dir, inc), into);
    }
  }
  for (const item of registry.items) addItem(item, dir, into);
  return registry.$schema;
}

/** Inline file contents (resolved against the declaring file's dir) and dedupe. */
function addItem(item: PackageRegistryItem, dir: string, into: Map<string, PackageRegistryItem>) {
  if (into.has(item.name)) {
    throw new Error(`duplicate registry item "${item.name}" — names must be unique`);
  }
  const files = item.files.map((f) => ({
    ...f,
    content: readFileSync(path.resolve(dir, f.path), "utf-8"),
  }));
  into.set(item.name, { ...item, files });
}

export interface BuildRegistryOptions {
  /** Directory holding the root `registry.json`. */
  srcDir: string;
  /** Directory to write `<name>.json` + `registry.json` into. */
  outDir: string;
  /** Base64 PKCS8 Ed25519 private key; when set, each item is signed. */
  signingKey?: string;
}

export async function buildRegistry(opts: BuildRegistryOptions): Promise<PackageRegistryItem[]> {
  const root = PackageRegistrySchema.parse(
    JSON.parse(readFileSync(path.join(opts.srcDir, "registry.json"), "utf-8")),
  );
  const collected = new Map<string, PackageRegistryItem>();
  const schema = collectItems(path.join(opts.srcDir, "registry.json"), collected);
  const items = [...collected.values()].sort((a, b) => a.name.localeCompare(b.name));

  mkdirSync(opts.outDir, { recursive: true });

  for (const item of items) {
    item.checksum = await computeChecksum(item);
    if (opts.signingKey) item.signature = await signChecksum(item.checksum, opts.signingKey);
    const built = { $schema: schema, ...item };
    writeFileSync(
      path.join(opts.outDir, `${item.name}.json`),
      `${JSON.stringify(built, null, 2)}\n`,
    );
  }

  // Index: metadata only, no file contents (mirrors shadcn's index).
  const index = {
    $schema: schema,
    name: root.name,
    homepage: root.homepage,
    items: items.map((item) => ({
      name: item.name,
      type: item.type,
      title: item.title,
      description: item.description,
      author: item.author,
      dependencies: item.dependencies,
      registryDependencies: item.registryDependencies,
      categories: item.categories,
      environment: item.environment,
      build: item.build,
      checksum: item.checksum,
    })),
  };
  writeFileSync(path.join(opts.outDir, "registry.json"), `${JSON.stringify(index, null, 2)}\n`);

  return items;
}

// CLI entry: build the public registry (registry/ → apps/web/public/r/).
if (import.meta.main) {
  const ROOT = path.resolve(import.meta.dirname, "..");
  const items = await buildRegistry({
    srcDir: path.join(ROOT, "registry"),
    outDir: path.join(ROOT, "apps/web/public/r"),
    signingKey: process.env.CTS_SIGNING_KEY,
  });
  console.log(`✓ Built registry: ${items.length} item(s) → apps/web/public/r/`);
}
