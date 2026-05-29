import fs from "node:fs/promises";
import path from "node:path";
import * as p from "@clack/prompts";
import { getLinter } from "@create-turbo-stack/core";
import type { FileTreeNode, Linter, RegistryConfigEntry } from "@create-turbo-stack/schema";
import pc from "picocolors";
import { readProjectConfig, writeProjectConfig } from "../io/reader";
import { writeFiles } from "../io/writer";
import { loadEnvSource } from "./registry/env";
import {
  checkLibSupersets,
  implicitDevDeps,
  materializeItem,
  wireEnvPackage,
} from "./registry/materialize";
import { parseDep, type ResolvedItem, resolveTree } from "./registry/resolve";

/**
 * `cts add <name>` — materialize a registry package (and its registry
 * dependencies) into the current monorepo. Reads `.turbo-stack.json` for
 * scope + linter, resolves the tree (integrity-verified), writes each
 * `packages/<name>` (deps → catalog, env → .env.example + env package),
 * optionally wires it into an app, and records the result in `.turbo-stack.json`.
 *
 * The resolution / integrity / materialization / env logic lives in
 * `./registry/{resolve,materialize,env}.ts`; this is the orchestration.
 */
export async function addRegistryCommand(
  name: string,
  options: {
    registry?: string;
    registries?: Record<string, RegistryConfigEntry>;
    dryRun?: boolean;
    yes?: boolean;
    app?: string;
    /** Target project dir — the create flow passes the freshly scaffolded one. */
    cwd?: string;
  } = {},
): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  const config = await readProjectConfig(cwd);
  if (!config) {
    p.log.error("No .turbo-stack.json found. Are you in a create-turbo-stack project?");
    process.exit(1);
  }
  // Resolve `${VAR}` registry tokens from the project's .env files too.
  await loadEnvSource(cwd);

  // Registries can live in `.turbo-stack.json`'s `config` block (one file per
  // project) — merged over any global/team `create-turbo-stack.json`, which wins.
  const registries = { ...options.registries, ...config.config?.registries };

  let items: ResolvedItem[];
  try {
    items = await resolveTree(name, { registry: options.registry, registries });
  } catch (err) {
    const message = `Could not resolve "${name}": ${(err as Error).message}`;
    // Called programmatically (create flow) → throw so the caller can warn and
    // continue; standalone `cts add` → report and exit.
    if (options.cwd) throw new Error(message);
    p.log.error(message);
    process.exit(1);
  }

  const rootItem = items[items.length - 1].item;
  const deps = items.slice(0, -1);
  p.intro(`${pc.bgCyan(pc.black(` add ${rootItem.name} `))} ${pc.dim(rootItem.description)}`);
  if (deps.length > 0) {
    p.log.info(`Registry dependencies: ${deps.map((d) => pc.cyan(d.item.name)).join(", ")}`);
  }

  const scope = config.basics.scope;
  const linter = getLinter(config.basics.linter as Linter);
  const nodes: FileTreeNode[] = [];
  const npmDeps: string[] = [];
  const envVars: Record<string, string> = {};

  checkLibSupersets(items);

  for (const { item } of items) {
    nodes.push(...materializeItem(item, scope, linter));
    npmDeps.push(...item.dependencies, ...item.devDependencies, ...implicitDevDeps(item));
    Object.assign(envVars, item.envVars);
  }

  // Merge npm deps into the root catalog (bun: workspaces.catalog).
  if (npmDeps.length > 0) {
    const root = JSON.parse(await fs.readFile(path.join(cwd, "package.json"), "utf-8"));
    root.workspaces ??= ["apps/*", "packages/*"];
    if (Array.isArray(root.workspaces))
      root.workspaces = { packages: root.workspaces, catalog: {} };
    root.workspaces.catalog ??= {};
    for (const dep of npmDeps) {
      const [n, v] = parseDep(dep);
      const existing = root.workspaces.catalog[n];
      // First-write wins (don't clobber the user's pin); warn on a real clash.
      if (existing && existing !== v && v !== "latest" && existing !== "latest") {
        p.log.warn(
          `catalog version conflict for ${pc.yellow(n)}: keeping ${existing}, ignoring ${v}`,
        );
      }
      root.workspaces.catalog[n] ??= v;
    }
    nodes.push({
      path: "package.json",
      content: `${JSON.stringify(root, null, 2)}\n`,
      isDirectory: false,
    });
  }

  // Append env vars to .env.example (don't clobber existing entries).
  if (Object.keys(envVars).length > 0) {
    let env = await fs.readFile(path.join(cwd, ".env.example"), "utf-8").catch(() => "");
    for (const [k, v] of Object.entries(envVars)) {
      if (!new RegExp(`^${k}=`, "m").test(env)) {
        env += `${env.endsWith("\n") || !env ? "" : "\n"}${k}=${v}\n`;
      }
    }
    nodes.push({ path: ".env.example", content: env, isDirectory: false });

    // Also wire them into the load-bearing env package (typed `env.X`), so the
    // vars are validated — not just documented. Best-effort; skipped if there's
    // no env package or it's been hand-edited beyond our recognizable shape.
    const envIndex = await fs
      .readFile(path.join(cwd, "packages/env/src/index.ts"), "utf-8")
      .catch(() => null);
    const wired = envIndex && wireEnvPackage(envIndex, Object.keys(envVars));
    if (wired) {
      nodes.push({ path: "packages/env/src/index.ts", content: wired, isDirectory: false });
    } else if (envIndex) {
      p.log.warn(
        `Added env vars to .env.example — add them to packages/env yourself ` +
          `(couldn't auto-wire ${pc.dim("packages/env/src/index.ts")}).`,
      );
    }
  }

  // Optionally wire the root package into an app as a workspace dependency
  // (the app consumes it; the package's own registryDependencies are its deps,
  // not the app's). --app picks it directly; otherwise prompt interactively.
  let targetApp = options.app;
  if (!targetApp && !options.yes && config.apps.length > 0) {
    const picked = await p.select({
      message: `Add ${pc.cyan(`${scope}/${rootItem.name}`)} to an app?`,
      options: [
        { value: "", label: "no — just add the package" },
        ...config.apps.map((a) => ({ value: a.name, label: `apps/${a.name}` })),
      ],
    });
    if (p.isCancel(picked)) {
      p.cancel("Aborted.");
      return;
    }
    targetApp = picked || undefined;
  }
  if (targetApp) {
    if (!config.apps.some((a) => a.name === targetApp)) {
      p.log.error(
        `Unknown app "${targetApp}". Known apps: ${config.apps.map((a) => a.name).join(", ")}`,
      );
      process.exit(1);
    }
    const appPkgPath = `apps/${targetApp}/package.json`;
    const appPkg = JSON.parse(await fs.readFile(path.join(cwd, appPkgPath), "utf-8"));
    appPkg.dependencies ??= {};
    appPkg.dependencies[`${scope}/${rootItem.name}`] = "workspace:*";
    nodes.push({
      path: appPkgPath,
      content: `${JSON.stringify(appPkg, null, 2)}\n`,
      isDirectory: false,
    });
  }

  p.log.message(`Will write:\n${nodes.map((n) => `  ${pc.green("+")} ${n.path}`).join("\n")}`);
  if (options.dryRun) {
    p.outro("Dry run — nothing written.");
    return;
  }

  if (!options.yes) {
    const ok = await p.confirm({ message: `Add ${pc.cyan(`${scope}/${rootItem.name}`)}?` });
    if (p.isCancel(ok) || !ok) {
      p.cancel("Aborted.");
      return;
    }
  }

  await writeFiles(cwd, nodes);

  // Record packages in .turbo-stack.json (provenance + verified checksum) so
  // state stays accurate for remove / reconcile and so a later re-add can
  // detect drift — content that changed under a name already installed.
  const existing = new Map(config.packages.map((pkg) => [pkg.name, pkg]));
  let stateChanged = false;
  for (const { item, ref } of items) {
    const source = item.checksum ? { ref, checksum: item.checksum } : undefined;
    const prior = existing.get(item.name);
    if (prior) {
      if (prior.registry && source && prior.registry.checksum !== source.checksum) {
        p.log.warn(
          `${pc.yellow(item.name)} changed since it was added ` +
            `(${prior.registry.checksum.slice(0, 19)}… → ${source.checksum.slice(0, 19)}…).`,
        );
        prior.registry = source;
        stateChanged = true;
      }
      continue;
    }
    config.packages.push({
      name: item.name,
      type: "library",
      // Registry-installed packages land at the default workspace location;
      // the user can relocate via the builder or by editing `.turbo-stack.json`.
      location: "packages",
      producesCSS: false,
      exports: item.exports,
      ...(source ? { registry: source } : {}),
    });
    stateChanged = true;
  }
  if (stateChanged) await writeProjectConfig(cwd, config);

  // Usage notes — root item last so it's the final thing on screen.
  for (const { item } of items) {
    if (item.docs) p.note(item.docs, `${scope}/${item.name}`);
  }

  p.outro(
    `${pc.green("✓")} Added ${pc.cyan(`${scope}/${rootItem.name}`)}${
      deps.length ? ` (+${deps.length} dep${deps.length > 1 ? "s" : ""})` : ""
    } — run ${pc.cyan(`${config.basics.packageManager} install`)}.`,
  );
}
