/**
 * Generate `packages/core/src/registry/builtin-items.ts` — a static TS module
 * exporting every slot-filling registry item with its file contents inlined.
 *
 * The engine consumes built-in items at runtime to serve slots that have
 * migrated off Eta. By generating a constant TS array (rather than
 * runtime-reading the registry directory), we get:
 *
 *   - Browser-safe core: web builder imports the same module directly, no
 *     fetch + parse at materialize time.
 *   - npm-publishable CLI: items ship inside the published tarball; nothing
 *     to fetch when `cts create` runs.
 *   - One source of truth: this script scans `registry/<slot>/<variant>/`,
 *     so adding an item is just "drop a folder", run the script.
 *
 * What we DON'T include:
 *
 *   - Add-on items (no `slot` field) — those are served via `cts add`, not
 *     wired into the engine. They keep going through the existing
 *     `apps/web/public/r/*.json` pipeline.
 *   - Items with malformed manifests — Zod validation fails the build so a
 *     broken item never lands in the engine.
 *
 * Run via `bun run build:registry-items`. Also called automatically by
 * `packages/core`'s prebuild — see its `package.json`.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  type PackageRegistryItem,
  PackageRegistryItemSchema,
} from "../packages/schema/src/package-registry";

const ROOT = path.resolve(import.meta.dirname, "..");
const REGISTRY = path.join(ROOT, "registry");
const OUT = path.join(
  ROOT,
  "packages",
  "core",
  "src",
  "registry",
  "builtin-items.ts",
);

/**
 * Slot directories the script walks. Mirrors `PackageSlotSchema` — kept here
 * by hand so a typo doesn't cause a slot to be silently skipped. The walker
 * looks for `<slot>/<variant>/registry-item.json` inside each.
 */
const SLOT_DIRS = [
  "app",
  "auth",
  "db",
  "api",
  "env",
  "email",
  "monitoring",
  "analytics",
  "rate-limit",
  "ai",
  "cache",
  "typescript-config",
  "ui",
];

/**
 * For directory naming we use the literal slot id with one exception:
 * `app` items live under `apps/` (plural) because the registry README
 * already established that convention and renaming back would break the
 * mental "apps/, packages/, …" layout. The walker translates plural → singular
 * slot when reading.
 */
const SLOT_DIR_NAME = (slot: string) => (slot === "app" ? "apps" : slot);

interface BuiltinItem {
  /** Source path on disk — used for error messages. */
  source: string;
  /** Parsed + content-inlined item. */
  item: PackageRegistryItem;
}

function* walkVariants(slot: string): Iterable<string> {
  const slotDir = path.join(REGISTRY, SLOT_DIR_NAME(slot));
  // The script tolerates missing slot directories (early in migration,
  // most are empty) — only existing dirs are walked.
  try {
    for (const entry of new Bun.Glob("*/registry-item.json").scanSync({
      cwd: slotDir,
    })) {
      yield path.join(slotDir, entry);
    }
  } catch {
    /* slot dir doesn't exist yet — fine */
  }
}

function loadItem(manifestPath: string, slot: string): BuiltinItem | null {
  const dir = path.dirname(manifestPath);
  const text = readFileSync(manifestPath, "utf-8").trim();

  // Silently skip incomplete scaffolds — empty file, empty `{}`, or a
  // placeholder manifest the agent hasn't filled in yet. Reduces friction
  // during the back-and-forth between item authoring and engine wiring.
  if (text.length === 0) return null;

  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }

  if (!raw.name || !raw.slot || !raw.variant) {
    return null;
  }

  let parsed: PackageRegistryItem;
  try {
    parsed = PackageRegistryItemSchema.parse(raw);
  } catch (err) {
    // Agent likely mid-authoring — manifest exists but is missing required
    // fields (no `description` yet, etc.). Skip with a one-line warning so
    // the engine never bundles a half-formed item, but don't fail the
    // build. The next run picks it up once the manifest is complete.
    // biome-ignore lint/suspicious/noConsole: build script
    console.warn(
      `  ⊘ skip ${path.relative(ROOT, manifestPath)}: ${(err as Error).message.split("\n")[0]}`,
    );
    return null;
  }

  // Sanity check: directory layout slot must match the manifest's slot.
  // Catches "I copied auth/clerk/ to email/ but forgot to update the
  // manifest" errors early.
  if (parsed.slot !== slot) {
    throw new Error(
      `Slot mismatch at ${path.relative(ROOT, manifestPath)}: manifest says "${parsed.slot}", directory says "${slot}"`,
    );
  }

  // Inline file content from disk. Paths in the manifest are relative to
  // the item directory. Missing source files mean the item is half-authored
  // (manifest written, sources not yet) — skip the whole item silently so
  // the engine never sees a partial scaffold. The agent's next edit lands
  // the missing file and the next build picks it up.
  const files: PackageRegistryItem["files"] = [];
  for (const f of parsed.files) {
    const filePath = path.join(dir, f.path);
    try {
      files.push({ ...f, content: readFileSync(filePath, "utf-8").replace(/\r\n/g, "\n") });
    } catch {
      // biome-ignore lint/suspicious/noConsole: build script
      console.warn(
        `  ⊘ skip ${parsed.name}: missing source ${path.relative(ROOT, filePath)}`,
      );
      return null;
    }
  }

  return {
    source: path.relative(ROOT, manifestPath),
    item: { ...parsed, files },
  };
}

function emit(items: BuiltinItem[]): string {
  const sorted = items.slice().sort((a, b) => a.item.name.localeCompare(b.item.name));
  // biome-ignore-all because the file is generated and JSON.stringify emits
  // quoted keys (`"path"` instead of `path`) which biome's formatter would
  // rewrite. We'd rather not run the formatter on every regen — the file is
  // never read by a human anyway.
  return `/**
 * GENERATED by scripts/build-builtin-items.ts — do not edit by hand.
 *
 * Slot-filling registry items with content inlined, exported as a constant
 * array the engine consumes at materialize time. Add-on items (no \`slot\`)
 * are excluded; they go through \`cts add\` instead.
 *
 * Regenerate by running \`bun run build:registry-items\` from the repo root,
 * or it happens automatically as part of \`packages/core\`'s prebuild.
 */

// biome-ignore-all assist/source/organizeImports: generated
// biome-ignore-all format: generated

import type { PackageRegistryItem } from "@create-turbo-stack/schema";

export const BUILTIN_REGISTRY_ITEMS: ReadonlyArray<PackageRegistryItem> = ${JSON.stringify(
    sorted.map((b) => b.item),
    null,
    2,
  )} as const;

/** Number of items the engine has available. Logged by \`cts doctor\`. */
export const BUILTIN_REGISTRY_ITEM_COUNT = ${sorted.length};
`;
}

function main(): void {
  const items: BuiltinItem[] = [];
  for (const slot of SLOT_DIRS) {
    for (const manifestPath of walkVariants(slot)) {
      const loaded = loadItem(manifestPath, slot);
      if (loaded) items.push(loaded);
    }
  }

  mkdirSync(path.dirname(OUT), { recursive: true });
  writeFileSync(OUT, emit(items));

  const bySlot = items.reduce<Record<string, number>>((acc, it) => {
    const slot = it.item.slot ?? "(none)";
    acc[slot] = (acc[slot] ?? 0) + 1;
    return acc;
  }, {});
  const summary =
    Object.entries(bySlot)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([slot, n]) => `${slot}=${n}`)
      .join(" ") || "(empty)";

  // biome-ignore lint/suspicious/noConsole: build script
  console.log(
    `✓ Built ${items.length} item(s) → ${path.relative(ROOT, OUT)}\n  by slot: ${summary}`,
  );
}

if (import.meta.main) {
  main();
}
