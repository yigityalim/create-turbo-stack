import type { TurboStackConfig } from "@create-turbo-stack/schema";
import { IntegrationsSchema } from "@create-turbo-stack/schema";
import { describe, expect, it } from "vitest";
import { buildSummary } from "./info";

function baseConfig(overrides: Partial<TurboStackConfig> = {}): TurboStackConfig {
  return {
    schemaVersion: "1.0",
    name: "test",
    version: "0.1.0",
    description: "",
    basics: {
      projectName: "my-app",
      scope: "@my-app",
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

// ─── buildSummary — basic fields ──────────────────────────────────────────────

describe("buildSummary — basic fields", () => {
  it("returns projectName from config", () => {
    const summary = buildSummary(baseConfig());
    expect(summary.projectName).toBe("my-app");
  });

  it("returns schemaVersion from config", () => {
    const summary = buildSummary(baseConfig());
    expect(summary.schemaVersion).toBe("1.0");
  });

  it("defaults schemaVersion to '1.0' when missing", () => {
    const config = baseConfig();
    const noVersion = { ...config } as Record<string, unknown>;
    delete noVersion.schemaVersion;
    const summary = buildSummary(noVersion as TurboStackConfig);
    expect(summary.schemaVersion).toBe("1.0");
  });

  it("reflects basics fields", () => {
    const summary = buildSummary(baseConfig());
    expect(summary.basics.packageManager).toBe("bun");
    expect(summary.basics.scope).toBe("@my-app");
    expect(summary.basics.linter).toBe("biome");
    expect(summary.basics.typescript).toBe("strict");
  });
});

// ─── buildSummary — stack ─────────────────────────────────────────────────────

describe("buildSummary — stack", () => {
  it("database shows 'none' when no database", () => {
    expect(buildSummary(baseConfig()).stack.database).toBe("none");
  });

  it("database shows strategy when set", () => {
    const summary = buildSummary(
      baseConfig({ database: { strategy: "drizzle", driver: "postgres" } }),
    );
    expect(summary.stack.database).toBe("drizzle");
  });

  it("css shows framework only when ui is none", () => {
    expect(buildSummary(baseConfig()).stack.css).toBe("tailwind4");
  });

  it("css shows framework + ui when ui is set", () => {
    const summary = buildSummary(
      baseConfig({ css: { framework: "tailwind4", ui: "shadcn", styling: "css-variables" } }),
    );
    expect(summary.stack.css).toBe("tailwind4 + shadcn");
  });

  it("api shows strategy", () => {
    const summary = buildSummary(baseConfig({ api: { strategy: "trpc", version: "v11" } }));
    expect(summary.stack.api).toBe("trpc");
  });

  it("auth shows provider", () => {
    const summary = buildSummary(
      baseConfig({ auth: { provider: "clerk", rbac: false, entitlements: false } }),
    );
    expect(summary.stack.auth).toBe("clerk");
  });
});

// ─── buildSummary — apps and packages ────────────────────────────────────────

describe("buildSummary — apps", () => {
  it("maps apps to { name, type, port }", () => {
    const summary = buildSummary(baseConfig());
    expect(summary.apps).toHaveLength(1);
    expect(summary.apps[0]).toEqual({ name: "web", type: "nextjs", port: 3000 });
  });

  it("includes multiple apps", () => {
    const summary = buildSummary(
      baseConfig({
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
      }),
    );
    expect(summary.apps).toHaveLength(2);
    expect(summary.apps[1].name).toBe("api");
  });
});

describe("buildSummary — packages", () => {
  it("maps packages to { name, type }", () => {
    const summary = buildSummary(
      baseConfig({
        packages: [
          { name: "ui", type: "ui", location: "packages", producesCSS: true, exports: ["."] },
        ],
      }),
    );
    expect(summary.packages).toHaveLength(1);
    expect(summary.packages[0]).toEqual({ name: "ui", type: "ui" });
  });

  it("returns empty array when no packages", () => {
    expect(buildSummary(baseConfig()).packages).toHaveLength(0);
  });
});

// ─── buildSummary — integrations ─────────────────────────────────────────────

describe("buildSummary — integrations", () => {
  it("includes all integration keys", () => {
    const summary = buildSummary(baseConfig());
    expect(summary.integrations).toHaveProperty("analytics");
    expect(summary.integrations).toHaveProperty("errorTracking");
    expect(summary.integrations).toHaveProperty("email");
  });

  it("reflects set integration values", () => {
    const summary = buildSummary(
      baseConfig({
        integrations: IntegrationsSchema.parse({ analytics: "posthog", envValidation: "t3-env" }),
      }),
    );
    expect(summary.integrations.analytics).toBe("posthog");
    expect(summary.integrations.envValidation).toBe("t3-env");
  });
});
