import path from "node:path";
import { readJsonFile } from "./file-scanner";

type PackageJson = {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  workspaces?: string[];
  exports?: unknown;
};

export async function readPackageJson(dir: string): Promise<PackageJson | null> {
  return readJsonFile<PackageJson>(path.join(dir, "package.json"));
}

export function hasDep(pkg: PackageJson, name: string): boolean {
  return !!(pkg.dependencies?.[name] || pkg.devDependencies?.[name]);
}

export function hasAnyDep(pkg: PackageJson, names: string[]): string | null {
  for (const name of names) {
    if (hasDep(pkg, name)) return name;
  }
  return null;
}

export function getWorkspaceDeps(pkg: PackageJson, scope: string): string[] {
  const deps: string[] = [];
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

  for (const [name, version] of Object.entries(allDeps)) {
    if (
      name.startsWith(`${scope}/`) &&
      (version === "workspace:*" || version?.startsWith("workspace:"))
    ) {
      deps.push(name.replace(`${scope}/`, ""));
    }
  }

  return deps;
}
