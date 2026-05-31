"use server";

import {
  BUILTIN_REGISTRY_ITEMS,
  resolveFileTree,
} from "@create-turbo-stack/core";
import type { FileTree, Preset } from "@create-turbo-stack/schema";

export async function resolveTreeAction(preset: Preset): Promise<{
  tree: FileTree | null;
  error: string | null;
}> {
  try {
    // Pass the bundled registry items so the preview reflects what `cts
    // create` will actually produce — every slot with a shipped item
    // materializes through the registry path; Eta serves the rest.
    const tree = resolveFileTree(preset, {
      includeContent: true,
      items: BUILTIN_REGISTRY_ITEMS,
    });
    return { tree, error: null };
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to resolve file tree";
    return { tree: null, error: msg };
  }
}
