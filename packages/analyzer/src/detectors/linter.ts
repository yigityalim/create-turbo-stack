import path from "node:path";
import type { Detection } from "../types";
import { hasDep, readPackageJson } from "../utils/dep-scanner";
import { fileExists } from "../utils/file-scanner";

export async function detectLinter(root: string): Promise<Detection<string>> {
  for (const biomeFile of ["biome.json", "biome.jsonc"]) {
    if (await fileExists(path.join(root, biomeFile))) {
      return { value: "biome", confidence: "certain", reason: `${biomeFile} found` };
    }
  }

  const eslintFiles = [
    ".eslintrc.js",
    ".eslintrc.json",
    ".eslintrc.cjs",
    ".eslintrc.yml",
    "eslint.config.js",
    "eslint.config.mjs",
  ];
  for (const file of eslintFiles) {
    if (await fileExists(path.join(root, file))) {
      return { value: "eslint-prettier", confidence: "high", reason: `${file} found` };
    }
  }

  const pkg = await readPackageJson(root);
  if (pkg) {
    if (hasDep(pkg, "@biomejs/biome")) {
      return { value: "biome", confidence: "high", reason: "@biomejs/biome in dependencies" };
    }
    if (hasDep(pkg, "eslint")) {
      return { value: "eslint-prettier", confidence: "high", reason: "eslint in dependencies" };
    }
  }

  return { value: "biome", confidence: "low", reason: "No linter detected, defaulting to biome" };
}
