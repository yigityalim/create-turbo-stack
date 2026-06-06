import { describe, expect, it } from "vitest";
import minimalJson from "../../../presets/minimal.json";
import saasJson from "../../../presets/saas-starter.json";
import { ValidatedPresetSchema } from "./preset";

// Helpers

/** Deep-clone a fixture and return as a mutable record. */
function fixture(): Record<string, unknown> {
  return structuredClone(minimalJson) as Record<string, unknown>;
}

function fixtureApps(preset: Record<string, unknown>): Record<string, unknown>[] {
  return preset.apps as Record<string, unknown>[];
}

/**
 * Extract the first Zod issue message.
 * Returns undefined when parse succeeds (no issues).
 */
function firstIssueMessage(data: unknown): string | undefined {
  const result = ValidatedPresetSchema.safeParse(data);
  if (result.success) return undefined;
  return result.error.issues[0]?.message;
}

// Valid presets

describe("ValidatedPresetSchema — valid presets", () => {
  it("accepts a minimal preset", () => {
    const result = ValidatedPresetSchema.safeParse(structuredClone(minimalJson));
    expect(result.success).toBe(true);
  });

  it("accepts the saas-starter preset", () => {
    const result = ValidatedPresetSchema.safeParse(structuredClone(saasJson));
    expect(result.success).toBe(true);
  });

  it("accepts a preset with hono standalone-app + hono-standalone app type", () => {
    const preset = fixture();
    preset.api = { strategy: "hono", mode: "standalone-app" };
    fixtureApps(preset).push({
      name: "hono-api",
      type: "hono-standalone",
      port: 3001,
      i18n: false,
      consumes: [],
    });

    const result = ValidatedPresetSchema.safeParse(preset);
    expect(result.success).toBe(true);
  });
});

// Cross-field validation — rejection cases

describe("ValidatedPresetSchema — rejected presets", () => {
  it("rejects supabase-auth when database strategy is not supabase", () => {
    const preset = fixture();
    preset.auth = { provider: "supabase-auth", rbac: false, entitlements: false };

    const message = firstIssueMessage(preset);
    expect(message).toMatch(/supabase-auth requires database strategy 'supabase'/);
  });

  it("rejects duplicate app names", () => {
    const preset = fixture();
    const apps = fixtureApps(preset);
    apps.push(structuredClone(apps[0]));

    const message = firstIssueMessage(preset);
    expect(message).toMatch(/Duplicate app name/);
  });

  it("rejects duplicate ports", () => {
    const preset = fixture();
    fixtureApps(preset).push({
      name: "web2",
      type: "nextjs",
      port: 3000,
      i18n: false,
      consumes: ["ui"],
    });

    const message = firstIssueMessage(preset);
    expect(message).toMatch(/Duplicate port/);
  });

  it("rejects i18n on a hono-standalone app", () => {
    const preset = fixture();
    preset.api = { strategy: "hono", mode: "standalone-app" };
    fixtureApps(preset).push({
      name: "hono-api",
      type: "hono-standalone",
      port: 3001,
      i18n: true,
      consumes: [],
    });

    const message = firstIssueMessage(preset);
    expect(message).toMatch(/i18n is not supported for app type 'hono-standalone'/);
  });

  it("rejects an app that consumes an unknown package", () => {
    const preset = fixture();
    const apps = fixtureApps(preset);
    (apps[0] as Record<string, unknown>).consumes = ["ui", "nonexistent-pkg"];

    const message = firstIssueMessage(preset);
    expect(message).toMatch(/consumes unknown package 'nonexistent-pkg'/);
  });
});

// Additional edge cases

describe("ValidatedPresetSchema — database edge cases", () => {
  it("accepts prisma without a driver (prisma has no driver requirement)", () => {
    const preset = fixture();
    preset.database = { strategy: "prisma" };
    expect(firstIssueMessage(preset)).toBeUndefined();
  });

  it("accepts supabase database strategy", () => {
    const preset = fixture();
    preset.database = { strategy: "supabase" };
    expect(firstIssueMessage(preset)).toBeUndefined();
  });

  it("accepts drizzle with sqlite driver", () => {
    const preset = fixture();
    preset.database = { strategy: "drizzle", driver: "sqlite" };
    expect(firstIssueMessage(preset)).toBeUndefined();
  });
});

describe("ValidatedPresetSchema — app name validation", () => {
  it("rejects an app with an empty name", () => {
    const preset = fixture();
    (fixtureApps(preset)[0] as Record<string, unknown>).name = "";
    expect(firstIssueMessage(preset)).toBeDefined();
  });

  it("rejects an app name with uppercase letters", () => {
    const preset = fixture();
    (fixtureApps(preset)[0] as Record<string, unknown>).name = "MyApp";
    expect(firstIssueMessage(preset)).toBeDefined();
  });

  it("rejects an app name with spaces", () => {
    const preset = fixture();
    (fixtureApps(preset)[0] as Record<string, unknown>).name = "my app";
    expect(firstIssueMessage(preset)).toBeDefined();
  });

  it("accepts a kebab-case app name with numbers", () => {
    const preset = fixture();
    (fixtureApps(preset)[0] as Record<string, unknown>).name = "web-app-2";
    expect(firstIssueMessage(preset)).toBeUndefined();
  });
});

describe("ValidatedPresetSchema — registryPackages", () => {
  it("accepts unique registry packages", () => {
    const preset = fixture();
    preset.registryPackages = ["posthog", "sentry"];
    expect(firstIssueMessage(preset)).toBeUndefined();
  });

  it("currently accepts duplicate registry packages (no unique constraint yet)", () => {
    const preset = fixture();
    preset.registryPackages = ["posthog", "posthog"];
    expect(firstIssueMessage(preset)).toBeUndefined();
  });
});

describe("ValidatedPresetSchema — hono mode edge cases", () => {
  it("accepts hono nextjs-route mode without a hono-standalone app", () => {
    const preset = fixture();
    preset.api = { strategy: "hono", mode: "nextjs-route" };
    expect(firstIssueMessage(preset)).toBeUndefined();
  });

  it("rejects hono standalone-app mode when no hono-standalone app exists", () => {
    const preset = fixture();
    preset.api = { strategy: "hono", mode: "standalone-app" };
    expect(firstIssueMessage(preset)).toMatch(/hono-standalone/i);
  });
});
