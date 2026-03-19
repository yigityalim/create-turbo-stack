import fs from "node:fs/promises";
import path from "node:path";
import type { TurboStackConfig } from "@create-turbo-stack/schema";

/**
 * Read the .turbo-stack.json config from the project root.
 * Returns null if the file doesn't exist.
 */
export async function readProjectConfig(dir: string): Promise<TurboStackConfig | null> {
  const configPath = path.join(dir, ".turbo-stack.json");
  try {
    const content = await fs.readFile(configPath, "utf-8");
    return JSON.parse(content) as TurboStackConfig;
  } catch (err) {
    if (isNodeError(err) && err.code === "ENOENT") return null;
    throw err; // Re-throw unexpected errors (permission denied, parse error, etc.)
  }
}

/**
 * Write the .turbo-stack.json config to the project root.
 */
export async function writeProjectConfig(dir: string, config: TurboStackConfig): Promise<void> {
  const configPath = path.join(dir, ".turbo-stack.json");
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), "utf-8");
}

/**
 * Read existing file contents from disk for diff computation.
 * Returns a Map<relativePath, content>.
 */
export async function readExistingFiles(
  dir: string,
  paths: string[],
): Promise<Map<string, string>> {
  const files = new Map<string, string>();

  for (const relPath of paths) {
    const fullPath = path.join(dir, relPath);
    try {
      const content = await fs.readFile(fullPath, "utf-8");
      files.set(relPath, content);
    } catch (err) {
      if (
        isNodeError(err) &&
        (err.code === "ENOENT" || err.code === "EACCES" || err.code === "EISDIR")
      ) {
        continue; // Skip missing, unreadable, or directory entries
      }
      throw err;
    }
  }

  return files;
}

function isNodeError(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && "code" in err;
}
