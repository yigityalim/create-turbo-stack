import type { Linter } from "@create-turbo-stack/schema";
import { describe, expect, it } from "vitest";
import { makePreset, UTILS_PKG } from "../preset-factory";
import { resolveFileTree } from "../resolve/file-tree";

function tree(linter: Linter) {
  const base = makePreset();
  return resolveFileTree(makePreset({ basics: { ...base.basics, linter }, packages: [UTILS_PKG] }));
}
const has = (t: ReturnType<typeof tree>, p: string) => t.nodes.some((n) => n.path === p);
const content = (t: ReturnType<typeof tree>, p: string) =>
  t.nodes.find((n) => n.path === p)?.content ?? "";
const pkg = (t: ReturnType<typeof tree>, p: string) => JSON.parse(content(t, p));

describe("linter wiring — biome", () => {
  const t = tree("biome");
  it("emits biome.json and no eslint/prettier config", () => {
    expect(has(t, "biome.json")).toBe(true);
    expect(has(t, "eslint.config.mjs")).toBe(false);
    expect(has(t, ".prettierrc")).toBe(false);
  });
  it("package lints with biome and depends on it", () => {
    const p = pkg(t, "packages/utils/package.json");
    expect(p.scripts.lint).toBe("biome check");
    expect(p.devDependencies["@biomejs/biome"]).toBe("catalog:");
    expect(has(t, "packages/utils/eslint.config.mjs")).toBe(false);
  });
  it("root formats with biome", () => {
    expect(pkg(t, "package.json").scripts.format).toContain("biome format");
  });
});

describe("linter wiring — oxlint", () => {
  const t = tree("oxlint");
  it("emits .oxlintrc.json + .prettierrc, no biome.json", () => {
    expect(has(t, ".oxlintrc.json")).toBe(true);
    expect(has(t, ".prettierrc")).toBe(true);
    expect(has(t, "biome.json")).toBe(false);
  });
  it("package lints with oxlint; root formats with prettier", () => {
    expect(pkg(t, "packages/utils/package.json").scripts.lint).toBe("oxlint");
    expect(pkg(t, "packages/utils/package.json").devDependencies.oxlint).toBe("catalog:");
    expect(pkg(t, "package.json").scripts.format).toContain("prettier");
  });
});

describe("linter wiring — eslint-prettier", () => {
  const t = tree("eslint-prettier");
  it("emits root eslint.config.mjs + .prettierrc", () => {
    expect(has(t, "eslint.config.mjs")).toBe(true);
    expect(has(t, ".prettierrc")).toBe(true);
    expect(has(t, "biome.json")).toBe(false);
  });
  it("each package re-exports the root flat config and lints with eslint", () => {
    expect(pkg(t, "packages/utils/package.json").scripts.lint).toBe("eslint .");
    expect(pkg(t, "packages/utils/package.json").devDependencies.eslint).toBe("catalog:");
    expect(has(t, "packages/utils/eslint.config.mjs")).toBe(true);
    expect(content(t, "packages/utils/eslint.config.mjs")).toContain(
      'from "../../eslint.config.mjs"',
    );
  });
});
