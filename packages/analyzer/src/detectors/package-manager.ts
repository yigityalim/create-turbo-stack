import path from "node:path";
import type { Detection } from "../types";
import { fileExists } from "../utils/file-scanner";

export async function detectPackageManager(root: string): Promise<Detection<string>> {
  if (await fileExists(path.join(root, "bun.lock"))) {
    return { value: "bun", confidence: "certain", reason: "bun.lock found" };
  }
  if (await fileExists(path.join(root, "bun.lockb"))) {
    return { value: "bun", confidence: "certain", reason: "bun.lockb found" };
  }
  if (await fileExists(path.join(root, "pnpm-lock.yaml"))) {
    return { value: "pnpm", confidence: "certain", reason: "pnpm-lock.yaml found" };
  }
  if (await fileExists(path.join(root, "yarn.lock"))) {
    return { value: "yarn", confidence: "certain", reason: "yarn.lock found" };
  }
  if (await fileExists(path.join(root, "package-lock.json"))) {
    return { value: "npm", confidence: "certain", reason: "package-lock.json found" };
  }
  return { value: "bun", confidence: "low", reason: "No lockfile found, defaulting to bun" };
}
