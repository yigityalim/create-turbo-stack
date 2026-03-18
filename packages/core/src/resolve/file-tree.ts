import type { Preset } from "@create-turbo-stack/schema";
import type { FileTree } from "@create-turbo-stack/schema";

export interface ResolveOptions {
  /** If true, include file content (rendered templates). If false, only paths. */
  includeContent: boolean;
}

export function resolveFileTree(
  preset: Preset,
  _options: ResolveOptions = { includeContent: true },
): FileTree {
  // TODO: Phase 1 implementation
  return {
    projectName: preset.basics.projectName,
    nodes: [],
  };
}
