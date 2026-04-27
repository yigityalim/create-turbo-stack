import fs from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { type UserConfig, UserConfigSchema } from "@create-turbo-stack/schema";

export const USER_CONFIG_FILENAME = "create-turbo-stack.json";

/**
 * Optional global config — `~/.create-turbo-stack/config.json`. Same
 * shape as the project-level file. Useful for "always use my org's
 * scope" type preferences. Project config wins on overlap.
 */
const GLOBAL_CONFIG_PATH = path.join(homedir(), ".create-turbo-stack", "config.json");

export interface LoadedUserConfig {
  /** Absolute path to the file we found and loaded. */
  filePath: string;
  /** Validated config contents. */
  config: UserConfig;
}

/**
 * Walk up from `startDir` looking for `create-turbo-stack.json`.
 * Stops at the filesystem root. Returns the first file found, or null.
 *
 * Mirrors the resolution strategy of every popular JS tool
 * (eslint, prettier, biome, drizzle, ...).
 */
export async function findUserConfigFile(startDir: string): Promise<string | null> {
  let current = path.resolve(startDir);
  while (true) {
    const candidate = path.join(current, USER_CONFIG_FILENAME);
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // not here, walk up
    }
    const parent = path.dirname(current);
    if (parent === current) return null; // reached fs root
    current = parent;
  }
}

/**
 * Find and load the nearest `create-turbo-stack.json`, merged with an
 * optional global `~/.create-turbo-stack/config.json`. Project values
 * win on overlap; the global file is for "always use my org's scope"
 * type preferences and is never required.
 *
 * Returns null if neither file exists. Throws on malformed JSON or
 * schema violations — silent failure would mask user intent.
 */
export async function loadUserConfig(startDir: string): Promise<LoadedUserConfig | null> {
  const globalConfig = await readConfigFile(GLOBAL_CONFIG_PATH, { optional: true });
  const projectPath = await findUserConfigFile(startDir);
  const projectConfig = projectPath ? await readConfigFile(projectPath, { optional: false }) : null;

  if (!globalConfig && !projectConfig) return null;

  const merged = mergeConfigs(globalConfig, projectConfig);
  // The project file is the "primary" source for reporting; fall back
  // to the global path so the user sees which file was loaded.
  return { filePath: projectPath ?? GLOBAL_CONFIG_PATH, config: merged };
}

async function readConfigFile(
  filePath: string,
  { optional }: { optional: boolean },
): Promise<UserConfig | null> {
  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf-8");
  } catch (err) {
    if (optional && (err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw new Error(`Failed to read ${filePath}: ${(err as Error).message}`);
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    throw new Error(`${filePath} is not valid JSON: ${(err as Error).message}`);
  }

  const result = UserConfigSchema.safeParse(json);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join(".") || "<root>"}: ${i.message}`)
      .join("\n");
    throw new Error(`${filePath} fails schema validation:\n${issues}`);
  }
  return result.data;
}

/**
 * Two-level merge: project overrides global at the top-level key
 * (`defaults`, `policy`, `plugins`). For `defaults` we go one level
 * deeper (`defaults.basics`, `defaults.css`, ...) so a user's global
 * `basics.scope` is preserved when a project only sets `basics.linter`.
 *
 * Plugin lists from both sources are concatenated and de-duplicated.
 */
function mergeConfigs(base: UserConfig | null, override: UserConfig | null): UserConfig {
  if (!base) return override ?? {};
  if (!override) return base;

  const merged: UserConfig = {
    ...base,
    ...override,
  };

  if (base.defaults || override.defaults) {
    const defaults: NonNullable<UserConfig["defaults"]> = {};
    const baseD = base.defaults ?? {};
    const overD = override.defaults ?? {};
    for (const key of new Set([...Object.keys(baseD), ...Object.keys(overD)])) {
      const k = key as keyof typeof defaults;
      defaults[k] = { ...(baseD[k] ?? {}), ...(overD[k] ?? {}) } as never;
    }
    merged.defaults = defaults;
  }

  if (base.policy || override.policy) {
    merged.policy = {
      allow: { ...base.policy?.allow, ...override.policy?.allow },
      forbid: { ...base.policy?.forbid, ...override.policy?.forbid },
      require: { ...base.policy?.require, ...override.policy?.require },
    };
  }

  if (base.plugins || override.plugins) {
    merged.plugins = Array.from(new Set([...(base.plugins ?? []), ...(override.plugins ?? [])]));
  }

  return merged;
}
