import type { PackageRegistryItem } from "@create-turbo-stack/schema";
import { describe, expect, it } from "vitest";
import { makeFullPreset, makePreset, WEB_APP } from "../preset-factory";
import { computeCatalog } from "./catalog";
import { VERSIONS } from "./versions";

// Minimal registry item — only the required fields.
function item(overrides: Partial<PackageRegistryItem> & { name: string }): PackageRegistryItem {
  return {
    type: "registry:package",
    description: "test",
    dependencies: [],
    devDependencies: [],
    registryDependencies: [],
    envVars: {},
    exports: ["."],
    build: "none",
    categories: [],
    files: [],
    ...overrides,
  };
}

// Helpers
const names = (entries: { name: string }[]) => entries.map((e) => e.name);
const version = (entries: { name: string; version: string }[], name: string) =>
  entries.find((e) => e.name === name)?.version;

// ─── Always-present entries ────────────────────────────────────────────────────

describe("computeCatalog — always-present entries", () => {
  it("includes typescript and @types/node for any preset", () => {
    const catalog = computeCatalog(makePreset());
    expect(names(catalog)).toContain("typescript");
    expect(names(catalog)).toContain("@types/node");
  });

  it("uses versions from VERSIONS map", () => {
    const catalog = computeCatalog(makePreset());
    expect(version(catalog, "typescript")).toBe(VERSIONS.typescript);
    expect(version(catalog, "@types/node")).toBe(VERSIONS.typesNode);
  });

  it("includes biome when linter is biome", () => {
    const catalog = computeCatalog(makePreset());
    expect(names(catalog)).toContain("@biomejs/biome");
  });
});

// ─── App-driven entries ────────────────────────────────────────────────────────

describe("computeCatalog — Next.js app", () => {
  const preset = makePreset({ apps: [WEB_APP] });
  const catalog = computeCatalog(preset);

  it("adds react, react-dom, next", () => {
    expect(names(catalog)).toContain("react");
    expect(names(catalog)).toContain("react-dom");
    expect(names(catalog)).toContain("next");
  });

  it("adds @types/react and @types/react-dom", () => {
    expect(names(catalog)).toContain("@types/react");
    expect(names(catalog)).toContain("@types/react-dom");
  });

  it("uses VERSIONS for react and next", () => {
    expect(version(catalog, "react")).toBe(VERSIONS.react);
    expect(version(catalog, "next")).toBe(VERSIONS.next);
  });
});

describe("computeCatalog — hono-standalone app", () => {
  const preset = makePreset({
    apps: [
      {
        name: "api",
        type: "hono-standalone",
        location: "apps",
        port: 3001,
        i18n: false,
        consumes: [],
      },
    ],
  });
  const catalog = computeCatalog(preset);

  it("adds hono, @hono/node-server, tsx", () => {
    expect(names(catalog)).toContain("hono");
    expect(names(catalog)).toContain("@hono/node-server");
    expect(names(catalog)).toContain("tsx");
  });

  it("does NOT add react or next", () => {
    expect(names(catalog)).not.toContain("react");
    expect(names(catalog)).not.toContain("next");
  });
});

describe("computeCatalog — i18n app", () => {
  it("adds next-intl when app has i18n:true", () => {
    const preset = makePreset({
      apps: [{ ...WEB_APP, i18n: true }],
    });
    const catalog = computeCatalog(preset);
    expect(names(catalog)).toContain("next-intl");
  });

  it("does NOT add next-intl when i18n:false", () => {
    const preset = makePreset({ apps: [WEB_APP] });
    const catalog = computeCatalog(preset);
    expect(names(catalog)).not.toContain("next-intl");
  });
});

describe("computeCatalog — shadcn UI", () => {
  it("adds tw-animate-css, clsx, tailwind-merge when ui is shadcn", () => {
    const preset = makePreset({
      apps: [WEB_APP],
      css: { framework: "tailwind4", ui: "shadcn", styling: "css-variables" },
    });
    const catalog = computeCatalog(preset);
    expect(names(catalog)).toContain("tw-animate-css");
    expect(names(catalog)).toContain("clsx");
    expect(names(catalog)).toContain("tailwind-merge");
  });

  it("does NOT add tw-animate-css when ui is none", () => {
    const preset = makePreset({ apps: [WEB_APP] });
    const catalog = computeCatalog(preset);
    expect(names(catalog)).not.toContain("tw-animate-css");
  });
});

// ─── Registry item entries ─────────────────────────────────────────────────────

describe("computeCatalog — registry items", () => {
  it("adds deps from an item's dependencies array", () => {
    const items = [item({ name: "test-pkg", dependencies: ["zod@^4.0.0"] })];
    const catalog = computeCatalog(makePreset(), items);
    expect(names(catalog)).toContain("zod");
    expect(version(catalog, "zod")).toBe("^4.0.0");
  });

  it("adds deps from an item's devDependencies array", () => {
    const items = [item({ name: "test-pkg", devDependencies: ["vitest@^4.0.0"] })];
    const catalog = computeCatalog(makePreset(), items);
    expect(names(catalog)).toContain("vitest");
    expect(version(catalog, "vitest")).toBe("^4.0.0");
  });

  it("resolves bare name via VERSIONS map (zod → VERSIONS.zod)", () => {
    const items = [item({ name: "test-pkg", dependencies: ["zod"] })];
    const catalog = computeCatalog(makePreset(), items);
    expect(version(catalog, "zod")).toBe(VERSIONS.zod);
  });

  it("falls back to 'latest' for completely unknown packages", () => {
    const items = [item({ name: "test-pkg", dependencies: ["some-unknown-library"] })];
    const catalog = computeCatalog(makePreset(), items);
    expect(version(catalog, "some-unknown-library")).toBe("latest");
  });

  it("first writer wins — duplicate dep from two items keeps first version", () => {
    const items = [
      item({ name: "item-a", dependencies: ["zod@^3.0.0"] }),
      item({ name: "item-b", dependencies: ["zod@^4.0.0"] }),
    ];
    const catalog = computeCatalog(makePreset(), items);
    expect(version(catalog, "zod")).toBe("^3.0.0");
    expect(catalog.filter((e) => e.name === "zod")).toHaveLength(1);
  });

  it("no duplicate entries in output", () => {
    const items = [
      item({ name: "item-a", dependencies: ["react"] }),
      item({ name: "item-b", dependencies: ["react"] }),
    ];
    const catalog = computeCatalog(makePreset({ apps: [WEB_APP] }), items);
    const reactEntries = catalog.filter((e) => e.name === "react");
    expect(reactEntries).toHaveLength(1);
  });
});

// ─── Full preset ───────────────────────────────────────────────────────────────

describe("computeCatalog — full preset", () => {
  it("produces a non-empty catalog with all major framework deps", () => {
    const catalog = computeCatalog(makeFullPreset());
    const required = ["typescript", "react", "next", "tailwindcss", "tw-animate-css", "next-intl"];
    for (const pkg of required) {
      expect(names(catalog), `missing ${pkg}`).toContain(pkg);
    }
  });

  it("returns an array of { name, version } objects", () => {
    const catalog = computeCatalog(makePreset());
    for (const entry of catalog) {
      expect(typeof entry.name).toBe("string");
      expect(entry.name.length).toBeGreaterThan(0);
      expect(typeof entry.version).toBe("string");
      expect(entry.version.length).toBeGreaterThan(0);
    }
  });
});
