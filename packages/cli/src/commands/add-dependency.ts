import fs from "node:fs/promises";
import path from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { readProjectConfig } from "../io/reader";

interface AddDependencyOptions {
  to?: string;
  dev?: boolean;
  version?: string;
  dryRun?: boolean;
}

// Catalog-aware npm dep add. Existing catalog hit → `"catalog:"` ref.
// New entry → adds to root catalog + workspace ref. Atomic two-file write.
export async function addDependencyCommand(
  packageName: string,
  options: AddDependencyOptions = {},
): Promise<void> {
  const cwd = process.cwd();
  const config = await readProjectConfig(cwd);
  if (!config) {
    p.log.error("No .turbo-stack.json found. Are you in a create-turbo-stack project?");
    process.exit(1);
  }

  if (!packageName || packageName.trim() === "") {
    p.log.error("Package name is required.");
    process.exit(1);
  }

  p.intro(`${pc.bgCyan(pc.black(" add dependency "))} ${pc.cyan(packageName)}`);

  const targetRel = options.to ?? (await pickWorkspace(config));
  if (!targetRel) {
    p.log.info("Cancelled.");
    return;
  }

  const targetPkgJson = path.join(cwd, targetRel, "package.json");
  let targetRaw: string;
  try {
    targetRaw = await fs.readFile(targetPkgJson, "utf-8");
  } catch {
    p.log.error(`Workspace ${pc.cyan(targetRel)} does not have a package.json.`);
    process.exit(1);
  }

  const rootPkgJsonPath = path.join(cwd, "package.json");
  const rootRaw = await fs.readFile(rootPkgJsonPath, "utf-8");

  let targetObj: Record<string, unknown>;
  let rootObj: Record<string, unknown>;
  try {
    targetObj = JSON.parse(targetRaw);
    rootObj = JSON.parse(rootRaw);
  } catch (err) {
    p.log.error(`Failed to parse a package.json: ${(err as Error).message}`);
    process.exit(1);
  }

  // root catalog, point at it; otherwise add it to the catalog at the
  // requested version (or "latest" — the user can pin later).
  const version = options.version ?? "latest";
  const catalog = (rootObj.workspaces as { catalog?: Record<string, string> } | undefined)?.catalog;
  const catalogHit = catalog?.[packageName];
  const refValue = "catalog:";
  let rootChanged = false;

  if (!catalogHit) {
    rootObj = addToCatalog(rootObj, packageName, version);
    rootChanged = true;
  }

  const depKey = options.dev ? "devDependencies" : "dependencies";
  const updatedTarget = addDependencyEntry(targetObj, depKey, packageName, refValue);
  const finalCatalogVersion = catalogHit ?? version;

  if (options.dryRun) {
    p.log.info(
      `(dry-run) would set ${depKey}["${packageName}"] = "${refValue}" in ${targetRel}/package.json`,
    );
    if (rootChanged) {
      p.log.info(
        `(dry-run) would add catalog entry "${packageName}": "${finalCatalogVersion}" in root package.json`,
      );
    }
    p.outro("(dry-run)");
    return;
  }

  const targetBackup = targetRaw;
  const rootBackup = rootChanged ? rootRaw : null;
  try {
    await fs.writeFile(targetPkgJson, `${JSON.stringify(updatedTarget, null, 2)}\n`, "utf-8");
    if (rootChanged) {
      await fs.writeFile(rootPkgJsonPath, `${JSON.stringify(rootObj, null, 2)}\n`, "utf-8");
    }
  } catch (err) {
    // Rollback
    await fs.writeFile(targetPkgJson, targetBackup, "utf-8").catch(() => {});
    if (rootBackup !== null) {
      await fs.writeFile(rootPkgJsonPath, rootBackup, "utf-8").catch(() => {});
    }
    p.log.error(`Failed to write: ${(err as Error).message}. Rolled back.`);
    process.exit(1);
  }

  p.log.info(
    `  ${pc.green("+")} ${targetRel}/package.json: ${depKey}["${packageName}"] = "${refValue}"`,
  );
  if (rootChanged) {
    p.log.info(`  ${pc.green("+")} root catalog: "${packageName}": "${finalCatalogVersion}"`);
  }
  p.outro(`${pc.green("Done!")} Run install to fetch ${pc.cyan(packageName)}.`);
}

/**
 * Interactive workspace picker. Returns a path relative to cwd
 * (e.g. `"apps/web"`, `"packages/ui"`) or null if the user cancels.
 */
async function pickWorkspace(config: { apps: { name: string }[]; packages: { name: string }[] }) {
  const choices: { value: string; label: string }[] = [];
  for (const app of config.apps)
    choices.push({ value: `apps/${app.name}`, label: `apps/${app.name}` });
  for (const pkg of config.packages)
    choices.push({ value: `packages/${pkg.name}`, label: `packages/${pkg.name}` });

  if (choices.length === 0) {
    p.log.error("No workspaces found. Add an app or package first.");
    return null;
  }

  const target = (await p.select({
    message: "Add to which workspace?",
    options: choices,
  })) as string | symbol;
  if (p.isCancel(target)) return null;
  return target as string;
}

/**
 * Insert/replace a key inside `obj[depKey]`, creating the bucket if
 * absent. Preserves any other keys already there. Returns a new object.
 */
function addDependencyEntry(
  obj: Record<string, unknown>,
  depKey: string,
  packageName: string,
  value: string,
): Record<string, unknown> {
  const existing = (obj[depKey] as Record<string, string> | undefined) ?? {};
  return {
    ...obj,
    [depKey]: { ...existing, [packageName]: value },
  };
}

/**
 * Add a name → version entry to `workspaces.catalog`, creating
 * `workspaces` and `catalog` as needed. Preserves the rest of the
 * `workspaces` shape (including the array form most monorepos use).
 */
function addToCatalog(
  rootObj: Record<string, unknown>,
  packageName: string,
  version: string,
): Record<string, unknown> {
  const workspaces =
    (rootObj.workspaces as
      | { packages?: string[]; catalog?: Record<string, string> }
      | string[]
      | undefined) ?? {};
  // Bun supports both: a plain `string[]` and an object with `packages`+`catalog`.
  if (Array.isArray(workspaces)) {
    return {
      ...rootObj,
      workspaces: {
        packages: workspaces,
        catalog: { [packageName]: version },
      },
    };
  }
  const catalog = workspaces.catalog ?? {};
  return {
    ...rootObj,
    workspaces: {
      ...workspaces,
      catalog: { ...catalog, [packageName]: version },
    },
  };
}
