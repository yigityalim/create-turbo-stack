import type { Preset, UserConfig } from "@create-turbo-stack/schema";
import { IntegrationsSchema } from "@create-turbo-stack/schema";
import { describe, expect, it } from "vitest";
import { filterOptions, isLocked, lockedValue, validatePresetAgainstPolicy } from "./policy";

function policy(overrides: NonNullable<UserConfig["policy"]> = {}): UserConfig["policy"] {
  return overrides;
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
    apps: [
      { name: "web", type: "nextjs", port: 3000, i18n: false, location: "apps", consumes: [] },
    ],
    packages: [],
    ...overrides,
  };
}

// ─── filterOptions ────────────────────────────────────────────────────────────

describe("filterOptions — no policy", () => {
  it("returns all options when policy is undefined", () => {
    const result = filterOptions(["bun", "pnpm", "npm"] as const, undefined, "packageManager");
    expect(result).toEqual(["bun", "pnpm", "npm"]);
  });

  it("returns all options when policy has no allow/forbid", () => {
    const result = filterOptions(["bun", "pnpm"] as const, policy(), "packageManager");
    expect(result).toEqual(["bun", "pnpm"]);
  });
});

describe("filterOptions — forbid", () => {
  it("removes forbidden values", () => {
    const result = filterOptions(
      ["bun", "pnpm", "npm"] as const,
      policy({ forbid: { packageManager: ["bun"] } }),
      "packageManager",
    );
    expect(result).not.toContain("bun");
    expect(result).toContain("pnpm");
    expect(result).toContain("npm");
  });

  it("can forbid multiple values", () => {
    const result = filterOptions(
      ["bun", "pnpm", "npm"] as const,
      policy({ forbid: { packageManager: ["bun", "npm"] } }),
      "packageManager",
    );
    expect(result).toEqual(["pnpm"]);
  });

  it("returns empty array when all values are forbidden", () => {
    const result = filterOptions(
      ["bun", "pnpm"] as const,
      policy({ forbid: { packageManager: ["bun", "pnpm"] } }),
      "packageManager",
    );
    expect(result).toHaveLength(0);
  });
});

describe("filterOptions — allow", () => {
  it("keeps only allowed values", () => {
    const result = filterOptions(
      ["bun", "pnpm", "npm"] as const,
      policy({ allow: { packageManager: ["pnpm"] } }),
      "packageManager",
    );
    expect(result).toEqual(["pnpm"]);
  });

  it("empty allow list = allow all (no restriction)", () => {
    const result = filterOptions(
      ["bun", "pnpm"] as const,
      policy({ allow: { packageManager: [] } }),
      "packageManager",
    );
    expect(result).toEqual(["bun", "pnpm"]);
  });
});

describe("filterOptions — forbid takes precedence over allow", () => {
  it("removes a value that appears in both allow and forbid", () => {
    const result = filterOptions(
      ["bun", "pnpm", "npm"] as const,
      policy({ allow: { packageManager: ["bun", "pnpm"] }, forbid: { packageManager: ["bun"] } }),
      "packageManager",
    );
    expect(result).toEqual(["pnpm"]);
  });
});

// ─── isLocked / lockedValue ────────────────────────────────────────────────────

describe("isLocked", () => {
  it("returns false when policy is undefined", () => {
    expect(isLocked(undefined, "packageManager")).toBe(false);
  });

  it("returns false when field is not in require", () => {
    expect(isLocked(policy({ require: {} }), "packageManager")).toBe(false);
  });

  it("returns true when field is in require", () => {
    expect(isLocked(policy({ require: { packageManager: "pnpm" } }), "packageManager")).toBe(true);
  });
});

describe("lockedValue", () => {
  it("returns undefined when policy is undefined", () => {
    expect(lockedValue(undefined, "packageManager")).toBeUndefined();
  });

  it("returns undefined when field is not locked", () => {
    expect(lockedValue(policy({}), "packageManager")).toBeUndefined();
  });

  it("returns the locked value", () => {
    expect(lockedValue(policy({ require: { packageManager: "pnpm" } }), "packageManager")).toBe(
      "pnpm",
    );
  });
});

// ─── validatePresetAgainstPolicy ──────────────────────────────────────────────

describe("validatePresetAgainstPolicy — no violations", () => {
  it("returns empty array when policy is undefined", () => {
    expect(validatePresetAgainstPolicy(basePreset(), undefined)).toHaveLength(0);
  });

  it("returns empty array when preset matches policy", () => {
    const violations = validatePresetAgainstPolicy(
      basePreset(),
      policy({ require: { packageManager: "bun" } }),
    );
    expect(violations).toHaveLength(0);
  });
});

describe("validatePresetAgainstPolicy — violations", () => {
  it("reports forbidden packageManager", () => {
    const violations = validatePresetAgainstPolicy(
      basePreset(),
      policy({ forbid: { packageManager: ["bun"] } }),
    );
    expect(violations.some((v) => v.includes("bun"))).toBe(true);
    expect(violations.some((v) => v.includes("packageManager"))).toBe(true);
  });

  it("reports required packageManager mismatch", () => {
    const violations = validatePresetAgainstPolicy(
      basePreset({
        basics: {
          projectName: "t",
          scope: "@t",
          packageManager: "pnpm",
          typescript: "strict",
          linter: "biome",
          gitInit: false,
        },
      }),
      policy({ require: { packageManager: "bun" } }),
    );
    expect(violations.some((v) => v.includes("packageManager"))).toBe(true);
  });

  it("reports forbidden database strategy", () => {
    const violations = validatePresetAgainstPolicy(
      basePreset({ database: { strategy: "drizzle", driver: "postgres" } }),
      policy({ forbid: { database: ["drizzle"] } }),
    );
    expect(violations.some((v) => v.includes("drizzle"))).toBe(true);
  });

  it("reports required auth mismatch", () => {
    const violations = validatePresetAgainstPolicy(
      basePreset({ auth: { provider: "clerk", rbac: false, entitlements: false } }),
      policy({ require: { auth: "better-auth" } }),
    );
    expect(violations.some((v) => v.includes("auth"))).toBe(true);
  });

  it("reports forbidden linter", () => {
    const violations = validatePresetAgainstPolicy(
      basePreset(),
      policy({ forbid: { linter: ["biome"] } }),
    );
    expect(violations.some((v) => v.includes("biome"))).toBe(true);
  });

  it("can produce multiple violations at once", () => {
    const violations = validatePresetAgainstPolicy(
      basePreset(),
      policy({
        forbid: { packageManager: ["bun"], linter: ["biome"] },
      }),
    );
    expect(violations.length).toBeGreaterThanOrEqual(2);
  });
});
