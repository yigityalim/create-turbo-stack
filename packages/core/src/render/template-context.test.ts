import { describe, expect, it } from "vitest";
import { buildTemplateContext } from "../../src/render/template-context";
import { makeFullPreset, makePreset } from "../preset-factory";

describe("buildTemplateContext — basics", () => {
  it("projectName matches preset.basics.projectName", () => {
    const ctx = buildTemplateContext(makePreset());
    expect(ctx.projectName).toBe("test-project");
  });

  it("scope matches preset.basics.scope", () => {
    const ctx = buildTemplateContext(makePreset());
    expect(ctx.scope).toBe("@test");
  });

  it("scopeName strips the @ prefix", () => {
    const ctx = buildTemplateContext(makePreset());
    expect(ctx.scopeName).toBe("test");
  });

  it("packageManager matches preset.basics.packageManager", () => {
    const ctx = buildTemplateContext(makePreset());
    expect(ctx.packageManager).toBe("bun");
  });

  it("isStrict: true when typescript is strict", () => {
    const ctx = buildTemplateContext(makePreset());
    expect(ctx.isStrict).toBe(true);
  });

  it("isStrict: false when typescript is relaxed", () => {
    const p = makePreset({
      basics: { ...makePreset().basics, typescript: "relaxed" },
    });
    expect(buildTemplateContext(p).isStrict).toBe(false);
  });

  it("linter matches preset.basics.linter", () => {
    expect(buildTemplateContext(makePreset()).linter).toBe("biome");
  });
});

describe("buildTemplateContext — no target", () => {
  it("app is undefined when no target", () => {
    expect(buildTemplateContext(makePreset()).app).toBeUndefined();
  });

  it("pkg is undefined when no target", () => {
    expect(buildTemplateContext(makePreset()).pkg).toBeUndefined();
  });
});

describe("buildTemplateContext — app target", () => {
  const p = makePreset({
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
  });

  it("target app: web → ctx.app is set", () => {
    const ctx = buildTemplateContext(p, { type: "app", name: "web" });
    expect(ctx.app?.name).toBe("web");
  });

  it("ctx.pkg is undefined for app target", () => {
    const ctx = buildTemplateContext(p, { type: "app", name: "web" });
    expect(ctx.pkg).toBeUndefined();
  });

  it("unknown app name → ctx.app is undefined", () => {
    const ctx = buildTemplateContext(p, { type: "app", name: "ghost" });
    expect(ctx.app).toBeUndefined();
  });
});

describe("buildTemplateContext — package target", () => {
  const p = makePreset({
    packages: [{ name: "ui", type: "ui", producesCSS: true, exports: ["."] }],
  });

  it("target package: ui → ctx.pkg is set", () => {
    const ctx = buildTemplateContext(p, { type: "package", name: "ui" });
    expect(ctx.pkg?.name).toBe("ui");
  });

  it("ctx.pkg.fullName is @scope/name", () => {
    const ctx = buildTemplateContext(p, { type: "package", name: "ui" });
    expect(ctx.pkg?.fullName).toBe("@test/ui");
  });

  it("ctx.app is undefined for package target", () => {
    const ctx = buildTemplateContext(p, { type: "package", name: "ui" });
    expect(ctx.app).toBeUndefined();
  });

  it("unknown package name → ctx.pkg is undefined", () => {
    const ctx = buildTemplateContext(p, { type: "package", name: "ghost" });
    expect(ctx.pkg).toBeUndefined();
  });
});

describe("buildTemplateContext — wiring", () => {
  it("wiring.catalogDeps is populated (typescript always present)", () => {
    const ctx = buildTemplateContext(makePreset());
    expect(ctx.wiring.catalogDeps).toHaveProperty("typescript");
  });

  it("wiring.catalogDeps values are non-empty strings", () => {
    const ctx = buildTemplateContext(makePreset());
    for (const [k, v] of Object.entries(ctx.wiring.catalogDeps)) {
      expect(typeof v, `${k} version`).toBe("string");
      expect(v.length).toBeGreaterThan(0);
    }
  });

  it("wiring.cssSourceDirectives populated for app target with CSS packages", () => {
    const p = makePreset({
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
      packages: [{ name: "ui", type: "ui", producesCSS: true, exports: ["."] }],
    });
    const ctx = buildTemplateContext(p, { type: "app", name: "web" });
    expect(ctx.wiring.cssSourceDirectives.length).toBeGreaterThan(0);
  });

  it("wiring.cssSourceDirectives empty for package target", () => {
    const p = makePreset({
      packages: [{ name: "ui", type: "ui", producesCSS: true, exports: ["."] }],
    });
    const ctx = buildTemplateContext(p, { type: "package", name: "ui" });
    expect(ctx.wiring.cssSourceDirectives).toHaveLength(0);
  });

  it("wiring.workspaceRefs populated for app consuming packages", () => {
    const p = makePreset({
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
      packages: [{ name: "ui", type: "ui", producesCSS: true, exports: ["."] }],
    });
    const ctx = buildTemplateContext(p, { type: "app", name: "web" });
    expect(ctx.wiring.workspaceRefs).toHaveProperty("@test/ui");
  });

  it("wiring.envVars.server populated for clerk auth + app target", () => {
    const p = makePreset({
      auth: { provider: "clerk", rbac: false, entitlements: false },
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
    });
    const ctx = buildTemplateContext(p, { type: "app", name: "web" });
    expect(ctx.wiring.envVars.server).toContain("CLERK_SECRET_KEY");
  });

  it("wiring.envVars.client populated for posthog + app target", () => {
    const p = makePreset({
      integrations: { ...makePreset().integrations, analytics: "posthog" },
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
    });
    const ctx = buildTemplateContext(p, { type: "app", name: "web" });
    expect(ctx.wiring.envVars.client).toContain("NEXT_PUBLIC_POSTHOG_KEY");
  });

  it("wiring.globalEnv populated from envChain", () => {
    const p = makePreset({
      database: { strategy: "drizzle", driver: "postgres" },
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
    });
    const ctx = buildTemplateContext(p, { type: "app", name: "web" });
    expect(ctx.wiring.globalEnv).toContain("DATABASE_URL");
  });
});

describe("buildTemplateContext — passthrough fields", () => {
  it("database, api, auth, css, integrations, apps, packages passed through", () => {
    const p = makeFullPreset();
    const ctx = buildTemplateContext(p);
    expect(ctx.database).toBe(p.database);
    expect(ctx.api).toBe(p.api);
    expect(ctx.auth).toBe(p.auth);
    expect(ctx.css).toBe(p.css);
    expect(ctx.integrations).toBe(p.integrations);
    expect(ctx.apps).toBe(p.apps);
    expect(ctx.packages).toBe(p.packages);
  });
});
