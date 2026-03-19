import path from "node:path";
import type { Package } from "@create-turbo-stack/schema";
import type { Detection } from "../types";
import { hasDep, readPackageJson } from "../utils/dep-scanner";
import { listDirs, readFileIfExists } from "../utils/file-scanner";

// Auto-generated package names that should be excluded from user packages
const AUTO_PACKAGE_NAMES = new Set([
  "typescript-config",
  "env",
  "db",
  "api",
  "auth",
  "analytics",
  "monitoring",
  "email",
  "rate-limit",
  "ai",
]);

export async function detectPackages(
  root: string,
): Promise<{ packages: Package[]; detections: Detection<string>[] }> {
  const pkgsDir = path.join(root, "packages");
  const pkgNames = await listDirs(pkgsDir);
  const packages: Package[] = [];
  const detections: Detection<string>[] = [];

  for (const name of pkgNames) {
    if (AUTO_PACKAGE_NAMES.has(name)) continue;

    const pkgDir = path.join(pkgsDir, name);
    const pkg = await readPackageJson(pkgDir);
    if (!pkg) continue;

    const type = detectPackageType(pkg, name);
    const producesCSS = await detectProducesCSS(pkgDir, pkg);
    const exports = detectExports(pkg);

    packages.push({
      name,
      type: type.value as Package["type"],
      producesCSS,
      exports,
    });

    detections.push({
      value: `${name}: ${type.value}`,
      confidence: type.confidence,
      reason: type.reason,
    });
  }

  return { packages, detections };
}

function detectPackageType(
  pkg: NonNullable<Awaited<ReturnType<typeof readPackageJson>>>,
  name: string,
): Detection<string> {
  if (name === "ui" || name.endsWith("-ui")) {
    return { value: "ui", confidence: "high", reason: "Package name suggests UI" };
  }
  if (hasDep(pkg, "react")) {
    return { value: "react-library", confidence: "high", reason: "react in dependencies" };
  }
  if (name === "config" || name.endsWith("-config")) {
    return { value: "config", confidence: "high", reason: "Package name suggests config" };
  }
  if (name === "utils" || name.endsWith("-utils")) {
    return { value: "utils", confidence: "high", reason: "Package name suggests utils" };
  }
  return { value: "library", confidence: "medium", reason: "Generic library package" };
}

async function detectProducesCSS(
  dir: string,
  pkg: NonNullable<Awaited<ReturnType<typeof readPackageJson>>>,
): Promise<boolean> {
  // Check if package has tailwindcss or CSS-related deps
  if (hasDep(pkg, "tailwindcss")) return true;

  // Check for globals.css
  const globalsCss = await readFileIfExists(path.join(dir, "src", "globals.css"));
  if (globalsCss) return true;

  return false;
}

function detectExports(pkg: NonNullable<Awaited<ReturnType<typeof readPackageJson>>>): string[] {
  if (!pkg.exports || typeof pkg.exports === "string") return ["."];

  if (typeof pkg.exports === "object") {
    return Object.keys(pkg.exports as Record<string, unknown>);
  }

  return ["."];
}
