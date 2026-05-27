import fs from "node:fs/promises";
import path from "node:path";
import * as p from "@clack/prompts";
import { computeChecksum, getLinter, verifySignature } from "@create-turbo-stack/core";
import type {
  FileTreeNode,
  Linter,
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

/**
 * The source `${VAR}` placeholders resolve against — the project's `.env` /
 * `.env.local` merged under the real environment (shell env wins). Set by
 * `loadEnvSource` so a registry token can live in `.env.local` instead of
 * needing to be exported in the shell.
 */
let envSource: Record<string, string | undefined> = process.env;

function parseDotenv(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let val = m[2];
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[m[1]] = val;
  }
  return out;
}

async function loadEnvSource(cwd: string): Promise<void> {
  const read = async (f: string) =>
    parseDotenv(await fs.readFile(path.join(cwd, f), "utf-8").catch(() => ""));
  envSource = { ...(await read(".env")), ...(await read(".env.local")), ...process.env };
}

/** Expand `${VAR}` from `envSource` (so tokens never live in config). */
function expandEnv(value: string): string {
  return value.replace(/\$\{(\w+)\}/g, (_, name) => envSource[name] ?? "");
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

/** The configured Ed25519 public key for a namespace, if any. */
function namespacePublicKey(opts: ResolveOptions, base: string): string | undefined {
  if (!base.startsWith("@")) return undefined;
  const entry = opts.registries?.[base];
  return typeof entry === "object" ? entry.publicKey : undefined;
}

/**
 * Supply-chain gate before any file is written. The checksum (always present on
 * built items) catches tampering/corruption between build and install. The
 * signature — verified only when the registry has a `publicKey` configured —
 * is the out-of-band trust anchor that a self-embedded checksum cannot provide.
 */
async function verifyIntegrity(item: PackageRegistryItem, publicKey?: string): Promise<void> {
  if (item.checksum) {
    const actual = await computeChecksum(item);
    if (actual !== item.checksum) {
      throw new Error(
        `checksum mismatch for "${item.name}" — content does not match its stamp ` +
          `(expected ${item.checksum}, got ${actual}). Refusing to install.`,
      );
    }
  }
  if (publicKey) {
    if (!item.signature) {
      throw new Error(`"${item.name}" is unsigned but its registry requires a signature`);
    }
    if (!item.checksum) {
      throw new Error(`"${item.name}" carries a signature but no checksum to verify against`);
    }
    if (!(await verifySignature(item.checksum, item.signature, publicKey))) {
      throw new Error(`invalid signature for "${item.name}" — check the registry publicKey`);
    }
  }
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

interface ResolvedItem {
  item: PackageRegistryItem;
  /** How this item was resolved — recorded for drift detection / reconcile. */
  ref: string;
}

/**
 * Resolve the full install set: the item plus its `registryDependencies`,
 * recursively. Deps come before dependents (topological), deduped by name,
 * cycle-safe, and each is integrity-verified as it loads.
 */
async function resolveTree(rootRef: string, opts: ResolveOptions): Promise<ResolvedItem[]> {
  const ordered: ResolvedItem[] = [];
  const done = new Set<string>();
  const onStack = new Set<string>();

  async function visit(ref: string, base: string): Promise<void> {
    const { item, base: childBase } = await loadItem(ref, opts, base);
    await verifyIntegrity(item, namespacePublicKey(opts, childBase));
    if (done.has(item.name) || onStack.has(item.name)) return;
    onStack.add(item.name);
    for (const dep of item.registryDependencies) await visit(dep, childBase);
    onStack.delete(item.name);
    done.add(item.name);
    ordered.push({
      item,
      ref: childBase.startsWith("@") ? `${childBase}/${item.name}` : item.name,
    });
  }

  await visit(rootRef, "");
  return ordered;
}

/** Extra npm devDeps an item needs implicitly from its `environment` hint. */
function implicitDevDeps(item: PackageRegistryItem): string[] {
  return item.environment === "node" ? ["@types/node"] : [];
}

/**
 * Best-effort wiring of registry env vars into the load-bearing `env` package
 * (typed `createEnv`), so they become `env.X` not just `.env.example` lines.
 * `NEXT_PUBLIC_*` go in `client`, the rest in `server`; each also gets a
 * `runtimeEnv` entry. Returns the rewritten source, or `null` to leave the file
 * untouched (var already present, or the file was hand-edited beyond our shape —
 * we never risk corrupting a user-owned, load-bearing file).
 */
function wireEnvPackage(src: string, varNames: string[]): string | null {
  if (!src.includes("createEnv(")) return null;
  const toAdd = varNames.filter((v) => !new RegExp(`\\b${v}\\s*:`).test(src));
  if (toAdd.length === 0) return null;

  let out = src;
  if (!/from ["']zod["']/.test(out)) {
    out = out.replace(
      /(import .*?from ["']@t3-oss\/env-nextjs["'];\n)/,
      `$1import { z } from "zod";\n`,
    );
  }

  const block = (kind: "server" | "client", names: string[]): boolean => {
    if (names.length === 0) return true;
    const entries = names.map((v) => `    ${v}: z.string(),`).join("\n");
    const re = new RegExp(`(${kind}:\\s*\\{\\n)`);
    if (re.test(out)) {
      out = out.replace(re, `$1${entries}\n`);
    } else {
      // No existing block — insert one right after `createEnv({`.
      const inserted = out.replace(/(createEnv\(\{\n)/, `$1  ${kind}: {\n${entries}\n  },\n`);
      if (inserted === out) return false;
      out = inserted;
    }
    return true;
  };

  const clientVars = toAdd.filter((v) => v.startsWith("NEXT_PUBLIC_"));
  const serverVars = toAdd.filter((v) => !v.startsWith("NEXT_PUBLIC_"));
  if (!block("server", serverVars) || !block("client", clientVars)) return null;

  const runtime = toAdd.map((v) => `    ${v}: process.env.${v},`).join("\n");
  if (/runtimeEnv:\s*\{\}/.test(out)) {
    out = out.replace(/runtimeEnv:\s*\{\}/, `runtimeEnv: {\n${runtime}\n  }`);
  } else if (/runtimeEnv:\s*\{\n/.test(out)) {
    out = out.replace(/(runtimeEnv:\s*\{\n)/, `$1${runtime}\n`);
  } else {
    return null;
  }
  return out;
}

/**
 * Runtime-sharing guardrail. A source-exported dependency is type-checked under
 * the *consumer's* tsconfig, so the consumer's `lib` must cover the dep's `lib`
 * (e.g. session → crypto, both need `WebWorker`). Warn when it doesn't — the
 * build would otherwise fail with confusing "Cannot find name 'crypto'" errors.
 * tsup deps ship their own `.d.ts`, so they're exempt.
 */
function checkLibSupersets(items: ResolvedItem[]): void {
  const byName = new Map(items.map((r) => [r.item.name, r.item]));
  for (const { item } of items) {
    const consumerLib = new Set(item.lib ?? []);
    for (const ref of item.registryDependencies) {
      const dep = byName.get(depPackageName(ref));
      if (!dep || dep.build === "tsup") continue;
      const missing = (dep.lib ?? []).filter((l) => !consumerLib.has(l));
      if (missing.length > 0) {
        p.log.warn(
          `${pc.yellow(item.name)} consumes ${pc.yellow(dep.name)} (source) but is missing ` +
            `lib [${missing.join(", ")}] — add it to ${item.name}'s lib or type-check may fail.`,
        );
      }
    }
  }
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
  for (const dep of implicitDevDeps(item)) devDependencies[parseDep(dep)[0]] = "catalog:";

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
          ...(item.environment === "node" ? { types: ["node"] } : {}),
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
    app?: string;
  } = {},
): Promise<void> {
  const cwd = process.cwd();
  const config = await readProjectConfig(cwd);
  if (!config) {
    p.log.error("No .turbo-stack.json found. Are you in a create-turbo-stack project?");
    process.exit(1);
  }
  // Resolve `${VAR}` registry tokens from the project's .env files too.
  await loadEnvSource(cwd);

  let items: ResolvedItem[];
  try {
    items = await resolveTree(name, { registry: options.registry, registries: options.registries });
  } catch (err) {
    p.log.error(`Could not resolve "${name}": ${(err as Error).message}`);
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
