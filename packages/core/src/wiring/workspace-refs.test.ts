import { describe, expect, it } from "vitest";
import { makePreset, UI_PKG, UTILS_PKG, WEB_APP } from "../preset-factory";
import { computeWorkspaceRefs } from "./workspace-refs";

// ─── No apps ──────────────────────────────────────────────────────────────────

describe("computeWorkspaceRefs — no apps", () => {
  it("returns an empty object when there are no apps", () => {
    const refs = computeWorkspaceRefs(makePreset());
    // Only package cross-refs might be present
    expect(refs.web).toBeUndefined();
  });
});

// ─── App consumes ─────────────────────────────────────────────────────────────

describe("computeWorkspaceRefs — app consumes", () => {
  it("adds workspace:* ref for each consumed package", () => {
    const preset = makePreset({
      apps: [{ ...WEB_APP, consumes: ["ui"] }],
      packages: [UI_PKG],
    });
    const refs = computeWorkspaceRefs(preset);
    expect(refs.web["@test/ui"]).toBe("workspace:*");
  });

  it("uses the preset scope in the ref key", () => {
    const preset = makePreset({
      basics: {
        projectName: "my-app",
        packageManager: "bun",
        scope: "@myorg",
        typescript: "strict",
        linter: "biome",
        gitInit: false,
      },
      apps: [{ ...WEB_APP, consumes: ["ui"] }],
      packages: [UI_PKG],
    });
    const refs = computeWorkspaceRefs(preset);
    expect(refs.web["@myorg/ui"]).toBe("workspace:*");
    expect(refs.web["@test/ui"]).toBeUndefined();
  });

  it("no refs for an app that consumes nothing and has no integrations", () => {
    const preset = makePreset({
      apps: [WEB_APP],
      integrations: {
        analytics: "none",
        errorTracking: "none",
        email: "none",
        rateLimit: "none",
        ai: "none",
        cache: "none",
        envValidation: "none",
      },
    });
    const refs = computeWorkspaceRefs(preset);
    expect(Object.keys(refs.web)).toHaveLength(0);
  });

  it("adds refs for multiple consumed packages", () => {
    const preset = makePreset({
      apps: [{ ...WEB_APP, consumes: ["ui", "utils"] }],
      packages: [UI_PKG, UTILS_PKG],
    });
    const refs = computeWorkspaceRefs(preset);
    expect(refs.web["@test/ui"]).toBe("workspace:*");
    expect(refs.web["@test/utils"]).toBe("workspace:*");
  });
});

// ─── Auto-consumed packages ────────────────────────────────────────────────────

describe("computeWorkspaceRefs — auto-consumed packages", () => {
  it("adds @scope/env when envValidation is set", () => {
    const preset = makePreset({
      apps: [WEB_APP],
      integrations: {
        analytics: "none",
        errorTracking: "none",
        email: "none",
        rateLimit: "none",
        ai: "none",
        cache: "none",
        envValidation: "t3-env",
      },
    });
    const refs = computeWorkspaceRefs(preset);
    expect(refs.web["@test/env"]).toBe("workspace:*");
  });

  it("does NOT add @scope/env when envValidation is none", () => {
    const preset = makePreset({ apps: [WEB_APP] });
    const refs = computeWorkspaceRefs(preset);
    expect(refs.web["@test/env"]).toBeUndefined();
  });

  it("adds @scope/api when api strategy is set", () => {
    const preset = makePreset({
      apps: [WEB_APP],
      api: { strategy: "trpc", version: "v11" },
    });
    const refs = computeWorkspaceRefs(preset);
    expect(refs.web["@test/api"]).toBe("workspace:*");
  });

  it("does NOT add @scope/api when api is none", () => {
    const preset = makePreset({ apps: [WEB_APP] });
    const refs = computeWorkspaceRefs(preset);
    expect(refs.web["@test/api"]).toBeUndefined();
  });

  it("adds @scope/auth when auth provider is set", () => {
    const preset = makePreset({
      apps: [WEB_APP],
      auth: { provider: "clerk", rbac: false, entitlements: false },
    });
    const refs = computeWorkspaceRefs(preset);
    expect(refs.web["@test/auth"]).toBe("workspace:*");
  });

  it("does NOT add @scope/auth when auth is none", () => {
    const preset = makePreset({ apps: [WEB_APP] });
    const refs = computeWorkspaceRefs(preset);
    expect(refs.web["@test/auth"]).toBeUndefined();
  });
});

// ─── Package cross-references ─────────────────────────────────────────────────

describe("computeWorkspaceRefs — package cross-references", () => {
  it("auth package gets @scope/db ref when both auth and database are set", () => {
    const preset = makePreset({
      apps: [WEB_APP],
      database: { strategy: "drizzle", driver: "postgres" },
      auth: { provider: "better-auth", rbac: false, entitlements: false },
    });
    const refs = computeWorkspaceRefs(preset);
    expect(refs.auth?.["@test/db"]).toBe("workspace:*");
  });

  it("auth package does NOT get @scope/db ref when database is none", () => {
    const preset = makePreset({
      apps: [WEB_APP],
      auth: { provider: "better-auth", rbac: false, entitlements: false },
    });
    const refs = computeWorkspaceRefs(preset);
    expect(refs.auth?.["@test/db"]).toBeUndefined();
  });

  it("auth package does NOT get @scope/db ref when auth is none", () => {
    const preset = makePreset({
      apps: [WEB_APP],
      database: { strategy: "drizzle", driver: "postgres" },
    });
    const refs = computeWorkspaceRefs(preset);
    expect(refs.auth?.["@test/db"]).toBeUndefined();
  });

  it("api package gets @scope/db ref when both api and database are set", () => {
    const preset = makePreset({
      apps: [WEB_APP],
      database: { strategy: "drizzle", driver: "postgres" },
      api: { strategy: "trpc", version: "v11" },
    });
    const refs = computeWorkspaceRefs(preset);
    expect(refs.api?.["@test/db"]).toBe("workspace:*");
  });

  it("api package does NOT get @scope/db ref when database is none", () => {
    const preset = makePreset({
      apps: [WEB_APP],
      api: { strategy: "trpc", version: "v11" },
    });
    const refs = computeWorkspaceRefs(preset);
    expect(refs.api?.["@test/db"]).toBeUndefined();
  });
});

// ─── Multiple apps ────────────────────────────────────────────────────────────

describe("computeWorkspaceRefs — multiple apps", () => {
  it("generates independent refs for each app", () => {
    const adminApp = {
      name: "admin",
      type: "nextjs" as const,
      location: "apps",
      port: 3001,
      i18n: false,
      consumes: ["utils"] as string[],
    };
    const preset = makePreset({
      apps: [{ ...WEB_APP, consumes: ["ui"] }, adminApp],
      packages: [UI_PKG, UTILS_PKG],
    });
    const refs = computeWorkspaceRefs(preset);
    expect(refs.web["@test/ui"]).toBe("workspace:*");
    expect(refs.web["@test/utils"]).toBeUndefined();
    expect(refs.admin["@test/utils"]).toBe("workspace:*");
    expect(refs.admin["@test/ui"]).toBeUndefined();
  });
});
