import * as p from "@clack/prompts";
import type { getLinter } from "@create-turbo-stack/core";
import type { FileTreeNode, PackageRegistryItem } from "@create-turbo-stack/schema";
import pc from "picocolors";
import { depPackageName, parseDep, type ResolvedItem } from "./resolve";

/** Extra npm devDeps an item needs implicitly from its `environment` hint. */
export function implicitDevDeps(item: PackageRegistryItem): string[] {
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
export function wireEnvPackage(src: string, varNames: string[]): string | null {
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
export function checkLibSupersets(items: ResolvedItem[]): void {
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
export function materializeItem(
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
