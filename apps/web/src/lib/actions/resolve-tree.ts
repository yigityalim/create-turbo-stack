"use server";

import { resolveFileTree } from "@create-turbo-stack/core";
import type { FileTree, Preset } from "@create-turbo-stack/schema";

export async function resolveTreeAction(preset: Preset): Promise<{
  tree: FileTree | null;
  error: string | null;
}> {
  try {
    const tree = resolveFileTree(preset, { includeContent: true });
    return { tree, error: null };
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to resolve file tree";
    return { tree: null, error: msg };
  }
}
