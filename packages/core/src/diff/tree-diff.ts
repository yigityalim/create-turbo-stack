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
  /**
   * Files where disk content diverges from what the *previous* preset
   * would have produced — i.e. the user hand-edited the file after the
   * last scaffold. Populated only when `options.previousNodes` is given.
   *
   * The CLI surfaces these to the user before any overwrite. With
   * `previousNodes` absent, divergence cannot be distinguished from
   * legitimate updates and everything goes into `update` (legacy
   * behaviour, kept for callers that don't track preset history).
   */
  conflict: Array<{ path: string; mutations: FileMutation[]; userContent: string }>;
  unchanged: string[];
  delete: string[];
}

export interface DiffOptions {
  /**
   * The file tree produced by the *previous* preset state. When provided,
   * `diffTree` populates `delete` with paths that existed previously but
   * are absent from `desiredNodes`. This is what enables `remove app`,
   * provider switches, and any other shrinking operation.
   *
   * Without this, `delete` is always empty (legacy add-only behaviour).
   */
  previousNodes?: FileTreeNode[];
}

/**
 * Compare existing files with desired file tree nodes and produce a diff.
 *
 * - In `desired`, missing on disk → create
 * - In `desired`, present on disk, content matches → unchanged
 * - In `desired`, present on disk, content differs → update
 * - In `previousNodes` but absent from `desired` → delete (requires options.previousNodes)
 */
export function diffTree(
  existingFiles: Map<string, string>,
  desiredNodes: FileTreeNode[],
  options: DiffOptions = {},
): TreeDiff {
  const create: FileTreeNode[] = [];
  const update: TreeDiff["update"] = [];
  const conflict: TreeDiff["conflict"] = [];
  const unchanged: string[] = [];
  const deletePaths: string[] = [];

  // Index of what *we* wrote last time (if caller is tracking history).
  const previousByPath = new Map<string, string>();
  if (options.previousNodes) {
    for (const n of options.previousNodes) {
      if (n.isDirectory) continue;
      if (typeof n.content === "string") previousByPath.set(n.path, n.content);
    }
  }

  for (const node of desiredNodes) {
    if (node.isDirectory) continue;

    const existing = existingFiles.get(node.path);
    if (existing === undefined) {
      create.push(node);
      continue;
    }
    if (existing === node.content) {
      unchanged.push(node.path);
      continue;
    }

    const mutations = computeMutations(existing, node);

    // Decide: clean update or user-touched conflict.
    // - Without previousNodes we can't tell — preserve legacy behaviour (update).
    // - With previousNodes: disk matches what we last wrote → safe update.
    //                      otherwise → user has edited the file → conflict.
    if (options.previousNodes) {
      const previousContent = previousByPath.get(node.path);
      const isOurs = previousContent !== undefined && previousContent === existing;
      if (isOurs) {
        update.push({ path: node.path, mutations });
      } else {
        conflict.push({ path: node.path, mutations, userContent: existing });
      }
    } else {
      update.push({ path: node.path, mutations });
    }
  }

  if (options.previousNodes) {
    const desiredPaths = new Set(desiredNodes.filter((n) => !n.isDirectory).map((n) => n.path));
    for (const prev of options.previousNodes) {
      if (prev.isDirectory) continue;
      if (desiredPaths.has(prev.path)) continue;
      deletePaths.push(prev.path);
    }
  }

  return { create, update, conflict, unchanged, delete: deletePaths };
}

/**
 * Compute mutations to transform existing content to desired content.
 * Tries JSON merge for .json files, CSS source insertion for .css files.
 * Falls back to overwrite for everything else.
 */
function computeMutations(existing: string, node: FileTreeNode): FileMutation[] {
  const desired = node.content ?? "";

  if (node.path.endsWith(".json")) {
    const jsonMutations = computeJsonMutations(existing, desired);
    if (jsonMutations) return jsonMutations;
  }

  if (node.path.endsWith(".css")) {
    const cssMutations = computeCssMutations(existing, desired);
    if (cssMutations) return cssMutations;
  }

  return [{ type: "overwrite", content: desired }];
}

/**
 * Recursive JSON diff. Walks the *desired* tree and emits one
 * `append-to-json` mutation per primitive / array leaf that differs from
 * the existing tree. Keys present in `existing` but absent from `desired`
 * are left untouched — this preserves user-authored additions
 * (custom package.json scripts, extra tsconfig paths, ad-hoc keys, etc.)
 * across `add` / provider switches.
 */
function computeJsonMutations(existing: string, desired: string): FileMutation[] | null {
  try {
    const existingObj = JSON.parse(existing);
    const desiredObj = JSON.parse(desired);

    // If either side is a primitive or array, fall back to whole-file overwrite.
    if (
      existingObj === null ||
      desiredObj === null ||
      typeof existingObj !== "object" ||
      typeof desiredObj !== "object" ||
      Array.isArray(existingObj) ||
      Array.isArray(desiredObj)
    ) {
      return null;
    }

    const mutations: FileMutation[] = [];
    walkJson(existingObj, desiredObj, [], mutations);
    return mutations.length > 0 ? mutations : null;
  } catch {
    return null;
  }
}

function walkJson(
  existing: unknown,
  desired: unknown,
  path: string[],
  mutations: FileMutation[],
): void {
  // Treat arrays and primitives as leaves — replace whole.
  const isPlainObject = (v: unknown): v is Record<string, unknown> =>
    v !== null && typeof v === "object" && !Array.isArray(v);

  if (!isPlainObject(desired)) {
    if (JSON.stringify(existing) !== JSON.stringify(desired)) {
      mutations.push({ type: "append-to-json", jsonPath: path, value: desired });
    }
    return;
  }

  for (const [key, value] of Object.entries(desired)) {
    const existingValue = isPlainObject(existing) ? existing[key] : undefined;
    walkJson(existingValue, value, [...path, key], mutations);
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
  if (path.length === 0) return; // root replacement isn't expressible as a path mutation
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < path.length - 1; i++) {
    if (typeof current[path[i]] !== "object" || current[path[i]] === null) {
      current[path[i]] = {};
    }
    current = current[path[i]] as Record<string, unknown>;
  }
  current[path[path.length - 1]] = value;
}
