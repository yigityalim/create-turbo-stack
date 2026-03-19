import { describe, expect, it } from "vitest";
import minimalJson from "../../../presets/minimal.json";
import saasJson from "../../../presets/saas-starter.json";
import { ValidatedPresetSchema } from "./preset";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Valid presets
// ---------------------------------------------------------------------------

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
      cms: "none",
      consumes: [],
    });

    const result = ValidatedPresetSchema.safeParse(preset);
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Cross-field validation — rejection cases
// ---------------------------------------------------------------------------

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
      cms: "none",
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
      cms: "none",
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

  it("rejects CMS on a non-nextjs app", () => {
    const preset = fixture();
    fixtureApps(preset).push({
      name: "docs",
      type: "vite-react",
      port: 3001,
      i18n: false,
      cms: "sanity",
      consumes: [],
    });

    const message = firstIssueMessage(preset);
    expect(message).toMatch(/CMS integration only supported for nextjs apps/);
  });
});
