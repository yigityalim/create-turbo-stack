/**
 * Build the CTS package registry.
 *
 * Reads the authored `registry/registry.json` (items reference real files by
 * path), inlines each file's content, and writes the served registry:
 *   - apps/web/public/r/<name>.json   — full item, file contents inlined
 *   - apps/web/public/r/registry.json — index (metadata, no file contents)
 *
 * `registry.json` may `include` other registry / single-item JSON files, so a
 * registry with 100+ packages keeps one item per file instead of one giant
 * `items` array. Includes are resolved recursively and merged (name conflicts
 * error out).
 *
 * `cts add <name>` consumes the per-item JSON. Same producer/consumer split
 * as `.eta → templates-map`. Run: `bun run build:registry`.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  type PackageRegistryItem,
  PackageRegistryItemSchema,
  PackageRegistrySchema,
} from "../packages/schema/src/package-registry";

const ROOT = path.resolve(import.meta.dirname, "..");
const REGISTRY_DIR = path.join(ROOT, "registry");
const OUT_DIR = path.join(ROOT, "apps/web/public/r");

/**
 * Resolve a registry file plus everything it `include`s into a flat,
 * name-deduped item list. `dir` is the directory the file lives in, so its
 * `include` / `files` paths resolve relative to it.
 */
function collectItems(file: string, into: Map<string, PackageRegistryItem>): string | undefined {
  const dir = path.dirname(file);
  const raw = JSON.parse(readFileSync(file, "utf-8"));

  // A single-item file (registry-item.json style) has no `items`/`include`.
  if (!Array.isArray(raw.items) && !Array.isArray(raw.include)) {
    const item = PackageRegistryItemSchema.parse(raw);
    addItem(item, dir, into);
    return undefined;
  }

  const registry = PackageRegistrySchema.parse(raw);
  for (const inc of registry.include) {
    collectItems(path.resolve(dir, inc), into);
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

const root = PackageRegistrySchema.parse(
  JSON.parse(readFileSync(path.join(REGISTRY_DIR, "registry.json"), "utf-8")),
);
const collected = new Map<string, PackageRegistryItem>();
const schema = collectItems(path.join(REGISTRY_DIR, "registry.json"), collected);
const items = [...collected.values()].sort((a, b) => a.name.localeCompare(b.name));

mkdirSync(OUT_DIR, { recursive: true });

// Per-item JSON: file contents already inlined by collectItems.
for (const item of items) {
  const built = { $schema: schema, ...item };
  writeFileSync(path.join(OUT_DIR, `${item.name}.json`), `${JSON.stringify(built, null, 2)}\n`);
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
  })),
};
writeFileSync(path.join(OUT_DIR, "registry.json"), `${JSON.stringify(index, null, 2)}\n`);

console.log(`✓ Built registry: ${items.length} item(s) → ${path.relative(ROOT, OUT_DIR)}/`);
