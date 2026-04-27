import { ValidatedPresetSchema } from "@create-turbo-stack/schema";
import { describe, expect, it } from "vitest";
import { migratePreset, registerPresetMigration } from "./registry";
import { definePresetMigration } from "./types";

/**
 * End-to-end migration test.
 *
 * The current schema is at "1.0" and ships with no migrations, so we
 * register a fake "0.9 → 1.0" pair here to exercise the full flow:
 * read an old preset, walk the migration chain, validate the result
 * against the live schema. This catches a class of bugs the unit tests
 * miss — the unit tests prove `migratePreset` walks a chain; this
 * proves the output is still acceptable to Zod.
 *
 * Real future migrations should follow this same pattern (and live in
 * their own `v<from>-to-<to>.ts` files), with their own integration
 * test fixtures kept alongside.
 */
describe("preset migration — full validation flow", () => {
  // Hypothetical pre-versioning shape: had an extra `legacyFlag` field
  // and a top-level `i18nDefault` that has since moved into per-app
  // `i18n: boolean`. This is illustrative — the real schema didn't
  // actually go through this transition, but the registry is symmetric
  // for any from→to pair.
  registerPresetMigration(
    definePresetMigration({
      from: "0.9",
      to: "1.0",
      apply(preset) {
        const {
          legacyFlag: _legacyFlag,
          i18nDefault,
          ...rest
        } = preset as Record<string, unknown> & { legacyFlag?: unknown; i18nDefault?: boolean };
        const apps = Array.isArray(rest.apps)
          ? rest.apps.map((a) => ({
              ...(a as Record<string, unknown>),
              i18n: (a as { i18n?: boolean }).i18n ?? i18nDefault ?? false,
            }))
          : [];
        return { ...rest, apps, schemaVersion: "1.0" };
      },
    }),
  );

  it("migrates an old preset and the result validates against the current schema", () => {
    const oldPreset = {
      schemaVersion: "0.9",
      name: "demo",
      version: "1.0.0",
      legacyFlag: "removed-in-1.0",
      i18nDefault: true,
      basics: {
        projectName: "demo",
        packageManager: "bun",
        scope: "@demo",
        typescript: "strict",
        linter: "biome",
        gitInit: false,
      },
      database: { strategy: "none" },
      api: { strategy: "none" },
      auth: { provider: "none", rbac: false, entitlements: false },
      css: { framework: "tailwind4", ui: "none", styling: "css-variables" },
      integrations: {
        analytics: "none",
        errorTracking: "none",
        email: "none",
        rateLimit: "none",
        ai: "none",
        envValidation: false,
      },
      apps: [
        {
          name: "web",
          type: "nextjs",
          port: 3000,
          // intentionally no i18n — should pick up i18nDefault
          cms: "none",
          consumes: [],
        },
      ],
      packages: [],
    };

    const migrated = migratePreset(oldPreset, "1.0");

    // legacyFlag is gone, schemaVersion bumped, i18n filled from default.
    expect(migrated.legacyFlag).toBeUndefined();
    expect(migrated.schemaVersion).toBe("1.0");
    const apps = migrated.apps as { i18n: boolean }[];
    expect(apps[0].i18n).toBe(true);

    // Critically: the migrated shape passes the live validator.
    const result = ValidatedPresetSchema.safeParse(migrated);
    expect(result.success).toBe(true);
  });
});
