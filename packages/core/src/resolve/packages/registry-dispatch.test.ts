/**
 * Engine integration: does `resolvePackageFiles(preset, pkg, items)` actually
 * route through the registry-first path when a matching item is provided,
 * and fall back to Eta when it isn't?
 *
 * These tests pin the dispatch behaviour without depending on a real,
 * shipped registry item — we hand-craft minimal items with content set so
 * the substituter has something to work with. Once a real slot ships, its
 * own dispatch test will exercise the same path with real content.
 */

import type { Package, PackageRegistryItem } from "@create-turbo-stack/schema";
import { describe, expect, it } from "vitest";
import { makePreset } from "../../preset-factory";
import { resolvePackageFiles } from "./index";

const analyticsPkg: Package = {
  name: "analytics",
  type: "library",
  location: "packages",
  producesCSS: false,
  exports: [".", "./server"],
};

function presetWithVercelAnalytics() {
  return makePreset({
    integrations: {
      analytics: "vercel-analytics",
      errorTracking: "none",
      email: "none",
      rateLimit: "none",
      ai: "none",
      cache: "none",
      envValidation: "t3-env",
    },
  });
}

function fakeVercelAnalyticsItem(): PackageRegistryItem {
  // Mirrors the kind of item agents will write — slot + variant + minimal
  // source. The content here is deliberately a sentinel ("SENTINEL") so the
  // assertion "did the registry path serve this?" is unambiguous.
  return {
    name: "analytics-vercel",
    type: "registry:package",
    slot: "analytics",
    variant: "vercel-analytics",
    description: "Vercel Analytics",
    dependencies: ["@vercel/analytics"],
    devDependencies: [],
    registryDependencies: [],
    envVars: {},
    exports: [".", "./server"],
    build: "none",
    categories: ["analytics"],
    files: [
      {
        path: "src/index.ts",
        type: "registry:source",
        content: "// SENTINEL — {{pkg-import}}\nexport {};\n",
      },
      {
        path: "src/server.ts",
        type: "registry:source",
        content: "// SENTINEL-SERVER\nexport {};\n",
      },
    ],
  };
}

describe("resolvePackageFiles — registry-first dispatch", () => {
  it("with NO items, falls back to the Eta path (back-compat)", () => {
    const preset = presetWithVercelAnalytics();
    const nodes = resolvePackageFiles(preset, analyticsPkg);
    // Should produce SOMETHING via the Eta path. Don't assert exact content
    // here — that's the Eta resolver's job — just that we got files back.
    expect(nodes.length).toBeGreaterThan(0);
    const indexNode = nodes.find((n) => n.path === "packages/analytics/src/index.ts");
    expect(indexNode).toBeDefined();
    expect(indexNode?.content).not.toContain("SENTINEL");
  });

  it("with a matching item, routes through registry path and substitutes placeholders", () => {
    const preset = presetWithVercelAnalytics();
    const nodes = resolvePackageFiles(preset, analyticsPkg, [fakeVercelAnalyticsItem()]);
    const indexNode = nodes.find((n) => n.path === "packages/analytics/src/index.ts");
    expect(indexNode).toBeDefined();
    // Sentinel proves the registry path served this — Eta wouldn't have
    // produced it.
    expect(indexNode?.content).toContain("SENTINEL");
    // Placeholder substitution actually ran: `{{pkg-import}}` → `@test/analytics`
    // (the test preset's default scope is `@test`).
    expect(indexNode?.content).toContain("@test/analytics");
    expect(indexNode?.content).not.toContain("{{");
  });

  it("with a non-matching item, still falls back to Eta", () => {
    const preset = presetWithVercelAnalytics();
    const wrongItem: PackageRegistryItem = {
      ...fakeVercelAnalyticsItem(),
      variant: "plausible", // wrong variant — won't match the request
    };
    const nodes = resolvePackageFiles(preset, analyticsPkg, [wrongItem]);
    const indexNode = nodes.find((n) => n.path === "packages/analytics/src/index.ts");
    expect(indexNode?.content).not.toContain("SENTINEL");
  });

  it("emits package.json with the item's dependencies as catalog refs", () => {
    const preset = presetWithVercelAnalytics();
    const nodes = resolvePackageFiles(preset, analyticsPkg, [fakeVercelAnalyticsItem()]);
    const pkgJson = nodes.find((n) => n.path === "packages/analytics/package.json");
    expect(pkgJson?.content).toBeDefined();
    const parsed = JSON.parse(pkgJson?.content ?? "{}");
    expect(parsed.dependencies?.["@vercel/analytics"]).toBe("catalog:");
    expect(parsed.name).toBe("@test/analytics");
  });
});
