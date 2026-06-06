import type { Preset } from "@create-turbo-stack/schema";
import { IntegrationsSchema } from "@create-turbo-stack/schema";
import { describe, expect, it } from "vitest";
import { generateConventionsDoc } from "./resources";

function basePreset(overrides: Partial<Preset> = {}): Preset {
  return {
    schemaVersion: "1.0",
    name: "test",
    version: "0.1.0",
    description: "",
    basics: {
      projectName: "my-project",
      scope: "@my-project",
      packageManager: "bun",
      typescript: "strict",
      linter: "biome",
      gitInit: false,
    },
    database: { strategy: "none" },
    api: { strategy: "none" },
    auth: { provider: "none", rbac: false, entitlements: false },
    css: { framework: "tailwind4", ui: "none", styling: "css-variables" },
    integrations: IntegrationsSchema.parse({ envValidation: "none" }),
    apps: [
      { name: "web", type: "nextjs", port: 3000, i18n: false, location: "apps", consumes: [] },
    ],
    packages: [],
    ...overrides,
  };
}

// ─── generateConventionsDoc ───────────────────────────────────────────────────

describe("generateConventionsDoc — structure", () => {
  it("returns a non-empty string", () => {
    const doc = generateConventionsDoc(basePreset());
    expect(typeof doc).toBe("string");
    expect(doc.length).toBeGreaterThan(0);
  });

  it("includes the project name in the heading", () => {
    const doc = generateConventionsDoc(basePreset());
    expect(doc).toContain("my-project");
  });

  it("includes the package manager", () => {
    const doc = generateConventionsDoc(basePreset());
    expect(doc).toContain("bun");
  });

  it("includes the scope", () => {
    const doc = generateConventionsDoc(basePreset());
    expect(doc).toContain("@my-project");
  });
});

describe("generateConventionsDoc — apps", () => {
  it("lists all apps", () => {
    const doc = generateConventionsDoc(basePreset());
    expect(doc).toContain("web");
    expect(doc).toContain("3000");
  });

  it("lists multiple apps", () => {
    const preset = basePreset({
      apps: [
        { name: "web", type: "nextjs", port: 3000, i18n: false, location: "apps", consumes: [] },
        {
          name: "api",
          type: "hono-standalone",
          port: 3001,
          i18n: false,
          location: "apps",
          consumes: [],
        },
      ],
    });
    const doc = generateConventionsDoc(preset);
    expect(doc).toContain("web");
    expect(doc).toContain("api");
    expect(doc).toContain("3001");
  });

  it("mentions consumes when an app consumes packages", () => {
    const preset = basePreset({
      apps: [
        {
          name: "web",
          type: "nextjs",
          port: 3000,
          i18n: false,
          location: "apps",
          consumes: ["ui"],
        },
      ],
      packages: [
        { name: "ui", type: "ui", location: "packages", producesCSS: true, exports: ["."] },
      ],
    });
    const doc = generateConventionsDoc(preset);
    expect(doc).toContain("ui");
    expect(doc).toContain("consumes");
  });
});

describe("generateConventionsDoc — stack sections", () => {
  it("shows database strategy", () => {
    const preset = basePreset({ database: { strategy: "drizzle", driver: "postgres" } });
    const doc = generateConventionsDoc(preset);
    expect(doc).toContain("drizzle");
  });

  it("shows auth provider", () => {
    const preset = basePreset({ auth: { provider: "clerk", rbac: false, entitlements: false } });
    const doc = generateConventionsDoc(preset);
    expect(doc).toContain("clerk");
  });

  it("includes env vars section when envValidation is set", () => {
    const preset = basePreset({
      integrations: IntegrationsSchema.parse({ envValidation: "t3-env" }),
    });
    const doc = generateConventionsDoc(preset);
    expect(doc).toContain("Environment Variables");
    expect(doc).toContain("@my-project/env");
  });

  it("no env vars section when envValidation is none", () => {
    const doc = generateConventionsDoc(basePreset());
    expect(doc).not.toContain("Environment Variables");
  });
});

describe("generateConventionsDoc — import conventions", () => {
  it("includes workspace import convention", () => {
    const doc = generateConventionsDoc(basePreset());
    expect(doc).toContain("workspace:*");
    expect(doc).toContain("catalog:");
  });

  it("references the scope in import convention", () => {
    const doc = generateConventionsDoc(basePreset());
    expect(doc).toContain("@my-project/{package-name}");
  });
});
