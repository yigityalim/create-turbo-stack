import { describe, expect, it } from "vitest";
import { REGISTRY_MAP } from "./registry-map";

const KNOWN_PRESET_FIELDS = new Set([
  "basics",
  "database",
  "driver",
  "api",
  "auth",
  "css",
  "ui",
  "styling",
  "integrations",
  "analytics",
  "errorTracking",
  "email",
  "rateLimit",
  "ai",
  "cache",
  "envValidation",
  "apps",
  "packages",
  "registryPackages",
  "packageOverrides",
  "autoPackageLocations",
]);

const KNOWN_SLOTS = new Set([
  "app",
  "db",
  "api",
  "auth",
  "ui",
  "analytics",
  "monitoring",
  "email",
  "rate-limit",
  "ai",
  "cache",
  "env",
  "typescript-config",
]);

// ─── REGISTRY_MAP keys ────────────────────────────────────────────────────────

describe("REGISTRY_MAP — keys are valid Preset field names", () => {
  it("every top-level key is a known Preset-adjacent field", () => {
    for (const key of Object.keys(REGISTRY_MAP)) {
      expect(
        KNOWN_PRESET_FIELDS.has(key),
        `REGISTRY_MAP key "${key}" is not a known Preset field`,
      ).toBe(true);
    }
  });

  it("has entries for all major stack categories", () => {
    expect(REGISTRY_MAP).toHaveProperty("database");
    expect(REGISTRY_MAP).toHaveProperty("api");
    expect(REGISTRY_MAP).toHaveProperty("auth");
    expect(REGISTRY_MAP).toHaveProperty("css");
    expect(REGISTRY_MAP).toHaveProperty("analytics");
    expect(REGISTRY_MAP).toHaveProperty("errorTracking");
  });
});

// ─── REGISTRY_MAP slot validity ───────────────────────────────────────────────

describe("REGISTRY_MAP — slots are valid registry slot names", () => {
  it("every [slot, variant] pair uses a known slot name", () => {
    for (const [group, values] of Object.entries(REGISTRY_MAP)) {
      for (const [value, pairs] of Object.entries(values)) {
        if (!pairs) continue;
        for (const [slot] of pairs) {
          expect(
            KNOWN_SLOTS.has(slot),
            `REGISTRY_MAP["${group}"]["${value}"] has unknown slot "${slot}"`,
          ).toBe(true);
        }
      }
    }
  });

  it("[slot, variant] pairs are arrays of exactly 2 strings", () => {
    for (const [group, values] of Object.entries(REGISTRY_MAP)) {
      for (const [value, pairs] of Object.entries(values)) {
        if (!pairs) continue;
        for (const pair of pairs) {
          expect(
            Array.isArray(pair) && pair.length === 2,
            `REGISTRY_MAP["${group}"]["${value}"] pair is malformed`,
          ).toBe(true);
          expect(typeof pair[0]).toBe("string");
          expect(typeof pair[1]).toBe("string");
        }
      }
    }
  });
});

// ─── REGISTRY_MAP — known integrations ───────────────────────────────────────

describe("REGISTRY_MAP — integration entries", () => {
  it("analytics.posthog maps to analytics slot", () => {
    const pairs = REGISTRY_MAP.analytics?.posthog;
    expect(pairs).not.toBeNull();
    expect(pairs?.some(([s]) => s === "analytics")).toBe(true);
  });

  it("errorTracking.sentry maps to monitoring slot", () => {
    const pairs = REGISTRY_MAP.errorTracking?.sentry;
    expect(pairs?.some(([s]) => s === "monitoring")).toBe(true);
  });

  it("auth.clerk maps to auth slot", () => {
    const pairs = REGISTRY_MAP.auth?.clerk;
    expect(pairs?.some(([s]) => s === "auth")).toBe(true);
  });

  it("database.drizzle has 3 driver variants", () => {
    const pairs = REGISTRY_MAP.database?.drizzle;
    expect(pairs).toHaveLength(3);
  });
});
