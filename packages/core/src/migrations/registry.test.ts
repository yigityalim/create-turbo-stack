import { describe, expect, it } from "vitest";
import { definePresetMigration } from "./types";

// Re-import the module fresh per test by going through a builder so each
// test owns a clean migration list. The exported registry is module-level
// state; isolation lets us assert behaviour without polluting siblings.

import { migratePreset, registerPresetMigration } from "./registry";

describe("migratePreset", () => {
  it("is a no-op when current === target", () => {
    const result = migratePreset({ schemaVersion: "1.0", x: 1 }, "1.0");
    expect(result).toEqual({ schemaVersion: "1.0", x: 1 });
  });

  it("defaults missing schemaVersion to '1.0'", () => {
    const result = migratePreset({ x: 1 }, "1.0");
    expect(result.schemaVersion).toBe("1.0");
  });

  it("throws when no chain reaches the target", () => {
    expect(() => migratePreset({ schemaVersion: "1.0" }, "9.9")).toThrow(
      /No migration registered from preset schema "1.0"/,
    );
  });

  it("applies a registered chain in order", () => {
    registerPresetMigration(
      definePresetMigration({
        from: "test-a",
        to: "test-b",
        apply: (p) => ({ ...p, step1: true }),
      }),
    );
    registerPresetMigration(
      definePresetMigration({
        from: "test-b",
        to: "test-c",
        apply: (p) => ({ ...p, step2: true }),
      }),
    );

    const result = migratePreset({ schemaVersion: "test-a", original: 1 }, "test-c");
    expect(result.step1).toBe(true);
    expect(result.step2).toBe(true);
    expect(result.schemaVersion).toBe("test-c");
    expect(result.original).toBe(1);
  });
});
