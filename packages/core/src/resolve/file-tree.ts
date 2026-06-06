import type {
  FileTree,
  FileTreeNode,
  PackageRegistryItem,
  Preset,
} from "@create-turbo-stack/schema";
import { resolveAppFiles } from "./app-files";
import { resolveAutoPackages } from "./auto-packages";
import { resolveRootFiles } from "./config-files";
import { resolvePackageFiles } from "./packages";

export interface ResolveOptions {
  /** If true, include file content. If false, only paths (for preview). */
  includeContent: boolean;
  /**
   * Registry items the engine should consult before falling back to Eta.
   * When provided AND a `(slot, variant)` request from
   * `selectRegistryItems(preset)` matches an item here, the registry-first
   * path serves the package; otherwise the existing Eta path runs.
   *
   * The CLI loads bundled built-ins; the web builder fetches from
   * `/r/<name>.json`. Empty by default — Eta serves everything when no
   * items are provided (back-compat for callers that haven't migrated).
   */
  items?: ReadonlyArray<PackageRegistryItem>;
}

/**
 * Main entry point: given a preset, compute the complete file tree.
 */
export function resolveFileTree(
  preset: Preset,
  options: ResolveOptions = { includeContent: true },
): FileTree {
  const nodes: FileTreeNode[] = [];
  const items = options.items ?? [];

  nodes.push(...resolveRootFiles(preset, items));

  const autoPackages = resolveAutoPackages(preset);
  const autoNames = new Set(autoPackages.map((p) => p.name));

  for (const pkg of autoPackages) {
    nodes.push(...resolvePackageFiles(preset, pkg, items));
  }

  for (const pkg of preset.packages) {
    // Skip user packages whose name matches an auto-package: the auto-package
    // owns the registry slot and already emitted files above. This can happen
    // when a user declares a producesCSS package (triggering the "ui" slot)
    // while that same package is also in preset.packages.
    if (autoNames.has(pkg.name)) continue;
    nodes.push(...resolvePackageFiles(preset, pkg, items));
  }

  for (const app of preset.apps) {
    nodes.push(...resolveAppFiles(preset, app, items));
  }

  // Strip content if not needed (preview mode)
  if (!options.includeContent) {
    return {
      projectName: preset.basics.projectName,
      nodes: nodes.map((n) => ({ ...n, content: undefined })),
    };
  }

  return {
    projectName: preset.basics.projectName,
    nodes,
  };
}
