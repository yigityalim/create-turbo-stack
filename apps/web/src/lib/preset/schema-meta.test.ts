import { describe, expect, it } from "vitest";
import { CATEGORIES } from "./schema-meta";

// ─── CATEGORIES structure ─────────────────────────────────────────────────────

describe("CATEGORIES — structure", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(CATEGORIES)).toBe(true);
    expect(CATEGORIES.length).toBeGreaterThan(0);
  });

  it("every category has required fields", () => {
    for (const cat of CATEGORIES) {
      expect(cat.key, `${cat.key} must have key`).toBeTruthy();
      expect(cat.label, `${cat.key} must have label`).toBeTruthy();
      expect(cat.description, `${cat.key} must have description`).toBeTruthy();
      expect(cat.icon, `${cat.key} must have icon`).toBeTruthy();
    }
  });

  it("every category key is unique", () => {
    const keys = CATEGORIES.map((c) => c.key);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });
});

// ─── CATEGORIES key validity ──────────────────────────────────────────────────

const TOP_LEVEL_PRESET_KEYS: ReadonlySet<string> = new Set([
  "schemaVersion",
  "name",
  "version",
  "description",
  "author",
  "basics",
  "database",
  "api",
  "auth",
  "css",
  "integrations",
  "apps",
  "packages",
  "registryPackages",
  "packageOverrides",
  "autoPackageLocations",
  "cliVersion",
  "generatedAt",
]);

describe("CATEGORIES — key is a valid Preset or Preset-adjacent top-level field", () => {
  it("each category key appears in the known Preset field set", () => {
    for (const cat of CATEGORIES) {
      expect(
        TOP_LEVEL_PRESET_KEYS.has(cat.key),
        `category key "${cat.key}" not found in known Preset fields`,
      ).toBe(true);
    }
  });
});

// ─── CATEGORIES field options ─────────────────────────────────────────────────

describe("CATEGORIES — field options are non-empty", () => {
  it("enum fields have at least one option", () => {
    for (const cat of CATEGORIES) {
      for (const field of cat.fields ?? []) {
        if (field.type === "enum") {
          expect(
            field.options?.length,
            `${cat.key}.${field.key} enum field must have at least one option`,
          ).toBeGreaterThan(0);
        }
      }
    }
  });

  it("variant enum fields also have at least one option", () => {
    for (const cat of CATEGORIES) {
      if (!cat.variants) continue;
      for (const [variantKey, fields] of Object.entries(cat.variants)) {
        for (const field of fields) {
          if (field.type === "enum") {
            expect(
              field.options?.length,
              `${cat.key} variant "${variantKey}" field "${field.key}" must have options`,
            ).toBeGreaterThan(0);
          }
        }
      }
    }
  });
});

// ─── CATEGORIES — known categories present ────────────────────────────────────

describe("CATEGORIES — known categories are present", () => {
  it("includes 'basics'", () => {
    expect(CATEGORIES.some((c) => c.key === "basics")).toBe(true);
  });

  it("includes 'database'", () => {
    expect(CATEGORIES.some((c) => c.key === "database")).toBe(true);
  });

  it("includes 'api'", () => {
    expect(CATEGORIES.some((c) => c.key === "api")).toBe(true);
  });

  it("includes 'auth'", () => {
    expect(CATEGORIES.some((c) => c.key === "auth")).toBe(true);
  });

  it("includes 'css'", () => {
    expect(CATEGORIES.some((c) => c.key === "css")).toBe(true);
  });

  it("includes 'integrations'", () => {
    expect(CATEGORIES.some((c) => c.key === "integrations")).toBe(true);
  });
});

// ─── discriminator categories have variants ───────────────────────────────────

describe("CATEGORIES — discriminated categories have variants", () => {
  it("database category has variants for each strategy", () => {
    const db = CATEGORIES.find((c) => c.key === "database");
    expect(db?.discriminator).toBe("strategy");
    expect(db?.variants).toBeDefined();
    expect(db?.variants?.none).toBeDefined();
    expect(db?.variants?.drizzle).toBeDefined();
  });

  it("api category has variants for each strategy", () => {
    const api = CATEGORIES.find((c) => c.key === "api");
    expect(api?.discriminator).toBe("strategy");
    expect(api?.variants).toBeDefined();
    expect(api?.variants?.none).toBeDefined();
  });
});
