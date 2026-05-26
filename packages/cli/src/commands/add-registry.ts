import fs from "node:fs/promises";
import path from "node:path";
import * as p from "@clack/prompts";
import { getLinter } from "@create-turbo-stack/core";
import type { FileTreeNode, PackageRegistryItem } from "@create-turbo-stack/schema";
import { PackageRegistryItemSchema } from "@create-turbo-stack/schema";
import pc from "picocolors";
import { readProjectConfig } from "../io/reader";
import { writeFiles } from "../io/writer";

const DEFAULT_REGISTRY = "https://create-turbo-stack.dev/r";

/** Split "name@version" / "@scope/name@version" into [name, version?]. */
function parseDep(spec: string): [string, string] {
  const at = spec.lastIndexOf("@");
  if (at > 0) return [spec.slice(0, at), spec.slice(at + 1)];
  return [spec, "latest"];
}

/** Resolve a registry item from a URL or a local file/dir. */
async function resolveItem(name: string, registry: string): Promise<PackageRegistryItem> {
  let raw: string;
  if (/^https?:\/\//.test(registry)) {
    const url = `${registry.replace(/\/$/, "")}/${name}.json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`fetch ${url} → ${res.status}`);
    raw = await res.text();
  } else {
    const stat = await fs.stat(registry).catch(() => null);
    const file = stat?.isDirectory() ? path.join(registry, `${name}.json`) : registry;
    raw = await fs.readFile(file, "utf-8");
  }
  return PackageRegistryItemSchema.parse(JSON.parse(raw));
}

function exportsMap(item: PackageRegistryItem): Record<string, unknown> {
  const map: Record<string, unknown> = {};
  for (const exp of item.exports) {
    const stem = exp === "." ? "index" : exp.replace(/^\.\//, "");
    map[exp] =
      item.build === "tsup"
        ? { types: `./dist/${stem}.d.ts`, default: `./dist/${stem}.js` }
        : `./src/${stem}.ts`;
  }
  return map;
}

/**
 * `cts add <name>` — materialize a registry package into the current
 * monorepo. Reads the project's `.turbo-stack.json` for scope + linter,
 * resolves the manifest, then writes `packages/<name>` (deps → catalog,
 * env vars → .env.example) after a preview.
 */
export async function addRegistryCommand(
  name: string,
  options: { registry?: string; dryRun?: boolean; yes?: boolean } = {},
): Promise<void> {
  const cwd = process.cwd();
  const config = await readProjectConfig(cwd);
  if (!config) {
    p.log.error("No .turbo-stack.json found. Are you in a create-turbo-stack project?");
    process.exit(1);
  }

  const registry = options.registry ?? DEFAULT_REGISTRY;
  let item: PackageRegistryItem;
  try {
    item = await resolveItem(name, registry);
  } catch (err) {
    p.log.error(`Could not resolve "${name}" from ${registry}: ${(err as Error).message}`);
    process.exit(1);
  }

  p.intro(`${pc.bgCyan(pc.black(` add ${item.name} `))} ${pc.dim(item.description)}`);

  const scope = config.basics.scope;
  const linter = getLinter(config.basics.linter);
  const base = `packages/${item.name}`;
  const nodes: FileTreeNode[] = [];

  // package.json
  const dependencies: Record<string, string> = {};
  for (const dep of item.dependencies) dependencies[parseDep(dep)[0]] = "catalog:";
  const devDependencies: Record<string, string> = {
    [`${scope}/typescript-config`]: "workspace:*",
    typescript: "catalog:",
    ...linter.packageDevDeps,
    ...(item.build === "tsup" ? { tsup: "catalog:" } : {}),
  };
  for (const dep of item.devDependencies) devDependencies[parseDep(dep)[0]] = "catalog:";

  const pkgJson = {
    name: `${scope}/${item.name}`,
    version: "0.1.0",
    private: true,
    type: "module",
    exports: exportsMap(item),
    scripts: {
      lint: linter.lintScript,
      "type-check": "tsc --noEmit",
      ...(item.build === "tsup" ? { build: "tsup" } : {}),
    },
    dependencies,
    devDependencies,
  };
  nodes.push({
    path: `${base}/package.json`,
    content: `${JSON.stringify(pkgJson, null, 2)}\n`,
    isDirectory: false,
  });

  // tsconfig.json
  nodes.push({
    path: `${base}/tsconfig.json`,
    content: `${JSON.stringify(
      {
        extends: `${scope}/typescript-config/library.json`,
        compilerOptions: {
          outDir: "./dist",
          rootDir: "./src",
          ...(item.lib ? { lib: item.lib } : {}),
        },
        include: ["src/**/*"],
        exclude: ["node_modules", "dist"],
      },
      null,
      2,
    )}\n`,
    isDirectory: false,
  });

  if (item.build === "tsup") {
    nodes.push({
      path: `${base}/tsup.config.ts`,
      content: `import { defineConfig } from "tsup";\n\nexport default defineConfig({\n  entry: ["src/index.ts"],\n  format: ["esm"],\n  dts: true,\n  clean: true,\n});\n`,
      isDirectory: false,
    });
  }

  // Per-package linter config (eslint re-export), if any.
  for (const f of linter.packageConfigFiles(base)) nodes.push(f);

  // Source files from the manifest.
  for (const file of item.files) {
    const target = file.target ?? file.path;
    nodes.push({ path: `${base}/${target}`, content: file.content ?? "", isDirectory: false });
  }

  // Merge npm deps into the root catalog (bun: workspaces.catalog).
  const allDeps = [...item.dependencies, ...item.devDependencies];
  if (allDeps.length > 0) {
    const rootRaw = await fs.readFile(path.join(cwd, "package.json"), "utf-8");
    const root = JSON.parse(rootRaw);
    root.workspaces ??= ["apps/*", "packages/*"];
    if (Array.isArray(root.workspaces))
      root.workspaces = { packages: root.workspaces, catalog: {} };
    root.workspaces.catalog ??= {};
    for (const dep of allDeps) {
      const [n, v] = parseDep(dep);
      root.workspaces.catalog[n] ??= v;
    }
    nodes.push({
      path: "package.json",
      content: `${JSON.stringify(root, null, 2)}\n`,
      isDirectory: false,
    });
  }

  // Append env vars to .env.example (don't clobber existing entries).
  const envNames = Object.keys(item.envVars);
  if (envNames.length > 0) {
    let env = await fs.readFile(path.join(cwd, ".env.example"), "utf-8").catch(() => "");
    for (const [k, v] of Object.entries(item.envVars)) {
      if (!new RegExp(`^${k}=`, "m").test(env))
        env += `${env.endsWith("\n") || !env ? "" : "\n"}${k}=${v}\n`;
    }
    nodes.push({ path: ".env.example", content: env, isDirectory: false });
  }

  // Preview.
  p.log.message(`Will write:\n${nodes.map((n) => `  ${pc.green("+")} ${n.path}`).join("\n")}`);
  if (options.dryRun) {
    p.outro("Dry run — nothing written.");
    return;
  }

  if (!options.yes) {
    const ok = await p.confirm({ message: `Add ${pc.cyan(`${scope}/${item.name}`)}?` });
    if (p.isCancel(ok) || !ok) {
      p.cancel("Aborted.");
      return;
    }
  }

  await writeFiles(cwd, nodes);
  p.outro(
    `${pc.green("✓")} Added ${pc.cyan(`${scope}/${item.name}`)} — run ${pc.cyan(`${config.basics.packageManager} install`)}.`,
  );
}
