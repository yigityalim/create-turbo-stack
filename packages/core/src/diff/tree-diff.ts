import type { FileTreeNode } from "@create-turbo-stack/schema";

export type FileMutation =
  | { type: "insert-line"; after: string | RegExp; content: string }
  | { type: "append-to-json"; jsonPath: string[]; value: unknown }
  | { type: "replace-block"; start: string | RegExp; end: string | RegExp; content: string }
  | { type: "insert-css-source"; directive: string };

export interface TreeDiff {
  create: FileTreeNode[];
  update: Array<{ path: string; mutations: FileMutation[] }>;
  unchanged: string[];
}

export function diffTree(
  _existingFiles: Map<string, string>,
  _desiredNodes: FileTreeNode[],
): TreeDiff {
  // TODO: Phase 2 implementation
  return { create: [], update: [], unchanged: [] };
}
