import fs from "node:fs/promises";
import path from "node:path";
import * as p from "@clack/prompts";
import { getLinter } from "@create-turbo-stack/core";
import type {
  FileTreeNode,
  Linter,
  Package,
  PackageRegistryItem,
  RegistryConfigEntry,
} from "@create-turbo-stack/schema";
import { PackageRegistryItemSchema } from "@create-turbo-stack/schema";
import pc from "picocolors";
import { readProjectConfig, writeProjectConfig } from "../io/reader";
import { writeFiles } from "../io/writer";

const DEFAULT_REGISTRY = "https://create-turbo-stack.dev/r";
const NAMESPACE_RE = /^(@[a-zA-Z0-9][\w-]*)\/(.+)$/;

interface ResolveOptions {
  registry?: string;
  registries?: Record<string, RegistryConfigEntry>;
}

/** Split "name@version" / "@scope/name@version" into [name, version?]. */
function parseDep(spec: string): [string, string] {
  const at = spec.lastIndexOf("@");
  if (at > 0) return [spec.slice(0, at), spec.slice(at + 1)];
  return [spec, "latest"];
}

/** The package name a registryDependency installs to (bare / @ns/name / URL). */
function depPackageName(ref: string): string {
  if (/^https?:\/\//.test(ref)) return path.basename(ref).replace(/\.json$/, "");
  const ns = ref.match(NAMESPACE_RE);
  return ns ? ns[2] : ref;
}

/** Expand `${VAR}` from the environment (so tokens never live in config). */
function expandEnv(value: string): string {
  return value.replace(/\$\{(\w+)\}/g, (_, name) => process.env[name] ?? "");
}

async function fetchItem(url: string, headers: Record<string, string>): Promise<string> {
  const res = await fetch(url, { headers });
  if (res.status === 401) throw new Error("unauthorized (401) — check your registry token");
  if (res.status === 403) throw new Error("forbidden (403) — token lacks access");
  if (!res.ok) throw new Error(`fetch ${url} → ${res.status}`);
  return res.text();
}

function namespaceRequest(entry: RegistryConfigEntry, resource: string) {
  const template = typeof entry === "string" ? entry : entry.url;
  const url = new URL(expandEnv(template.replace(/\{name\}/g, resource)));
  const headers: Record<string, string> = {};
  if (typeof entry !== "string") {
    for (const [k, v] of Object.entries(entry.headers ?? {})) headers[k] = expandEnv(v);
    for (const [k, v] of Object.entries(entry.params ?? {})) url.searchParams.set(k, expandEnv(v));
  }
  return { url: url.toString(), headers };
}

/**
 * Load one item + the `base` to resolve ITS bare `registryDependencies`.
 * A ref can be a URL, `@ns/name`, or a bare name; a bare name resolves
 * against the parent's base (so a dep of an `@store` item stays in `@store`),
 * falling back to `--registry` / the default registry at the root.
 */
async function loadItem(
  ref: string,
  opts: ResolveOptions,
  base: string,
): Promise<{ item: PackageRegistryItem; base: string }> {
  const parse = (raw: string) => PackageRegistryItemSchema.parse(JSON.parse(raw));

  if (/^https?:\/\//.test(ref)) {
    return { item: parse(await fetchItem(ref, {})), base: ref.replace(/\/[^/]*$/, "") };
  }

  const ns = ref.match(NAMESPACE_RE);
  if (ns) {
    const [, namespace, resource] = ns;
    const entry = opts.registries?.[namespace];
    if (!entry) {
      throw new Error(
        `unknown registry "${namespace}" — add it to create-turbo-stack.json:\n` +
          `  { "registries": { "${namespace}": "https://.../{name}.json" } }`,
      );
    }
    const { url, headers } = namespaceRequest(entry, resource);
    return { item: parse(await fetchItem(url, headers)), base: namespace };
  }

  // Bare name — resolve against the parent base, then the root registry.
  if (base.startsWith("@")) return loadItem(`${base}/${ref}`, opts, base);
  if (/^https?:\/\//.test(base)) {
    return { item: parse(await fetchItem(`${base}/${ref}.json`, {})), base };
  }
  if (base) {
    return { item: parse(await fs.readFile(path.join(base, `${ref}.json`), "utf-8")), base };
  }

  const registry = opts.registry ?? DEFAULT_REGISTRY;
  if (/^https?:\/\//.test(registry)) {
    const root = registry.replace(/\/$/, "");
    return { item: parse(await fetchItem(`${root}/${ref}.json`, {})), base: root };
  }
  const stat = await fs.stat(registry).catch(() => null);
  const dir = stat?.isDirectory() ? registry : path.dirname(registry);
  const file = stat?.isDirectory() ? path.join(registry, `${ref}.json`) : registry;
  return { item: parse(await fs.readFile(file, "utf-8")), base: dir };
}

/**
 * Resolve the full install set: the item plus its `registryDependencies`,
 * recursively. Deps come before dependents (topological), deduped by name,
 * cycle-safe.
 */
async function resolveTree(rootRef: string, opts: ResolveOptions): Promise<PackageRegistryItem[]> {
  const ordered: PackageRegistryItem[] = [];
  const done = new Set<string>();
  const onStack = new Set<string>();

  async function visit(ref: string, base: string): Promise<void> {
    const { item, base: childBase } = await loadItem(ref, opts, base);
    if (done.has(item.name) || onStack.has(item.name)) return;
    onStack.add(item.name);
    for (const dep of item.registryDependencies) await visit(dep, childBase);
    onStack.delete(item.name);
    done.add(item.name);
    ordered.push(item);
  }

  await visit(rootRef, "");
  return ordered;
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

/** Per-package files for one registry item (no catalog/env aggregation). */
function materializeItem(
  item: PackageRegistryItem,
  scope: string,
  linter: ReturnType<typeof getLinter>,
): FileTreeNode[] {
  const base = `packages/${item.name}`;
  const nodes: FileTreeNode[] = [];

  const dependencies: Record<string, string> = {};
  for (const dep of item.dependencies) dependencies[parseDep(dep)[0]] = "catalog:";
  // Sibling registry packages → workspace deps; the source imports them via
  // the `@scope/<dep>` placeholder, rewritten to the project scope below.
  for (const ref of item.registryDependencies) {
    dependencies[`${scope}/${depPackageName(ref)}`] = "workspace:*";
  }
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

  for (const f of linter.packageConfigFiles(base)) nodes.push(f);

  for (const file of item.files) {
    const target = file.target ?? file.path;
    // `@scope/` is the placeholder for sibling registry packages → rewrite
    // to the project's actual scope (e.g. `@my-app/`).
    const content = (file.content ?? "").replaceAll("@scope/", `${scope}/`);
    nodes.push({ path: `${base}/${target}`, content, isDirectory: false });
  }

  return nodes;
}

/**
 * `cts add <name>` — materialize a registry package (and its registry
 * dependencies) into the current monorepo. Reads `.turbo-stack.json` for
 * scope + linter, resolves the tree, writes each `packages/<name>` (deps →
 * catalog, env → .env.example), records them in `.turbo-stack.json`.
 */
export async function addRegistryCommand(
  name: string,
  options: {
    registry?: string;
    registries?: Record<string, RegistryConfigEntry>;
    dryRun?: boolean;
    yes?: boolean;
  } = {},
): Promise<void> {
  const cwd = process.cwd();
  const config = await readProjectConfig(cwd);
  if (!config) {
    p.log.error("No .turbo-stack.json found. Are you in a create-turbo-stack project?");
    process.exit(1);
  }

  let items: PackageRegistryItem[];
  try {
    items = await resolveTree(name, { registry: options.registry, registries: options.registries });
  } catch (err) {
    p.log.error(`Could not resolve "${name}": ${(err as Error).message}`);
    process.exit(1);
  }

  const root = items[items.length - 1];
  const deps = items.slice(0, -1);
  p.intro(`${pc.bgCyan(pc.black(` add ${root.name} `))} ${pc.dim(root.description)}`);
  if (deps.length > 0) {
    p.log.info(`Registry dependencies: ${deps.map((d) => pc.cyan(d.name)).join(", ")}`);
  }

  const scope = config.basics.scope;
  const linter = getLinter(config.basics.linter as Linter);
  const nodes: FileTreeNode[] = [];
  const npmDeps: string[] = [];
  const envVars: Record<string, string> = {};

  for (const item of items) {
    nodes.push(...materializeItem(item, scope, linter));
    npmDeps.push(...item.dependencies, ...item.devDependencies);
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
  }

  p.log.message(`Will write:\n${nodes.map((n) => `  ${pc.green("+")} ${n.path}`).join("\n")}`);
  if (options.dryRun) {
    p.outro("Dry run — nothing written.");
    return;
  }

  if (!options.yes) {
    const ok = await p.confirm({ message: `Add ${pc.cyan(`${scope}/${root.name}`)}?` });
    if (p.isCancel(ok) || !ok) {
      p.cancel("Aborted.");
      return;
    }
  }

  await writeFiles(cwd, nodes);

  // Record the packages in .turbo-stack.json so state stays accurate for
  // remove / reconcile.
  const known = new Set(config.packages.map((pkg) => pkg.name));
  let stateChanged = false;
  for (const item of items) {
    if (!known.has(item.name)) {
      const pkg: Package = {
        name: item.name,
        type: "library",
        producesCSS: false,
        exports: item.exports,
      };
      config.packages.push(pkg);
      stateChanged = true;
    }
  }
  if (stateChanged) await writeProjectConfig(cwd, config);

  p.outro(
    `${pc.green("✓")} Added ${pc.cyan(`${scope}/${root.name}`)}${
      deps.length ? ` (+${deps.length} dep${deps.length > 1 ? "s" : ""})` : ""
    } — run ${pc.cyan(`${config.basics.packageManager} install`)}.`,
  );
}
