import type { Preset, TurboStackConfig } from "@create-turbo-stack/schema";
import { IntegrationsSchema } from "@create-turbo-stack/schema";
import { describe, expect, it, vi } from "vitest";
import type { McpContext } from "./context";
import { textResponse, withConfig } from "./context";

function baseConfig(overrides: Partial<TurboStackConfig> = {}): TurboStackConfig {
  return {
    schemaVersion: "1.0",
    name: "test",
    version: "0.1.0",
    description: "",
    basics: {
      projectName: "test-project",
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
    apps: [
      { name: "web", type: "nextjs", port: 3000, i18n: false, location: "apps", consumes: [] },
    ],
    packages: [],
    ...overrides,
  } as TurboStackConfig;
}

function makeMockCtx(config: TurboStackConfig | null = baseConfig()): McpContext & {
  appliedPreset: Preset | null;
} {
  let appliedPreset: Preset | null = null;
  return {
    projectRoot: "/test",
    readConfig: async () => config,
    withMutation: async (fn) => fn(),
    applyDiff: async (_old, newPreset) => {
      appliedPreset = newPreset;
    },
    cache: {
      getConfigCached: async () => config,
      invalidate: vi.fn(),
    },
    get appliedPreset() {
      return appliedPreset;
    },
  };
}

// ─── textResponse ─────────────────────────────────────────────────────────────

describe("textResponse", () => {
  it("wraps a string in MCP content format", () => {
    const r = textResponse("hello");
    expect(r).toEqual({ content: [{ type: "text", text: "hello" }] });
  });
});

// ─── withConfig — no config ───────────────────────────────────────────────────

describe("withConfig — no config", () => {
  it("returns an error response when config is null", async () => {
    const ctx = makeMockCtx(null);
    const r = await withConfig(ctx, async () => ({
      preset: baseConfig() as unknown as Preset,
      success: "ok",
    }));
    expect(r.content[0]?.text).toContain("Error");
    expect(r.content[0]?.text).toContain(".turbo-stack.json");
  });
});

// ─── withConfig — add_app logic ───────────────────────────────────────────────

describe("withConfig — add_app logic", () => {
  it("adds a new app to the preset", async () => {
    const ctx = makeMockCtx();
    const r = await withConfig(ctx, async (config) => {
      if (config.apps.some((a) => a.name === "api")) {
        return { error: 'App "api" already exists' };
      }
      const newApp = {
        name: "api",
        type: "hono-standalone" as const,
        port: 3001,
        i18n: false,
        location: "apps",
        consumes: [],
      };
      return {
        preset: { ...config, apps: [...config.apps, newApp] } as Preset,
        success: 'Created app "api"',
      };
    });
    expect(r.content[0]?.text).toBe('Created app "api"');
    expect(ctx.appliedPreset?.apps).toHaveLength(2);
    expect(ctx.appliedPreset?.apps[1]?.name).toBe("api");
  });

  it("returns an error when app name already exists", async () => {
    const ctx = makeMockCtx();
    const r = await withConfig(ctx, async (config) => {
      if (config.apps.some((a) => a.name === "web")) {
        return { error: 'App "web" already exists' };
      }
      return { preset: config as unknown as Preset, success: "ok" };
    });
    expect(r.content[0]?.text).toContain("Error");
    expect(r.content[0]?.text).toContain("web");
  });

  it("returns an error when port is already in use", async () => {
    const ctx = makeMockCtx();
    const r = await withConfig(ctx, async (config) => {
      if (config.apps.some((a) => a.port === 3000)) {
        return { error: "Port 3000 is already in use by another app" };
      }
      return { preset: config as unknown as Preset, success: "ok" };
    });
    expect(r.content[0]?.text).toContain("Error");
    expect(r.content[0]?.text).toContain("3000");
  });
});

// ─── withConfig — switch_database logic ───────────────────────────────────────

describe("withConfig — switch_database logic", () => {
  it("switches database to drizzle+postgres", async () => {
    const ctx = makeMockCtx();
    const r = await withConfig(ctx, async (config) => ({
      preset: {
        ...config,
        database: { strategy: "drizzle" as const, driver: "postgres" as const },
      } as Preset,
      success: "Database switched to drizzle (postgres).",
    }));
    expect(r.content[0]?.text).toBe("Database switched to drizzle (postgres).");
    expect(ctx.appliedPreset?.database.strategy).toBe("drizzle");
  });

  it("returns error when drizzle is chosen without driver", async () => {
    const ctx = makeMockCtx();
    const r = await withConfig(ctx, async (_config) => ({
      error: "Drizzle requires a driver",
    }));
    expect(r.content[0]?.text).toContain("Error");
    expect(r.content[0]?.text).toContain("Drizzle requires");
  });
});

// ─── withConfig — add_integration logic ───────────────────────────────────────

describe("withConfig — add_integration logic", () => {
  it("adds analytics integration", async () => {
    const ctx = makeMockCtx();
    const r = await withConfig(ctx, async (config) => ({
      preset: {
        ...config,
        integrations: { ...config.integrations, analytics: "posthog" },
      } as Preset,
      success: "Set analytics → posthog.",
    }));
    expect(r.content[0]?.text).toBe("Set analytics → posthog.");
    expect(ctx.appliedPreset?.integrations.analytics).toBe("posthog");
  });

  it("schema rejects an invalid integration value", async () => {
    const ctx = makeMockCtx();
    const r = await withConfig(ctx, async (config) => ({
      preset: {
        ...config,
        integrations: { ...config.integrations, analytics: "not-a-real-provider" },
      } as unknown as Preset,
      success: "should not reach here",
    }));
    expect(r.content[0]?.text).toContain("Validation error");
  });
});

// ─── withConfig — wire_workspace_package logic ────────────────────────────────

describe("withConfig — wire_workspace_package logic", () => {
  it("adds a package to app consumes", async () => {
    // ui package must exist in packages for ValidatedPresetSchema cross-field check
    const config = baseConfig({
      packages: [
        { name: "ui", type: "ui", location: "packages", producesCSS: true, exports: ["."] },
      ],
    });
    const ctx = makeMockCtx(config);
    const r = await withConfig(ctx, async (cfg) => {
      const idx = cfg.apps.findIndex((a) => a.name === "web");
      if (idx === -1) return { error: 'App "web" not found' };
      const target = cfg.apps[idx]!;
      const updatedApps = [...cfg.apps];
      updatedApps[idx] = { ...target, consumes: [...target.consumes, "ui"] };
      return {
        preset: { ...cfg, apps: updatedApps } as Preset,
        success: 'Wired "ui" into "web".',
      };
    });
    expect(r.content[0]?.text).toBe('Wired "ui" into "web".');
    expect(ctx.appliedPreset?.apps[0]?.consumes).toContain("ui");
  });

  it("returns an error when app is not found", async () => {
    const ctx = makeMockCtx();
    const r = await withConfig(ctx, async (config) => {
      const idx = config.apps.findIndex((a) => a.name === "nonexistent");
      if (idx === -1) return { error: 'App "nonexistent" not found' };
      return { preset: config as unknown as Preset, success: "ok" };
    });
    expect(r.content[0]?.text).toContain("Error");
    expect(r.content[0]?.text).toContain("nonexistent");
  });
});
