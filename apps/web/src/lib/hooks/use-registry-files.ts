"use client";

import type { FileTreeNode } from "@create-turbo-stack/schema";
import { useEffect, useState } from "react";

/**
 * Fetch the selected first-party registry packages and synthesize the SAME
 * files `cts add` materializes (package.json, tsconfig.json, tsup.config.ts,
 * src/*) so the preview tree shows them as complete packages — not just loose
 * source files. Mirrors `packages/cli/src/commands/registry/materialize.ts`
 * (which is Node-only, so it can't be imported into the browser preview).
 *
 * Security: contents are only ever rendered as text / via Shiki — never
 * executed, never injected as raw HTML. `registryPackages` is user-controllable
 * (a `?p=` share URL), so names are whitelisted before they reach the fetch
 * URL, the response shape is validated, paths are normalized (no `..`), and
 * size/count are capped.
 */

const NAME_RE = /^[a-z0-9][a-z0-9-]*$/;
const MAX_PACKAGES = 20;
const MAX_CONTENT = 200_000;

const LINTERS: Record<string, { lint: string; dev: Record<string, string> }> = {
  biome: { lint: "biome check", dev: { "@biomejs/biome": "catalog:" } },
  oxlint: {
    lint: "oxlint && prettier --check .",
    dev: { oxlint: "catalog:", prettier: "catalog:" },
  },
  "eslint-prettier": {
    lint: "eslint . && prettier --check .",
    dev: { eslint: "catalog:", prettier: "catalog:" },
  },
};

type RawFile = { path?: unknown; target?: unknown; content?: unknown };
type RawItem = {
  dependencies?: unknown;
  devDependencies?: unknown;
  registryDependencies?: unknown;
  exports?: unknown;
  lib?: unknown;
  environment?: unknown;
  build?: unknown;
  files?: unknown;
};

function strings(v: unknown): string[] {
  return Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string")
    : [];
}

/** "name@1.2.3" / "@scope/name@1" → bare name. */
function depName(spec: string): string {
  const at = spec.lastIndexOf("@");
  return at > 0 ? spec.slice(0, at) : spec;
}

function normalizeRel(p: string): string | null {
  const parts = p.split("/").filter((s) => s && s !== "." && s !== "..");
  return parts.length > 0 ? parts.join("/") : null;
}

function jsonNode(path: string, value: unknown): FileTreeNode {
  return {
    path,
    content: `${JSON.stringify(value, null, 2)}\n`,
    isDirectory: false,
  };
}

function synthesize(
  name: string,
  data: RawItem,
  scope: string,
  linter: string,
): FileTreeNode[] {
  const base = `packages/${name}`;
  const build = data.build === "tsup" ? "tsup" : "none";
  const lib = strings(data.lib);
  const lint = LINTERS[linter] ?? LINTERS.biome;
  const nodes: FileTreeNode[] = [];

  const exportsMap: Record<string, unknown> = {};
  for (const exp of strings(data.exports)) {
    const stem = exp === "." ? "index" : exp.replace(/^\.\//, "");
    exportsMap[exp] =
      build === "tsup"
        ? { types: `./dist/${stem}.d.ts`, default: `./dist/${stem}.js` }
        : `./src/${stem}.ts`;
  }

  const dependencies: Record<string, string> = {};
  for (const d of strings(data.dependencies))
    dependencies[depName(d)] = "catalog:";
  for (const ref of strings(data.registryDependencies)) {
    dependencies[`${scope}/${depName(ref)}`] = "workspace:*";
  }

  const devDependencies: Record<string, string> = {
    [`${scope}/typescript-config`]: "workspace:*",
    typescript: "catalog:",
    ...lint.dev,
    ...(build === "tsup" ? { tsup: "catalog:" } : {}),
  };
  for (const d of strings(data.devDependencies))
    devDependencies[depName(d)] = "catalog:";
  if (data.environment === "node") devDependencies["@types/node"] = "catalog:";

  nodes.push(
    jsonNode(`${base}/package.json`, {
      name: `${scope}/${name}`,
      version: "0.1.0",
      private: true,
      type: "module",
      exports: exportsMap,
      scripts: {
        lint: lint.lint,
        "type-check": "tsc --noEmit",
        ...(build === "tsup" ? { build: "tsup" } : {}),
      },
      dependencies,
      devDependencies,
    }),
  );

  nodes.push(
    jsonNode(`${base}/tsconfig.json`, {
      extends: `${scope}/typescript-config/library.json`,
      compilerOptions: {
        outDir: "./dist",
        rootDir: "./src",
        ...(lib.length > 0 ? { lib } : {}),
        ...(data.environment === "node" ? { types: ["node"] } : {}),
      },
      include: ["src/**/*"],
      exclude: ["node_modules", "dist"],
    }),
  );

  if (build === "tsup") {
    nodes.push({
      path: `${base}/tsup.config.ts`,
      content: `import { defineConfig } from "tsup";\n\nexport default defineConfig({\n  entry: ["src/index.ts"],\n  format: ["esm"],\n  dts: true,\n  clean: true,\n});\n`,
      isDirectory: false,
    });
  }

  const files = Array.isArray(data.files) ? (data.files as RawFile[]) : [];
  for (const f of files) {
    const raw =
      typeof f?.target === "string"
        ? f.target
        : typeof f?.path === "string"
          ? f.path
          : null;
    if (
      !raw ||
      typeof f?.content !== "string" ||
      f.content.length > MAX_CONTENT
    ) {
      continue;
    }
    const rel = normalizeRel(raw);
    if (!rel) continue;
    // `@scope/` placeholder → the project's actual scope (matches materialize).
    nodes.push({
      path: `${base}/${rel}`,
      content: f.content.replaceAll("@scope/", `${scope}/`),
      isDirectory: false,
    });
  }

  return nodes;
}

export function useRegistryFiles(
  names: readonly string[],
  scope: string,
  linter: string,
): FileTreeNode[] {
  const key = `${[...names].sort().join(",")}|${scope}|${linter}`;
  const [nodes, setNodes] = useState<FileTreeNode[]>([]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` is the stable serialization of the inputs
  useEffect(() => {
    const valid = names.filter((n) => NAME_RE.test(n)).slice(0, MAX_PACKAGES);
    if (valid.length === 0) {
      setNodes([]);
      return;
    }
    let active = true;
    Promise.all(
      valid.map((name) =>
        fetch(`/r/${encodeURIComponent(name)}.json`)
          .then((r) => (r.ok ? r.json() : null))
          .then((data) =>
            data && typeof data === "object"
              ? synthesize(name, data as RawItem, scope, linter)
              : [],
          )
          .catch(() => [] as FileTreeNode[]),
      ),
    ).then((groups) => {
      if (active) setNodes(groups.flat());
    });
    return () => {
      active = false;
    };
  }, [key]);

  return nodes;
}
