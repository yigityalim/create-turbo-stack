export interface FileTreeNode {
  /** Relative path from project root, e.g. "packages/ui/src/index.ts" */
  path: string;
  /** File content after template rendering. Undefined for directories. */
  content?: string;
  /** Whether this is a directory node */
  isDirectory: boolean;
  /** Template key used to generate this file (for debugging) */
  templateKey?: string;
  /** Metadata for wiring */
  meta?: Record<string, unknown>;
}

export interface FileTree {
  /** Project root name */
  projectName: string;
  /** All nodes, flat list */
  nodes: FileTreeNode[];
}

export interface RenderedFile {
  /** Relative path from project root */
  path: string;
  /** Final file content */
  content: string;
}
