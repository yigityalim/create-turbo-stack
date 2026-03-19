import path from "node:path";
import type { Detection } from "../types";
import { readJsonFile } from "../utils/file-scanner";

type TsConfig = {
  compilerOptions?: {
    strict?: boolean;
    noUncheckedIndexedAccess?: boolean;
    strictNullChecks?: boolean;
  };
};

export async function detectTypescript(root: string): Promise<Detection<string>> {
  const tsconfig = await readJsonFile<TsConfig>(path.join(root, "tsconfig.json"));

  if (!tsconfig) {
    return {
      value: "strict",
      confidence: "low",
      reason: "No tsconfig.json found, defaulting to strict",
    };
  }

  const opts = tsconfig.compilerOptions;
  if (opts?.strict === true) {
    return { value: "strict", confidence: "certain", reason: "strict: true in tsconfig.json" };
  }
  if (opts?.strict === false) {
    return { value: "relaxed", confidence: "certain", reason: "strict: false in tsconfig.json" };
  }

  // If strict is not set but strictNullChecks is true, likely strict-ish
  if (opts?.strictNullChecks === true) {
    return { value: "strict", confidence: "high", reason: "strictNullChecks: true" };
  }

  return { value: "relaxed", confidence: "medium", reason: "strict not explicitly set" };
}
