/**
 * Regression test: `src/browser.ts` and every module it transitively imports
 * must be free of `eta` and `node:*` builtins. Without this gate, an
 * innocent-looking re-export elsewhere in the tree (e.g. anything that pulls
 * the integrations barrel) silently leaks `eta`'s `node:fs` import into the
 * web builder's client bundle and breaks the Turbopack build.
 *
 * The check is purely static: walk relative imports starting from
 * `browser.ts`, fail if any module's source text contains a forbidden import.
 * Bare-module imports (e.g. `@create-turbo-stack/schema`) are presumed safe
 * — except `eta`, which we explicitly forbid.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// ESM doesn't expose `__dirname`; derive it from `import.meta.url` instead.
const HERE = dirname(fileURLToPath(import.meta.url));

const FORBIDDEN_BARE = new Set(["eta"]);
const FORBIDDEN_BARE_PREFIX = "node:";

/** Resolve a relative TS specifier to an on-disk file path. */
function resolveRelative(fromFile: string, spec: string): string | null {
  const base = resolve(dirname(fromFile), spec);
  const candidates = [base, `${base}.ts`, `${base}/index.ts`];
  for (const path of candidates) {
    try {
      readFileSync(path, "utf8");
      return path;
    } catch {
      // not this candidate
    }
  }
  return null;
}

/** Extract every `import …` source specifier (static + re-export). */
function extractImports(source: string): string[] {
  // Strip line + block comments to avoid false positives in doc snippets.
  const stripped = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const specs: string[] = [];
  const re = /(?:import|export)[\s\S]*?from\s+["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  m = re.exec(stripped);
  while (m !== null) {
    specs.push(m[1]);
    m = re.exec(stripped);
  }
  // Also catch side-effect imports: `import "./foo"`
  const sideRe = /import\s+["']([^"']+)["']/g;
  m = sideRe.exec(stripped);
  while (m !== null) {
    specs.push(m[1]);
    m = sideRe.exec(stripped);
  }
  return specs;
}

/**
 * Walk imports starting from `entry`, collecting `(file, forbiddenSpec)` for
 * every offending import. Test files are skipped (they're allowed to import
 * Node builtins for their own machinery).
 */
function collectForbidden(entry: string): Array<{ file: string; spec: string }> {
  const offenders: Array<{ file: string; spec: string }> = [];
  const visited = new Set<string>();
  const stack = [entry];

  while (stack.length > 0) {
    const file = stack.pop();
    if (!file || visited.has(file)) continue;
    visited.add(file);

    const source = readFileSync(file, "utf8");
    for (const spec of extractImports(source)) {
      if (spec.startsWith(".")) {
        const resolved = resolveRelative(file, spec);
        if (resolved && !resolved.endsWith(".test.ts")) {
          stack.push(resolved);
        }
        continue;
      }
      // Bare specifier — check the forbid list.
      if (FORBIDDEN_BARE.has(spec) || spec.startsWith(FORBIDDEN_BARE_PREFIX)) {
        offenders.push({ file, spec });
      }
    }
  }

  return offenders;
}

describe("browser entry transitive safety", () => {
  it("src/browser.ts and everything it imports avoid `eta` and `node:*`", () => {
    const entry = resolve(HERE, "browser.ts");
    const offenders = collectForbidden(entry);
    expect(
      offenders,
      `\nForbidden imports reachable from src/browser.ts:\n${offenders
        .map((o) => `  ${o.file.replace(/^.*\/packages\/core\//, "packages/core/")}: ${o.spec}`)
        .join(
          "\n",
        )}\n\nThe browser entry MUST stay free of \`eta\` and \`node:*\` so Turbopack can bundle it for the client. See the header of src/browser.ts for the rules.`,
    ).toEqual([]);
  });
});

describe("Node entry — Eta-free assertion", () => {
  it("src/index.ts and everything it imports avoid `eta`", () => {
    // After the registry-first migration the engine renders content
    // through the substituter, not Eta. This guard locks the migration
    // in place — anything that re-introduces an `eta` import in core
    // fails CI loudly.
    const entry = resolve(HERE, "index.ts");
    const offenders = collectForbidden(entry).filter((o) => o.spec === "eta");
    expect(
      offenders,
      `\n\`eta\` is no longer a core dependency. Offending files:\n${offenders
        .map((o) => `  ${o.file.replace(/^.*\/packages\/core\//, "packages/core/")}`)
        .join("\n")}`,
    ).toEqual([]);
  });
});
