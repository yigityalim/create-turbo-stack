import type { App, Preset } from "@create-turbo-stack/schema";
import { IntegrationsSchema, ValidatedPresetSchema } from "@create-turbo-stack/schema";
import { describe, expect, it } from "vitest";

function makeApp(name: string, port = 3000, consumes: string[] = []): App {
  return { name, type: "nextjs", port, i18n: false, location: "apps", consumes };
}

function basePreset(overrides: Partial<Preset> = {}): Preset {
  return {
    schemaVersion: "1.0",
    name: "test",
    version: "0.1.0",
    description: "",
    basics: {
      projectName: "test",
      scope: "@test",
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
    apps: [makeApp("web")],
    packages: [],
    ...overrides,
  };
}

// ─── schema: remove last app ──────────────────────────────────────────────────

describe("ValidatedPresetSchema — removing the last app", () => {
  it("rejects a preset with no apps", () => {
    const result = ValidatedPresetSchema.safeParse({ ...basePreset(), apps: [] });
    expect(result.success).toBe(false);
  });

  it("accepts a preset that still has one app after removal", () => {
    const preset = basePreset({ apps: [makeApp("web"), makeApp("api", 3001)] });
    const updated = { ...preset, apps: preset.apps.filter((a) => a.name !== "api") };
    const result = ValidatedPresetSchema.safeParse(updated);
    expect(result.success).toBe(true);
  });

  it("error path mentions 'apps' when apps array is empty", () => {
    const result = ValidatedPresetSchema.safeParse({ ...basePreset(), apps: [] });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths.some((p) => p.startsWith("apps"))).toBe(true);
    }
  });
});

// ─── remove app — preset mutation logic ───────────────────────────────────────

describe("remove app — mutation logic", () => {
  it("filters out the targeted app by name", () => {
    const preset = basePreset({ apps: [makeApp("web"), makeApp("api", 3001)] });
    const updated: Preset = { ...preset, apps: preset.apps.filter((a) => a.name !== "api") };
    expect(updated.apps).toHaveLength(1);
    expect(updated.apps[0]?.name).toBe("web");
  });

  it("does not remove an app that doesn't match", () => {
    const preset = basePreset({ apps: [makeApp("web"), makeApp("api", 3001)] });
    const updated: Preset = {
      ...preset,
      apps: preset.apps.filter((a) => a.name !== "admin"),
    };
    expect(updated.apps).toHaveLength(2);
  });

  it("resulting preset passes schema validation", () => {
    const preset = basePreset({ apps: [makeApp("web"), makeApp("api", 3001)] });
    const updated: Preset = { ...preset, apps: preset.apps.filter((a) => a.name !== "api") };
    expect(ValidatedPresetSchema.safeParse(updated).success).toBe(true);
  });
});

// ─── remove package — consumes cleanup ───────────────────────────────────────

describe("remove package — consumes cleanup logic", () => {
  it("removes pkg name from all app consumes", () => {
    const preset = basePreset({
      apps: [makeApp("web", 3000, ["ui", "db"]), makeApp("api", 3001, ["db"])],
      packages: [
        { name: "ui", type: "ui", location: "packages", producesCSS: true, exports: ["."] },
        { name: "db", type: "utils", location: "packages", producesCSS: false, exports: ["."] },
      ],
    });
    const target = "db";
    const updated: Preset = {
      ...preset,
      packages: preset.packages.filter((p) => p.name !== target),
      apps: preset.apps.map((a) => ({
        ...a,
        consumes: a.consumes.filter((c) => c !== target),
      })),
    };
    expect(updated.packages).toHaveLength(1);
    expect(updated.apps[0]?.consumes).toEqual(["ui"]);
    expect(updated.apps[1]?.consumes).toHaveLength(0);
  });

  it("leaves apps that didn't consume the removed package untouched", () => {
    const preset = basePreset({
      apps: [makeApp("web", 3000, ["ui"])],
      packages: [
        { name: "ui", type: "ui", location: "packages", producesCSS: true, exports: ["."] },
        { name: "db", type: "utils", location: "packages", producesCSS: false, exports: ["."] },
      ],
    });
    const updated: Preset = {
      ...preset,
      packages: preset.packages.filter((p) => p.name !== "db"),
      apps: preset.apps.map((a) => ({
        ...a,
        consumes: a.consumes.filter((c) => c !== "db"),
      })),
    };
    expect(updated.apps[0]?.consumes).toEqual(["ui"]);
  });

  it("resulting preset passes schema validation", () => {
    const preset = basePreset({
      apps: [makeApp("web", 3000, ["ui"])],
      packages: [
        { name: "ui", type: "ui", location: "packages", producesCSS: true, exports: ["."] },
      ],
    });
    const updated: Preset = {
      ...preset,
      packages: preset.packages.filter((p) => p.name !== "ui"),
      apps: preset.apps.map((a) => ({ ...a, consumes: a.consumes.filter((c) => c !== "ui") })),
    };
    expect(ValidatedPresetSchema.safeParse(updated).success).toBe(true);
  });
});

// ─── remove integration — preset mutation logic ───────────────────────────────

describe("remove integration — mutation logic", () => {
  it("sets integration category back to 'none'", () => {
    const preset = basePreset({
      integrations: IntegrationsSchema.parse({ analytics: "posthog", envValidation: "none" }),
    });
    const updated: Preset = {
      ...preset,
      integrations: { ...preset.integrations, analytics: "none" },
    };
    expect(updated.integrations.analytics).toBe("none");
    expect(updated.integrations.envValidation).toBe("none");
  });

  it("resulting preset passes schema validation after zeroing analytics", () => {
    const preset = basePreset({
      integrations: IntegrationsSchema.parse({ analytics: "posthog", envValidation: "none" }),
    });
    const updated: Preset = {
      ...preset,
      integrations: { ...preset.integrations, analytics: "none" },
    };
    expect(ValidatedPresetSchema.safeParse(updated).success).toBe(true);
  });
});
