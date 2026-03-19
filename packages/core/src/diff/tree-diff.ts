import type { FileTreeNode } from "@create-turbo-stack/schema";

export type FileMutation =
  | { type: "insert-line"; after: string | RegExp; content: string }
  | { type: "append-to-json"; jsonPath: string[]; value: unknown }
  | { type: "replace-block"; start: string | RegExp; end: string | RegExp; content: string }
  | { type: "insert-css-source"; directive: string }
  | { type: "overwrite"; content: string };

export interface TreeDiff {
  create: FileTreeNode[];
  update: Array<{ path: string; mutations: FileMutation[] }>;
  unchanged: string[];
}

/**
 * Compare existing files with desired file tree nodes and produce a diff.
 *
 * - Files that don't exist on disk → create
 * - Files that exist with different content → update (with overwrite mutation)
 * - Files that match exactly → unchanged
 */
export function diffTree(
  existingFiles: Map<string, string>,
  desiredNodes: FileTreeNode[],
): TreeDiff {
  const create: FileTreeNode[] = [];
  const update: TreeDiff["update"] = [];
  const unchanged: string[] = [];

  for (const node of desiredNodes) {
    if (node.isDirectory) continue;

    const existing = existingFiles.get(node.path);
    if (existing === undefined) {
      // File doesn't exist on disk
      create.push(node);
    } else if (existing === node.content) {
      // Content matches
      unchanged.push(node.path);
    } else {
      // Content differs — produce smart mutations where possible
      const mutations = computeMutations(existing, node);
      update.push({ path: node.path, mutations });
    }
  }

  return { create, update, unchanged };
}

/**
 * Compute mutations to transform existing content to desired content.
 * Tries JSON merge for .json files, CSS source insertion for .css files.
 * Falls back to overwrite for everything else.
 */
function computeMutations(existing: string, node: FileTreeNode): FileMutation[] {
  const desired = node.content ?? "";

  // JSON files: try to produce append-to-json mutations
  if (node.path.endsWith(".json")) {
    const jsonMutations = computeJsonMutations(existing, desired);
    if (jsonMutations) return jsonMutations;
  }

  // CSS files: detect @source directive additions
  if (node.path.endsWith(".css")) {
    const cssMutations = computeCssMutations(existing, desired);
    if (cssMutations) return cssMutations;
  }

  // Fallback: overwrite
  return [{ type: "overwrite", content: desired }];
}

function computeJsonMutations(existing: string, desired: string): FileMutation[] | null {
  try {
    const existingObj = JSON.parse(existing);
    const desiredObj = JSON.parse(desired);

    const mutations: FileMutation[] = [];

    // Find keys added or changed at root level
    for (const [key, value] of Object.entries(desiredObj)) {
      if (JSON.stringify(existingObj[key]) !== JSON.stringify(value)) {
        mutations.push({
          type: "append-to-json",
          jsonPath: [key],
          value,
        });
      }
    }

    return mutations.length > 0 ? mutations : null;
  } catch {
    return null;
  }
}

function computeCssMutations(existing: string, desired: string): FileMutation[] | null {
  // Extract @source directives from desired that are not in existing
  const existingSources = new Set([...existing.matchAll(/@source\s+"([^"]+)"/g)].map((m) => m[1]));
  const desiredSources = [...desired.matchAll(/@source\s+"([^"]+)"/g)].map((m) => m[1]);

  const newSources = desiredSources.filter((s) => !existingSources.has(s));

  if (newSources.length > 0 && newSources.length === desiredSources.length - existingSources.size) {
    return newSources.map((directive) => ({
      type: "insert-css-source" as const,
      directive: `@source "${directive}";`,
    }));
  }

  return null;
}

/**
 * Apply mutations to existing file content and return the result.
 */
export function applyMutations(content: string, mutations: FileMutation[]): string {
  let result = content;

  for (const mutation of mutations) {
    switch (mutation.type) {
      case "overwrite":
        result = mutation.content;
        break;

      case "insert-line": {
        const pattern =
          typeof mutation.after === "string"
            ? new RegExp(`(${escapeRegExp(mutation.after)}.*)`, "m")
            : mutation.after;
        result = result.replace(pattern, `$1\n${mutation.content}`);
        break;
      }

      case "append-to-json": {
        try {
          const obj = JSON.parse(result);
          setNestedValue(obj, mutation.jsonPath, mutation.value);
          result = JSON.stringify(obj, null, 2);
        } catch {
          // If JSON parsing fails, skip this mutation
        }
        break;
      }

      case "replace-block": {
        const startPattern =
          typeof mutation.start === "string"
            ? new RegExp(escapeRegExp(mutation.start), "m")
            : mutation.start;
        const endPattern =
          typeof mutation.end === "string"
            ? new RegExp(escapeRegExp(mutation.end), "m")
            : mutation.end;

        const startMatch = result.match(startPattern);
        const endMatch = result.match(endPattern);

        if (startMatch?.index !== undefined && endMatch?.index !== undefined) {
          const endIdx = endMatch.index + endMatch[0].length;
          result = result.slice(0, startMatch.index) + mutation.content + result.slice(endIdx);
        }
        break;
      }

      case "insert-css-source": {
        // Insert after the last existing @source line, or after @import block
        const lastSource = result.lastIndexOf("@source");
        if (lastSource !== -1) {
          const lineEnd = result.indexOf("\n", lastSource);
          result = `${result.slice(0, lineEnd + 1)}${mutation.directive}\n${result.slice(lineEnd + 1)}`;
        } else {
          const lastImport = result.lastIndexOf("@import");
          if (lastImport !== -1) {
            const lineEnd = result.indexOf("\n", lastImport);
            result = `${result.slice(0, lineEnd + 1)}\n${mutation.directive}\n${result.slice(lineEnd + 1)}`;
          } else {
            result = `${mutation.directive}\n${result}`;
          }
        }
        break;
      }
    }
  }

  return result;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function setNestedValue(obj: Record<string, unknown>, path: string[], value: unknown): void {
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < path.length - 1; i++) {
    if (typeof current[path[i]] !== "object" || current[path[i]] === null) {
      current[path[i]] = {};
    }
    current = current[path[i]] as Record<string, unknown>;
  }
  current[path[path.length - 1]] = value;
}
