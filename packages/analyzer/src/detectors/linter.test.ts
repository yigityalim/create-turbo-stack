import { afterEach, describe, expect, it } from "vitest";
import { createFixture, removeFixture } from "../test-utils/fixture";
import { detectLinter } from "./linter";

let tmp: string;

afterEach(async () => {
  if (tmp) await removeFixture(tmp);
});

describe("detectLinter", () => {
  // biome.json / biome.jsonc — certain

  it("detects biome via biome.json at root", async () => {
    tmp = await createFixture({
      "biome.json": { formatter: { enabled: true } },
    });
    const r = await detectLinter(tmp);
    expect(r.value).toBe("biome");
    expect(r.confidence).toBe("certain");
    expect(r.reason).toMatch(/biome\.json/);
  });

  it("detects biome via biome.jsonc at root", async () => {
    tmp = await createFixture({
      "biome.jsonc": '{ /* jsonc */ "formatter": {} }',
    });
    const r = await detectLinter(tmp);
    expect(r.value).toBe("biome");
    expect(r.confidence).toBe("certain");
    expect(r.reason).toMatch(/biome\.jsonc/);
  });

  it("biome.json takes priority over eslint config file", async () => {
    tmp = await createFixture({ "biome.json": {}, ".eslintrc.json": {} });
    const r = await detectLinter(tmp);
    expect(r.value).toBe("biome");
    expect(r.confidence).toBe("certain");
  });

  // ESLint config files — high

  const eslintFiles = [
    ".eslintrc.js",
    ".eslintrc.json",
    ".eslintrc.cjs",
    ".eslintrc.yml",
    "eslint.config.js",
    "eslint.config.mjs",
  ];

  for (const file of eslintFiles) {
    it(`detects eslint-prettier via ${file}`, async () => {
      tmp = await createFixture({ [file]: "module.exports = {}" });
      const r = await detectLinter(tmp);
      expect(r.value).toBe("eslint-prettier");
      expect(r.confidence).toBe("high");
      expect(r.reason).toContain(file);
      await removeFixture(tmp);
    });
  }

  it("detects biome via @biomejs/biome in devDependencies", async () => {
    tmp = await createFixture({
      "package.json": { devDependencies: { "@biomejs/biome": "^1.9.0" } },
    });
    const r = await detectLinter(tmp);
    expect(r.value).toBe("biome");
    expect(r.confidence).toBe("high");
    expect(r.reason).toMatch(/@biomejs\/biome/);
  });

  it("detects eslint via eslint in devDependencies", async () => {
    tmp = await createFixture({
      "package.json": { devDependencies: { eslint: "^9.0.0" } },
    });
    const r = await detectLinter(tmp);
    expect(r.value).toBe("eslint-prettier");
    expect(r.confidence).toBe("high");
  });

  it("@biomejs/biome in deps takes priority over eslint in deps", async () => {
    tmp = await createFixture({
      "package.json": {
        devDependencies: { "@biomejs/biome": "^1.9.0", eslint: "^9.0.0" },
      },
    });
    const r = await detectLinter(tmp);
    expect(r.value).toBe("biome");
  });

  // Default fallback — low

  it("defaults to biome with low confidence when nothing found", async () => {
    tmp = await createFixture({ "package.json": { name: "empty-pkg" } });
    const r = await detectLinter(tmp);
    expect(r.value).toBe("biome");
    expect(r.confidence).toBe("low");
  });

  it("defaults to biome for empty directory", async () => {
    const { mkdtemp } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    tmp = await mkdtemp(`${tmpdir()}/linter-empty-`);
    const r = await detectLinter(tmp);
    expect(r.value).toBe("biome");
    expect(r.confidence).toBe("low");
  });

  // Edge cases

  it("does not detect eslint config in subdirectories", async () => {
    tmp = await createFixture({ "apps/web/.eslintrc.json": {} });
    const r = await detectLinter(tmp);
    // No root-level eslint config → fallback
    expect(r.confidence).toBe("low");
  });

  it("does not detect biome.json in subdirectory as certain", async () => {
    tmp = await createFixture({ "packages/config/biome.json": {} });
    const r = await detectLinter(tmp);
    expect(r.confidence).toBe("low");
  });

  it("handles package.json with no dep sections", async () => {
    tmp = await createFixture({ "package.json": { name: "bare" } });
    const r = await detectLinter(tmp);
    expect(r.value).toBe("biome");
    expect(r.confidence).toBe("low");
  });

  it("handles malformed package.json gracefully", async () => {
    const fs = await import("node:fs/promises");
    const os = await import("node:os");
    tmp = await fs.mkdtemp(`${os.tmpdir()}/linter-malform-`);
    await fs.writeFile(`${tmp}/package.json`, "NOT JSON");
    const r = await detectLinter(tmp);
    expect(r.value).toBe("biome");
    expect(r.confidence).toBe("low");
  });
});
