import type { App, Package, Preset } from "@create-turbo-stack/schema";
import { IntegrationsSchema } from "@create-turbo-stack/schema";
import { describe, expect, it } from "vitest";
import { presetReducer } from "./reducer";

function makeApp(name: string, port = 3000, consumes: string[] = []): App {
  return {
    name,
    type: "nextjs",
    port,
    i18n: false,
    location: "apps",
    consumes,
  };
}

function makePkg(name: string): Package {
  return {
    name,
    type: "utils",
    location: "packages",
    producesCSS: false,
    exports: ["."],
  };
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

// ─── SET_BASICS ───────────────────────────────────────────────────────────────

describe("SET_BASICS", () => {
  it("updates packageManager", () => {
    const state = presetReducer(basePreset(), {
      type: "SET_BASICS",
      payload: { packageManager: "pnpm" },
    });
    expect(state.basics.packageManager).toBe("pnpm");
  });

  it("keeps other basics fields unchanged", () => {
    const state = presetReducer(basePreset(), {
      type: "SET_BASICS",
      payload: { packageManager: "pnpm" },
    });
    expect(state.basics.linter).toBe("biome");
    expect(state.basics.scope).toBe("@test");
  });

  it("syncs name with projectName", () => {
    const state = presetReducer(basePreset(), {
      type: "SET_BASICS",
      payload: { projectName: "my-new-project" },
    });
    expect(state.name).toBe("my-new-project");
    expect(state.basics.projectName).toBe("my-new-project");
  });

  it("does not mutate the original preset", () => {
    const original = basePreset();
    presetReducer(original, {
      type: "SET_BASICS",
      payload: { packageManager: "pnpm" },
    });
    expect(original.basics.packageManager).toBe("bun");
  });
});

// ─── SET_DATABASE ─────────────────────────────────────────────────────────────

describe("SET_DATABASE", () => {
  it("replaces database with drizzle+postgres", () => {
    const state = presetReducer(basePreset(), {
      type: "SET_DATABASE",
      payload: { strategy: "drizzle", driver: "postgres" },
    });
    expect(state.database.strategy).toBe("drizzle");
    expect((state.database as { driver?: string }).driver).toBe("postgres");
  });

  it("full replacement — none clears driver", () => {
    const state = presetReducer(
      basePreset({ database: { strategy: "drizzle", driver: "postgres" } }),
      { type: "SET_DATABASE", payload: { strategy: "none" } },
    );
    expect(state.database.strategy).toBe("none");
    expect((state.database as { driver?: string }).driver).toBeUndefined();
  });
});

// ─── ADD_APP ──────────────────────────────────────────────────────────────────

describe("ADD_APP", () => {
  it("adds a new app to the apps array", () => {
    const state = presetReducer(basePreset(), {
      type: "ADD_APP",
      payload: makeApp("api", 3001),
    });
    expect(state.apps).toHaveLength(2);
    expect(state.apps[1]?.name).toBe("api");
  });

  it("does not add a duplicate app name", () => {
    const state = presetReducer(basePreset(), {
      type: "ADD_APP",
      payload: makeApp("web", 3001),
    });
    expect(state.apps).toHaveLength(1);
  });

  it("preserves existing apps", () => {
    const state = presetReducer(basePreset(), {
      type: "ADD_APP",
      payload: makeApp("api", 3001),
    });
    expect(state.apps[0]?.name).toBe("web");
  });
});

// ─── REMOVE_APP ───────────────────────────────────────────────────────────────

describe("REMOVE_APP", () => {
  it("removes an app by index", () => {
    const preset = basePreset({ apps: [makeApp("web"), makeApp("api", 3001)] });
    const state = presetReducer(preset, { type: "REMOVE_APP", index: 1 });
    expect(state.apps).toHaveLength(1);
    expect(state.apps[0]?.name).toBe("web");
  });

  it("does NOT allow removing the last app", () => {
    const preset = basePreset({ apps: [makeApp("web")] });
    const state = presetReducer(preset, { type: "REMOVE_APP", index: 0 });
    expect(state.apps).toHaveLength(1);
    expect(state).toBe(preset);
  });

  it("removes app at index 0 when multiple apps exist", () => {
    const preset = basePreset({ apps: [makeApp("web"), makeApp("api", 3001)] });
    const state = presetReducer(preset, { type: "REMOVE_APP", index: 0 });
    expect(state.apps).toHaveLength(1);
    expect(state.apps[0]?.name).toBe("api");
  });
});

// ─── ADD_PACKAGE ──────────────────────────────────────────────────────────────

describe("ADD_PACKAGE", () => {
  it("adds a new package", () => {
    const state = presetReducer(basePreset(), {
      type: "ADD_PACKAGE",
      payload: makePkg("ui"),
    });
    expect(state.packages).toHaveLength(1);
    expect(state.packages[0]?.name).toBe("ui");
  });

  it("does not add duplicate package name", () => {
    const preset = basePreset({ packages: [makePkg("ui")] });
    const state = presetReducer(preset, {
      type: "ADD_PACKAGE",
      payload: makePkg("ui"),
    });
    expect(state.packages).toHaveLength(1);
    expect(state).toBe(preset);
  });
});

// ─── REMOVE_PACKAGE ───────────────────────────────────────────────────────────

describe("REMOVE_PACKAGE", () => {
  it("removes a package by index", () => {
    const preset = basePreset({ packages: [makePkg("ui"), makePkg("db")] });
    const state = presetReducer(preset, { type: "REMOVE_PACKAGE", index: 0 });
    expect(state.packages).toHaveLength(1);
    expect(state.packages[0]?.name).toBe("db");
  });

  it("cleans up consumes references in apps", () => {
    const preset = basePreset({
      apps: [makeApp("web", 3000, ["ui"])],
      packages: [makePkg("ui")],
    });
    const state = presetReducer(preset, { type: "REMOVE_PACKAGE", index: 0 });
    expect(state.apps[0]?.consumes).not.toContain("ui");
  });
});

// ─── UPDATE_PACKAGE ───────────────────────────────────────────────────────────

describe("UPDATE_PACKAGE — rename updates consumes", () => {
  it("updates consumes references when package is renamed", () => {
    const preset = basePreset({
      apps: [makeApp("web", 3000, ["ui"])],
      packages: [makePkg("ui")],
    });
    const state = presetReducer(preset, {
      type: "UPDATE_PACKAGE",
      index: 0,
      payload: { name: "design-system" },
    });
    expect(state.packages[0]?.name).toBe("design-system");
    expect(state.apps[0]?.consumes).toContain("design-system");
    expect(state.apps[0]?.consumes).not.toContain("ui");
  });
});

// ─── TOGGLE_REGISTRY_PACKAGE ──────────────────────────────────────────────────

describe("TOGGLE_REGISTRY_PACKAGE", () => {
  it("adds a registry package when not present", () => {
    const state = presetReducer(basePreset(), {
      type: "TOGGLE_REGISTRY_PACKAGE",
      payload: "posthog",
    });
    expect(state.registryPackages).toContain("posthog");
  });

  it("removes a registry package when already present", () => {
    const preset = basePreset({ registryPackages: ["posthog"] });
    const state = presetReducer(preset, {
      type: "TOGGLE_REGISTRY_PACKAGE",
      payload: "posthog",
    });
    expect(state.registryPackages).not.toContain("posthog");
  });

  it("toggle off then on restores the package", () => {
    const s1 = presetReducer(basePreset(), {
      type: "TOGGLE_REGISTRY_PACKAGE",
      payload: "posthog",
    });
    const s2 = presetReducer(s1, {
      type: "TOGGLE_REGISTRY_PACKAGE",
      payload: "posthog",
    });
    const s3 = presetReducer(s2, {
      type: "TOGGLE_REGISTRY_PACKAGE",
      payload: "posthog",
    });
    expect(s3.registryPackages).toContain("posthog");
  });
});

// ─── SET_INTEGRATIONS ────────────────────────────────────────────────────────

describe("SET_INTEGRATIONS", () => {
  it("merges integration values", () => {
    const state = presetReducer(basePreset(), {
      type: "SET_INTEGRATIONS",
      payload: { analytics: "posthog" },
    });
    expect(state.integrations.analytics).toBe("posthog");
    expect(state.integrations.errorTracking).toBe(
      basePreset().integrations.errorTracking,
    );
  });
});

// ─── LOAD_PRESET / RESET ──────────────────────────────────────────────────────

describe("LOAD_PRESET and RESET", () => {
  it("LOAD_PRESET replaces entire state", () => {
    const newPreset = basePreset({ name: "new-preset" });
    const state = presetReducer(basePreset(), {
      type: "LOAD_PRESET",
      payload: newPreset,
    });
    expect(state.name).toBe("new-preset");
  });

  it("RESET replaces entire state", () => {
    const newPreset = basePreset({ name: "reset-preset" });
    const state = presetReducer(basePreset(), {
      type: "RESET",
      payload: newPreset,
    });
    expect(state.name).toBe("reset-preset");
  });

  it("RESET returns exact payload reference", () => {
    const newPreset = basePreset();
    const state = presetReducer(basePreset(), {
      type: "RESET",
      payload: newPreset,
    });
    expect(state).toBe(newPreset);
  });
});

// ─── SET_NAME ─────────────────────────────────────────────────────────────────

describe("SET_NAME", () => {
  it("updates both name and basics.projectName", () => {
    const state = presetReducer(basePreset(), {
      type: "SET_NAME",
      payload: "my-project",
    });
    expect(state.name).toBe("my-project");
    expect(state.basics.projectName).toBe("my-project");
  });
});
