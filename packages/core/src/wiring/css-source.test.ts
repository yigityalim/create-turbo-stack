import type { Preset } from "@create-turbo-stack/schema";
import { describe, expect, it } from "vitest";
import { computeCssSourceMap } from "./css-source";

// ---------------------------------------------------------------------------
// Minimal Preset factory
// Produces a structurally valid Preset without going through Zod — wiring
// functions accept the plain `Preset` type, so we don't need safeParse here.
// ---------------------------------------------------------------------------

function makePreset(overrides: Partial<Preset> = {}): Preset {
  return {
    name: "test",
    version: "1.0.0",
    basics: {
      projectName: "test-project",
      packageManager: "bun",
      scope: "@test",
      typescript: "strict",
      linter: "biome",
      gitInit: false,
    },
    database: { strategy: "none" },
    api: { strategy: "none" },
    auth: { provider: "none", rbac: false, entitlements: false },
    css: { framework: "tailwind4", ui: "none", styling: "css-variables" },
    integrations: {
      analytics: "none",
      errorTracking: "none",
      email: "none",
      rateLimit: "none",
      ai: "none",
      envValidation: false,
    },
    apps: [],
    packages: [],
    ...overrides,
  } as Preset;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("computeCssSourceMap", () => {
  it("app with no CSS packages consumed → only self source", () => {
    const preset = makePreset({
      apps: [
        {
          name: "web",
          type: "nextjs",
          port: 3000,
          i18n: false,
          cms: "none",
          consumes: [],
        },
      ],
      packages: [{ name: "utils", type: "utils", producesCSS: false, exports: ["."] }],
    });

    const map = computeCssSourceMap(preset);

    expect(map.web).toEqual(["../../src"]);
  });

  it("app consuming one CSS-producing package → self + package source", () => {
    const preset = makePreset({
      apps: [
        {
          name: "web",
          type: "nextjs",
          port: 3000,
          i18n: false,
          cms: "none",
          consumes: ["ui"],
        },
      ],
      packages: [
        {
          name: "ui",
          type: "react-library",
          producesCSS: true,
          exports: ["."],
        },
      ],
    });

    const map = computeCssSourceMap(preset);

    expect(map.web).toEqual(["../../src", "../../../../packages/ui/src"]);
  });

  it("API-only app → not present in map", () => {
    const preset = makePreset({
      apps: [
        {
          name: "api",
          type: "nextjs-api-only",
          port: 3001,
          i18n: false,
          cms: "none",
          consumes: [],
        },
      ],
      packages: [
        {
          name: "ui",
          type: "react-library",
          producesCSS: true,
          exports: ["."],
        },
      ],
    });

    const map = computeCssSourceMap(preset);

    expect(map.api).toBeUndefined();
  });

  it("multiple apps consuming different packages → correct per-app sources", () => {
    const preset = makePreset({
      apps: [
        {
          name: "web",
          type: "nextjs",
          port: 3000,
          i18n: false,
          cms: "none",
          consumes: ["ui"],
        },
        {
          name: "marketing",
          type: "astro",
          port: 3002,
          i18n: false,
          cms: "none",
          consumes: ["design-system"],
        },
      ],
      packages: [
        {
          name: "ui",
          type: "react-library",
          producesCSS: true,
          exports: ["."],
        },
        {
          name: "design-system",
          type: "react-library",
          producesCSS: true,
          exports: ["."],
        },
        { name: "utils", type: "utils", producesCSS: false, exports: ["."] },
      ],
    });

    const map = computeCssSourceMap(preset);

    expect(map.web).toEqual(["../../src", "../../../../packages/ui/src"]);
    expect(map.marketing).toEqual(["../../src", "../../../../packages/design-system/src"]);
  });
});
