import { describe, expect, it } from "vitest";
import minimalJson from "../../../../presets/minimal.json";
import saasJson from "../../../../presets/saas-starter.json";
import { ValidatedPresetSchema } from "../preset";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Deep-clone a fixture so mutations never bleed between tests. */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

/**
 * Extract the first Zod issue message matching a path predicate.
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
    const result = ValidatedPresetSchema.safeParse(clone(minimalJson));
    expect(result.success).toBe(true);
  });

  it("accepts the saas-starter preset", () => {
    const result = ValidatedPresetSchema.safeParse(clone(saasJson));
    expect(result.success).toBe(true);
  });

  it("accepts a preset with hono standalone-app + hono-standalone app type", () => {
    const preset = clone(minimalJson);
    preset.api = { strategy: "hono", mode: "standalone-app" } as any;
    preset.apps.push({
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
    const preset = clone(minimalJson);
    preset.auth = {
      provider: "supabase-auth",
      rbac: false,
      entitlements: false,
    };
    // database.strategy is already "none" in minimal

    const message = firstIssueMessage(preset);
    expect(message).toMatch(/supabase-auth requires database strategy 'supabase'/);
  });

  it("rejects duplicate app names", () => {
    const preset = clone(minimalJson);
    preset.apps.push({ ...clone(preset.apps[0]) }); // second app with same name "web"

    const message = firstIssueMessage(preset);
    expect(message).toMatch(/Duplicate app name/);
  });

  it("rejects duplicate ports", () => {
    const preset = clone(minimalJson);
    preset.apps.push({
      name: "web2",
      type: "nextjs",
      port: 3000, // same as "web"
      i18n: false,
      cms: "none",
      consumes: ["ui"],
    });

    const message = firstIssueMessage(preset);
    expect(message).toMatch(/Duplicate port/);
  });

  it("rejects i18n on a hono-standalone app", () => {
    const preset = clone(minimalJson);
    preset.api = { strategy: "hono", mode: "standalone-app" } as any;
    preset.apps.push({
      name: "hono-api",
      type: "hono-standalone",
      port: 3001,
      i18n: true, // invalid
      cms: "none",
      consumes: [],
    });

    const message = firstIssueMessage(preset);
    expect(message).toMatch(/i18n is not supported for app type 'hono-standalone'/);
  });

  it("rejects an app that consumes an unknown package", () => {
    const preset = clone(minimalJson);
    preset.apps[0].consumes = ["ui", "nonexistent-pkg"];

    const message = firstIssueMessage(preset);
    expect(message).toMatch(/consumes unknown package 'nonexistent-pkg'/);
  });

  it("rejects CMS on a non-nextjs app", () => {
    const preset = clone(minimalJson);
    preset.apps.push({
      name: "docs",
      type: "vite-react",
      port: 3001,
      i18n: false,
      cms: "sanity", // only valid for nextjs
      consumes: [],
    });

    const message = firstIssueMessage(preset);
    expect(message).toMatch(/CMS integration only supported for nextjs apps/);
  });
});
