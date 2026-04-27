import type { FileTree, FileTreeNode, Preset } from "@create-turbo-stack/schema";
import { resolveAppFiles } from "./app-files";
import { resolveAutoPackages } from "./auto-packages";
import { resolveRootFiles } from "./config-files";
import { resolvePackageFiles } from "./package-files";

export interface ResolveOptions {
  /** If true, include file content. If false, only paths (for preview). */
  includeContent: boolean;
}

/**
 * Main entry point: given a preset, compute the complete file tree.
 */
export function resolveFileTree(
  preset: Preset,
  options: ResolveOptions = { includeContent: true },
): FileTree {
  const nodes: FileTreeNode[] = [];

  nodes.push(...resolveRootFiles(preset));

  const autoPackages = resolveAutoPackages(preset);
  for (const pkg of autoPackages) {
    nodes.push(...resolvePackageFiles(preset, pkg));
  }

  for (const pkg of preset.packages) {
    nodes.push(...resolvePackageFiles(preset, pkg));
  }

  for (const app of preset.apps) {
    nodes.push(...resolveAppFiles(preset, app));
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
