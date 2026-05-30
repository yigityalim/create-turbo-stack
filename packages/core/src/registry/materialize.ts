/**
 * Materialize a registry item into FileTreeNodes.
 *
 * A registry item declares which files it ships (`item.files`) and how each
 * one should be written (`type` + optional `target`). This function:
 *
 *   1. Reads each file's `content`, runs it through the substituter so
 *      `{{scope}}` etc. become real values.
 *   2. Computes the final write path:
 *        - `type: "registry:source"` → `<pkgRoot>/<file.path>` where
 *          `pkgRoot` is `packages/<name>/` (or `apps/<name>/` for app slots).
 *        - `type: "registry:file"` → `file.target` (literal path from
 *          project root), still substituted so a target can include
 *          `{{pkg-name}}` if it wants.
 *   3. Emits one `FileTreeNode` per file. Directories are NOT emitted —
 *      they fall out of the path implicitly when the writer walks them.
 *
 * The function is intentionally pure: same inputs → same outputs, no I/O,
 * no order dependency. It's the leaf piece of the registry-first
 * pipeline; selection (which items to materialize for a given preset) and
 * wiring (catalog, workspace refs) live elsewhere.
 *
 * Browser-safe — only depends on the substituter, which is itself pure.
 */

import type { FileTreeNode, PackageRegistryItem } from "@create-turbo-stack/schema";
import { type SubstitutionContext, substituteRegistryItem } from "./substitute.js";

export interface MaterializeContext extends SubstitutionContext {
  /**
   * The directory the package lands at, relative to the project root, with
   * NO trailing slash. e.g. `"packages/env"` for an `env` package at the
   * default location, or `"tooling/env"` if the user relocated it, or
   * `"apps/web"` for an app slot.
   *
   * Callers compute this from `packageDirOf` / `appDirOf` (see
   * `packages/core/src/utils/package-path.ts`) before calling. Keeping it
   * an explicit input means this function doesn't have to know about the
   * preset's relocation rules — those stay in the resolver.
   */
  pkgRoot: string;
}

export interface MaterializeOptions {
  /**
   * When `true`, files with missing `content` (typical for raw authoring
   * items that haven't been through `build:registry`) throw. When `false`
   * they're skipped with a warning-suitable diagnostic in the result. The
   * resolver passes `true` because a missing file is a packaging bug; tests
   * may want the soft path.
   *
   * Default: `true`.
   */
  strict?: boolean;
}

export interface MaterializeDiagnostic {
  path: string;
  reason: "missing-content";
}

export interface MaterializeResult {
  nodes: FileTreeNode[];
  diagnostics: MaterializeDiagnostic[];
}

/**
 * Take an item + a context and return the FileTreeNodes that should land
 * in the user's project. The caller is responsible for merging these into
 * the larger FileTree the resolver builds — no global state is touched
 * here.
 */
export function materializeRegistryItem(
  item: PackageRegistryItem,
  ctx: MaterializeContext,
  options: MaterializeOptions = {},
): MaterializeResult {
  const strict = options.strict ?? true;
  const nodes: FileTreeNode[] = [];
  const diagnostics: MaterializeDiagnostic[] = [];

  for (const file of item.files) {
    const writePath = computeWritePath(file, ctx);

    if (file.content == null) {
      if (strict) {
        throw new Error(
          `Registry item "${item.name}" file "${file.path}" has no inlined content. ` +
            `Either run \`build:registry\` to inline it, or call materializeRegistryItem with { strict: false }.`,
        );
      }
      diagnostics.push({ path: writePath, reason: "missing-content" });
      continue;
    }

    nodes.push({
      path: writePath,
      content: substituteRegistryItem(file.content, ctx),
      isDirectory: false,
      // `templateKey` traces back to the source — useful when debugging
      // why a particular file looks the way it does in the output.
      templateKey: `registry:${item.name}:${file.path}`,
    });
  }

  return { nodes, diagnostics };
}

/**
 * Compute the final write path for a single registry file. Targets are
 * themselves substitutable so authors can write
 * `target: "apps/{{pkg-name}}/next.config.ts"` when they need to.
 */
function computeWritePath(
  file: PackageRegistryItem["files"][number],
  ctx: MaterializeContext,
): string {
  // Honour explicit `target` first — that's the escape hatch for files
  // that don't sit inside the package's own root (Next.js `next.config.ts`,
  // root `.env.example`, …). Substitute it too so authors can templatize.
  if (file.target != null && file.target !== file.path) {
    return substituteRegistryItem(file.target, ctx);
  }
  // Default: write the source path under the package root.
  return `${ctx.pkgRoot}/${file.path}`;
}
