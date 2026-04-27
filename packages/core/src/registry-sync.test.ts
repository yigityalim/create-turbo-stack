// Schema enum ↔ registry sync guardrail. Drift fails CI: a new value
// must either be implemented (registered) or be in the allowlist.

import {
  AiSchema,
  AnalyticsSchema,
  ApiStrategySchema,
  AppTypeSchema,
  AuthProviderSchema,
  DatabaseStrategySchema,
  EmailSchema,
  ErrorTrackingSchema,
  RateLimitSchema,
} from "@create-turbo-stack/schema";
import { describe, expect, it } from "vitest";
import { getIntegration, type IntegrationCategory } from "./integrations";
import { listSupportedAppTypes } from "./resolve/app-types";

// App types

/**
 * App types declared in the schema but deliberately not yet implemented.
 * `resolveAppFiles` throws UnsupportedAppTypeError for these — the CLI
 * filters them from prompts so users can't pick them by mistake.
 *
 * To remove an entry: write a plugin in `app-types/<name>.ts` and
 * register it in `app-types/index.ts`. The test will then fail until
 * you also remove the name from this list.
 */
const INTENTIONALLY_UNSUPPORTED_APP_TYPES = ["expo", "vite-vue", "tauri"] as const;

describe("App type registry ↔ schema", () => {
  it("every registered app type is a valid schema enum value", () => {
    const schemaValues: readonly string[] = AppTypeSchema.options;
    for (const registered of listSupportedAppTypes()) {
      expect(schemaValues, `registry value "${registered}" missing from schema`).toContain(
        registered,
      );
    }
  });

  it("every schema enum value is either registered or in the unsupported allowlist", () => {
    const registered = new Set<string>(listSupportedAppTypes());
    const unsupported = new Set<string>(INTENTIONALLY_UNSUPPORTED_APP_TYPES);
    for (const v of AppTypeSchema.options) {
      const known = registered.has(v) || unsupported.has(v);
      expect(
        known,
        `app type "${v}" is in schema but neither registered nor in INTENTIONALLY_UNSUPPORTED_APP_TYPES`,
      ).toBe(true);
    }
  });

  it("unsupported allowlist matches schema − registry exactly (no stale entries)", () => {
    const registered = new Set<string>(listSupportedAppTypes());
    const computedUnsupported = AppTypeSchema.options.filter((v) => !registered.has(v)).sort();
    expect(computedUnsupported).toEqual([...INTENTIONALLY_UNSUPPORTED_APP_TYPES].sort());
  });
});

// Integration providers

const INTEGRATION_ENUMS: ReadonlyArray<{
  category: IntegrationCategory;
  values: readonly string[];
}> = [
  { category: "auth", values: AuthProviderSchema.options },
  { category: "database", values: DatabaseStrategySchema.options },
  { category: "api", values: ApiStrategySchema.options },
  { category: "analytics", values: AnalyticsSchema.options },
  { category: "errorTracking", values: ErrorTrackingSchema.options },
  { category: "email", values: EmailSchema.options },
  { category: "rateLimit", values: RateLimitSchema.options },
  { category: "ai", values: AiSchema.options },
];

describe("Integration registry ↔ schema", () => {
  for (const { category, values } of INTEGRATION_ENUMS) {
    it(`${category}: every non-"none" provider has a registered IntegrationDefinition`, () => {
      const missing: string[] = [];
      for (const v of values) {
        if (v === "none") continue;
        if (!getIntegration(category, v)) missing.push(v);
      }
      expect(missing, `unregistered providers in "${category}": ${missing.join(", ")}`).toEqual([]);
    });
  }
});
