/**
 * Build the CTS package registry.
 *
 * Reads the authored `registry/registry.json` (items reference real files by
 * path), inlines each file's content, and writes the served registry:
 *   - apps/web/public/r/<name>.json   — full item, file contents inlined
 *   - apps/web/public/r/registry.json — index (metadata, no file contents)
 *
 * `cts add <name>` consumes the per-item JSON. Same producer/consumer split
 * as `.eta → templates-map`. Run: `bun run build:registry`.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PackageRegistrySchema } from "../packages/schema/src/package-registry";

const ROOT = path.resolve(import.meta.dirname, "..");
const REGISTRY_DIR = path.join(ROOT, "registry");
const OUT_DIR = path.join(ROOT, "apps/web/public/r");

const source = PackageRegistrySchema.parse(
  JSON.parse(readFileSync(path.join(REGISTRY_DIR, "registry.json"), "utf-8")),
);

mkdirSync(OUT_DIR, { recursive: true });

// Per-item JSON: inline each file's content from disk.
for (const item of source.items) {
  const files = item.files.map((file) => ({
    ...file,
    content: readFileSync(path.join(REGISTRY_DIR, file.path), "utf-8"),
  }));
  const built = { $schema: source.$schema, ...item, files };
  writeFileSync(path.join(OUT_DIR, `${item.name}.json`), `${JSON.stringify(built, null, 2)}\n`);
}

// Index: metadata + file targets, no contents (mirrors shadcn's index).
const index = {
  $schema: source.$schema,
  name: source.name,
  homepage: source.homepage,
  items: source.items.map((item) => ({
    name: item.name,
    type: item.type,
    title: item.title,
    description: item.description,
    author: item.author,
    dependencies: item.dependencies,
    registryDependencies: item.registryDependencies,
    build: item.build,
  })),
};
writeFileSync(path.join(OUT_DIR, "registry.json"), `${JSON.stringify(index, null, 2)}\n`);

console.log(`✓ Built registry: ${source.items.length} item(s) → ${path.relative(ROOT, OUT_DIR)}/`);
