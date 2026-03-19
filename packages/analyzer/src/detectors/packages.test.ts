import { afterEach, describe, expect, it } from "vitest";
import { createFixture, removeFixture } from "../test-utils/fixture";
import { detectPackages } from "./packages";

let tmp: string;

afterEach(async () => {
  if (tmp) await removeFixture(tmp);
});

describe("detectPackages", () => {
  // ---------------------------------------------------------------------------
  // AUTO_PACKAGE_NAMES exclusion
  // ---------------------------------------------------------------------------

  const AUTO_PACKAGES = [
    "typescript-config",
    "env",
    "db",
    "api",
    "auth",
    "analytics",
    "monitoring",
    "email",
    "rate-limit",
    "ai",
  ];

  for (const name of AUTO_PACKAGES) {
    it(`excludes auto-generated package: ${name}`, async () => {
      tmp = await createFixture({
        [`packages/${name}/package.json`]: { name: `@scope/${name}` },
      });
      const r = await detectPackages(tmp);
      expect(r.packages.find((p) => p.name === name)).toBeUndefined();
      await removeFixture(tmp);
    });
  }

  // ---------------------------------------------------------------------------
  // Package type detection
  // ---------------------------------------------------------------------------

  it("detects ui type for package named 'ui'", async () => {
    tmp = await createFixture({
      "packages/ui/package.json": {
        name: "@scope/ui",
        dependencies: { react: "^19.0.0" },
      },
    });
    const r = await detectPackages(tmp);
    expect(r.packages[0].type).toBe("ui");
    expect(r.detections[0].confidence).toBe("high");
  });

  it("detects ui type for package ending with '-ui'", async () => {
    tmp = await createFixture({
      "packages/design-ui/package.json": { name: "@scope/design-ui" },
    });
    const r = await detectPackages(tmp);
    expect(r.packages[0].type).toBe("ui");
  });

  it("detects react-library when react dep present (non-ui name)", async () => {
    tmp = await createFixture({
      "packages/components/package.json": {
        name: "@scope/components",
        dependencies: { react: "^19.0.0" },
      },
    });
    const r = await detectPackages(tmp);
    expect(r.packages[0].type).toBe("react-library");
    expect(r.detections[0].confidence).toBe("high");
  });

  it("detects config type for package named 'config'", async () => {
    tmp = await createFixture({
      "packages/config/package.json": { name: "@scope/config" },
    });
    const r = await detectPackages(tmp);
    expect(r.packages[0].type).toBe("config");
  });

  it("detects config type for package ending with '-config'", async () => {
    tmp = await createFixture({
      "packages/eslint-config/package.json": { name: "@scope/eslint-config" },
    });
    const r = await detectPackages(tmp);
    expect(r.packages[0].type).toBe("config");
  });

  it("detects utils type for package named 'utils'", async () => {
    tmp = await createFixture({
      "packages/utils/package.json": { name: "@scope/utils" },
    });
    const r = await detectPackages(tmp);
    expect(r.packages[0].type).toBe("utils");
  });

  it("detects utils type for package ending with '-utils'", async () => {
    tmp = await createFixture({
      "packages/date-utils/package.json": { name: "@scope/date-utils" },
    });
    const r = await detectPackages(tmp);
    expect(r.packages[0].type).toBe("utils");
  });

  it("falls back to library/medium for generic package name", async () => {
    tmp = await createFixture({
      "packages/core/package.json": { name: "@scope/core" },
    });
    const r = await detectPackages(tmp);
    expect(r.packages[0].type).toBe("library");
    expect(r.detections[0].confidence).toBe("medium");
  });

  // ---------------------------------------------------------------------------
  // producesCSS
  // ---------------------------------------------------------------------------

  it("producesCSS is true when tailwindcss in deps", async () => {
    tmp = await createFixture({
      "packages/ui/package.json": {
        name: "@scope/ui",
        dependencies: { react: "^19.0.0", tailwindcss: "^4.0.0" },
      },
    });
    const r = await detectPackages(tmp);
    expect(r.packages[0].producesCSS).toBe(true);
  });

  it("producesCSS is true when src/globals.css exists", async () => {
    tmp = await createFixture({
      "packages/ui/package.json": {
        name: "@scope/ui",
        dependencies: { react: "^19.0.0" },
      },
      "packages/ui/src/globals.css": ":root { --primary: blue; }",
    });
    const r = await detectPackages(tmp);
    expect(r.packages[0].producesCSS).toBe(true);
  });

  it("producesCSS is false when no tailwind and no globals.css", async () => {
    tmp = await createFixture({
      "packages/core/package.json": { name: "@scope/core" },
    });
    const r = await detectPackages(tmp);
    expect(r.packages[0].producesCSS).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // exports detection
  // ---------------------------------------------------------------------------

  it("returns ['.'] when exports field is absent", async () => {
    tmp = await createFixture({
      "packages/core/package.json": { name: "@scope/core" },
    });
    const r = await detectPackages(tmp);
    expect(r.packages[0].exports).toEqual(["."]);
  });

  it("returns ['.'] when exports is a string", async () => {
    tmp = await createFixture({
      "packages/core/package.json": {
        name: "@scope/core",
        exports: "./dist/index.js",
      },
    });
    const r = await detectPackages(tmp);
    expect(r.packages[0].exports).toEqual(["."]);
  });

  it("returns object keys when exports is a record", async () => {
    tmp = await createFixture({
      "packages/core/package.json": {
        name: "@scope/core",
        exports: {
          ".": "./dist/index.js",
          "./utils": "./dist/utils.js",
          "./types": "./dist/types.js",
        },
      },
    });
    const r = await detectPackages(tmp);
    expect(r.packages[0].exports.sort()).toEqual([".", "./types", "./utils"].sort());
  });

  // ---------------------------------------------------------------------------
  // Multiple packages
  // ---------------------------------------------------------------------------

  it("returns all non-auto packages", async () => {
    tmp = await createFixture({
      "packages/ui/package.json": {
        name: "@scope/ui",
        dependencies: { react: "^19.0.0" },
      },
      "packages/utils/package.json": { name: "@scope/utils" },
      "packages/core/package.json": { name: "@scope/core" },
      "packages/db/package.json": { name: "@scope/db" }, // excluded
      "packages/auth/package.json": { name: "@scope/auth" }, // excluded
    });
    const r = await detectPackages(tmp);
    expect(r.packages.length).toBe(3);
    const names = r.packages.map((p) => p.name).sort();
    expect(names).toEqual(["core", "ui", "utils"].sort());
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  it("returns empty when packages dir does not exist", async () => {
    const { mkdtemp } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    tmp = await mkdtemp(`${tmpdir()}/pkgs-no-dir-`);
    const r = await detectPackages(tmp);
    expect(r.packages).toEqual([]);
    expect(r.detections).toEqual([]);
  });

  it("skips package with missing package.json", async () => {
    const fs = await import("node:fs/promises");
    const os = await import("node:os");
    tmp = await fs.mkdtemp(`${os.tmpdir()}/pkgs-missing-`);
    await fs.mkdir(`${tmp}/packages/orphan`, { recursive: true });
    // No package.json inside orphan
    const r = await detectPackages(tmp);
    expect(r.packages).toEqual([]);
  });

  it("skips package with malformed package.json", async () => {
    const fs = await import("node:fs/promises");
    const os = await import("node:os");
    tmp = await fs.mkdtemp(`${os.tmpdir()}/pkgs-malform-`);
    await fs.mkdir(`${tmp}/packages/broken`, { recursive: true });
    await fs.writeFile(`${tmp}/packages/broken/package.json`, "NOT JSON");
    const r = await detectPackages(tmp);
    expect(r.packages).toEqual([]);
  });

  it("detection value string includes package name and type", async () => {
    tmp = await createFixture({
      "packages/core/package.json": { name: "@scope/core" },
    });
    const r = await detectPackages(tmp);
    expect(r.detections[0].value).toMatch(/core/);
    expect(r.detections[0].value).toMatch(/library/);
  });
});
