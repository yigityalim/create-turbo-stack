/**
 * Guardrail: every shipped registry item must be *reachable*.
 *
 * `selectRegistryItems(preset)` turns a preset's enum values into
 * `(slot, variant)` lookups. If an item's `variant` doesn't match any value
 * the selector can ever emit for that slot, the item is an orphan — it builds
 * into `BUILTIN_REGISTRY_ITEMS` but no preset can select it, so it silently
 * never ships. That exact mismatch (enum `email: "react-email-resend"` vs item
 * `variant: "resend"`, `rate-limit`/`cache` `upstash` vs `upstash-redis`) is
 * what this test exists to catch.
 *
 * It validates the item → enum direction only. The reverse (every enum value
 * has an item) is intentionally NOT asserted: most slots are still being
 * authored, so a missing item is a known gap, not a regression.
 */

import {
  AiSchema,
  AnalyticsSchema,
  AppTypeSchema,
  AuthProviderSchema,
  CacheSchema,
  DrizzleDriverSchema,
  EmailSchema,
  EnvValidationSchema,
  ErrorTrackingSchema,
  type PackageSlot,
  RateLimitSchema,
} from "@create-turbo-stack/schema";
import { describe, expect, it } from "vitest";
import { BUILTIN_REGISTRY_ITEMS } from "./builtin-items.js";

/** Drop the `"none"` sentinel — it's never a registry variant. */
const providers = (opts: readonly string[]) => opts.filter((o) => o !== "none");

/**
 * The universe of variants the selector (`select.ts`) can emit per slot.
 * Enum-backed slots derive directly from the schema; `db` / `api` mirror the
 * composite rules in `computeDbVariant` / `computeApiVariant`; the two
 * structural slots have a fixed variant.
 */
const VALID_VARIANTS: Record<PackageSlot, readonly string[]> = {
  "typescript-config": ["default"],
  ui: ["shadcn-starter"],
  env: providers(EnvValidationSchema.options),
  analytics: providers(AnalyticsSchema.options),
  monitoring: providers(ErrorTrackingSchema.options),
  email: providers(EmailSchema.options),
  "rate-limit": providers(RateLimitSchema.options),
  ai: providers(AiSchema.options),
  cache: providers(CacheSchema.options),
  auth: providers(AuthProviderSchema.options),
  app: AppTypeSchema.options,
  // db: supabase + driverless prisma + one drizzle variant per driver.
  db: ["supabase", "prisma", ...DrizzleDriverSchema.options.map((d) => `drizzle-${d}`)],
  // api: tRPC + Hono route-handler. (Hono standalone-app is served by the
  // `app` slot, not a separate api package — see computeApiVariant.)
  api: ["trpc", "hono-route"],
};

describe("registry ↔ schema sync", () => {
  it("every built-in item targets a slot+variant a preset can select", () => {
    for (const item of BUILTIN_REGISTRY_ITEMS) {
      const slot = item.slot as PackageSlot;
      const valid = VALID_VARIANTS[slot];
      expect(valid, `item ${item.name}: unknown slot "${item.slot}"`).toBeDefined();
      expect(
        valid.includes(item.variant ?? ""),
        `item ${item.name}: variant "${item.variant}" is not selectable for slot "${slot}" — ` +
          `valid: ${valid.join(", ")}`,
      ).toBe(true);
    }
  });

  it("VALID_VARIANTS covers every PackageSlot", () => {
    // If a new slot is added to the schema, force a decision here rather than
    // letting items in that slot skip validation.
    for (const item of BUILTIN_REGISTRY_ITEMS) {
      expect(Object.keys(VALID_VARIANTS)).toContain(item.slot);
    }
  });
});
