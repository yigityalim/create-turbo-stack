// Shared MCP context: project root, mutex, mtime-keyed cache,
// non-interactive applyDiff. Tools/resources never read `process.cwd()`.

import fs from "node:fs/promises";
import path from "node:path";
import type { Preset, TurboStackConfig, ValidatedPreset } from "@create-turbo-stack/schema";
import { ValidatedPresetSchema } from "@create-turbo-stack/schema";
import { type ApplyDiffOptions, applyDiff as runApplyDiff } from "../io/apply-diff";
import { readProjectConfig } from "../io/reader";

export interface McpContext {
  /**
   * Absolute path to the user's monorepo root. Resolved once at server
   * startup; tools must NOT call `process.cwd()` because Claude Desktop
   * et al. spawn the server from the client's working directory, not
   * the project's.
   */
  projectRoot: string;
  /** Read .turbo-stack.json from `projectRoot`. */
  readConfig(): Promise<TurboStackConfig | null>;
  /** Mutating tools call this; serialises against itself. */
  withMutation<T>(fn: () => Promise<T>): Promise<T>;
  /** Apply a preset change with non-interactive conflict handling. */
  applyDiff(oldPreset: Preset, newPreset: Preset, options?: ApplyDiffOptions): Promise<void>;
  /** Used by resources for cheap read-through caching. */
  cache: McpResourceCache;
}

export interface McpResourceCache {
  /**
   * Read `.turbo-stack.json` once per mtime change. Keys the cache on
   * the file's mtimeMs so manual edits invalidate automatically.
   */
  getConfigCached(): Promise<TurboStackConfig | null>;
  /** Force the next read to skip the cache (called after mutations). */
  invalidate(): void;
}

// Resolution order: TURBO_STACK_ROOT env > cwd, walking up to find
// `.turbo-stack.json`. Critical because Claude Desktop spawns the
// server from the client's cwd, not the user's project.
export async function resolveProjectRoot(): Promise<string> {
  const envRoot = process.env.TURBO_STACK_ROOT;
  const base = envRoot ? path.resolve(envRoot) : process.cwd();
  return findProjectRoot(base);
}

async function findProjectRoot(start: string): Promise<string> {
  let current = path.resolve(start);
  while (true) {
    const candidate = path.join(current, ".turbo-stack.json");
    try {
      await fs.access(candidate);
      return current;
    } catch {
      // not here, walk up
    }
    const parent = path.dirname(current);
    if (parent === current) return start; // reached fs root, stick with the original base
    current = parent;
  }
}

export function createContext(projectRoot: string): McpContext {
  // Promise queue acting as a single-slot mutex. MCP tool calls aren't
  // guaranteed to be sequential, and we don't want two add_app calls
  // racing each other to read-modify-write `.turbo-stack.json`.
  let chain: Promise<unknown> = Promise.resolve();
  const withMutation = <T>(fn: () => Promise<T>): Promise<T> => {
    const next = chain.then(fn);
    chain = next.catch(() => undefined);
    return next;
  };

  const cache = createResourceCache(projectRoot);

  return {
    projectRoot,
    readConfig: () => readProjectConfig(projectRoot),
    withMutation,
    applyDiff: async (oldPreset, newPreset, options) => {
      try {
        await runApplyDiff(projectRoot, oldPreset, newPreset, {
          // MCP runs over stdio; an interactive prompt would deadlock
          // the transport, so we default to keeping user edits.
          onConflict: "skip",
          ...options,
        });
      } finally {
        cache.invalidate();
      }
    },
    cache,
  };
}

function createResourceCache(projectRoot: string): McpResourceCache {
  let cached: { mtimeMs: number; config: TurboStackConfig | null } | null = null;
  const configPath = path.join(projectRoot, ".turbo-stack.json");

  return {
    async getConfigCached() {
      let mtimeMs: number;
      try {
        const stat = await fs.stat(configPath);
        mtimeMs = stat.mtimeMs;
      } catch {
        cached = null;
        return null;
      }
      if (cached && cached.mtimeMs === mtimeMs) return cached.config;
      const config = await readProjectConfig(projectRoot);
      cached = { mtimeMs, config };
      return config;
    },
    invalidate() {
      cached = null;
    },
  };
}

/**
 * Tool boilerplate: read config, validate the candidate preset, hand
 * off to applyDiff. Returns an MCP-shaped text response either way.
 *
 * The tool body shrinks to: produce `(config) => updatedPreset`. All
 * the validation/error/response wiring lives here, in one place.
 */
export async function withConfig(
  ctx: McpContext,
  build: (
    config: TurboStackConfig,
  ) => Promise<{ preset: Preset; success: string } | { error: string }>,
): Promise<{ content: { type: "text"; text: string }[] }> {
  return ctx.withMutation(async () => {
    const config = await ctx.readConfig();
    if (!config) return textResponse(`Error: No .turbo-stack.json found at ${ctx.projectRoot}`);

    const built = await build(config);
    if ("error" in built) return textResponse(`Error: ${built.error}`);

    const result = ValidatedPresetSchema.safeParse(built.preset);
    if (!result.success) {
      return textResponse(
        `Validation error: ${result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
      );
    }

    await ctx.applyDiff(config as Preset, result.data as ValidatedPreset);
    return textResponse(built.success);
  });
}

export function textResponse(text: string): { content: { type: "text"; text: string }[] } {
  return { content: [{ type: "text" as const, text }] };
}
