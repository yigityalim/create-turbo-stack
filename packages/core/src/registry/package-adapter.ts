/**
 * Adapter: turn a `PackageRegistryItem` into the same FileTreeNode shape the
 * Eta-driven resolvers produce. Glues two halves together:
 *
 *   1. The "rules" half — package.json with catalog deps + workspace refs,
 *      tsconfig.json + linter configs — comes from the existing
 *      `makeBasePackageFiles` helper. This is unchanged from the Eta path.
 *   2. The "content" half — `src/index.ts`, `src/server.ts`, etc. — comes
 *      from the registry item's `files`, run through the substituter.
 *
 * The output is BYTE-EQUIVALENT to what the Eta resolver would produce for
 * the same package, provided the registry item's source files contain the
 * same content as the matching `.eta` files (post-substitution). That's
 * the contract a migration from Eta to registry has to satisfy.
 *
 * Items WITHOUT a matching `(slot, variant)` request fall through — this
 * function is best used inside a try-registry-first-then-Eta dispatch, not
 * standalone.
 */

import type {
  FileTreeNode,
  Package,
  PackageRegistryItem,
  Preset,
} from "@create-turbo-stack/schema";
import { makeBasePackageFiles } from "../resolve/packages/base.js";
import { materializeRegistryItem } from "./materialize.js";
import { parseDep } from "./parse-dep.js";

/**
 * Materialize a registry item into the file set of a single auto-package.
 * `pkg` here is the engine's view of the package (name, location, …) — NOT
 * the item itself. Items are slot/variant-keyed; packages are name-keyed.
 */
export function materializeAsAutoPackage(
  preset: Preset,
  pkg: Package,
  base: string,
  item: PackageRegistryItem,
): FileTreeNode[] {
  // Build the dependency record the engine's package.json emitter expects.
  // Item deps are bare specs ("zod" / "zod@^4.0.0"); we strip the version
  // because workspace packages reference the catalog (the catalog itself is
  // what pins versions across the monorepo — items declare WHICH packages,
  // the catalog says WHICH version).
  const deps: Record<string, string> = {};
  for (const dep of item.dependencies) {
    deps[parseDep(dep).name] = "catalog:";
  }
  // Sibling registry packages → workspace refs. The item's source uses
  // `{{scope}}/<sibling>` and gets rewritten by the substituter; the
  // package.json gets `"@<scope>/<sibling>": "workspace:*"` here.
  for (const ref of item.registryDependencies) {
    const sibling = ref.startsWith("@") ? ref.slice(1).split("/")[0] : ref;
    deps[`${preset.basics.scope}/${sibling}`] = "workspace:*";
  }

  // Use the item's declared exports if present — the auto-package stub
  // always has `exports: ["."]` which resolves to a TypeScript source path,
  // which is wrong for JSON-only packages like typescript-config.
  const pkgWithExports: Package = item.exports.length ? { ...pkg, exports: item.exports } : pkg;

  // makeBasePackageFiles owns package.json + tsconfig.json + linter configs.
  // It's the "rules" half: catalog merging, workspace refs, tsconfig
  // inheritance. Unchanged from the Eta path — this is the layer we
  // deliberately keep when migrating.
  const baseFiles = makeBasePackageFiles(preset, pkgWithExports, base, deps);

  // Item content goes through the closed-vocabulary substituter and lands
  // under `<base>/<file.path>` (or the file's explicit `target`).
  const itemResult = materializeRegistryItem(item, {
    scope: preset.basics.scope,
    pkgName: pkg.name,
    pm: preset.basics.packageManager,
    pkgRoot: base,
  });

  return [...baseFiles, ...itemResult.nodes];
}
