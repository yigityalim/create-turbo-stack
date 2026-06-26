/**
 * Pick which registry items a preset requires.
 *
 * Translates the preset's enum-typed slots into a flat list of
 * `(slot, variant)` pairs the resolver should look up. The resolver itself
 * (Phase 3) holds the registry-to-item map and turns these requests into
 * actual `PackageRegistryItem`s; this module is pure projection from
 * preset → request list, so it stays browser-safe and trivially testable.
 *
 * Discrimination rules:
 *   • `app`      — one request per `preset.apps[i]`, variant = app.type.
 *   • `auth`     — emitted when `preset.auth.provider !== "none"`,
 *                  variant = preset.auth.provider.
 *   • `db`       — emitted when `preset.database.strategy !== "none"`,
 *                  variant = `<strategy>-<driver>` (e.g. `drizzle-postgres`)
 *                  so each ORM × driver combo is its own item; supabase
 *                  has no driver and the variant is just `"supabase"`.
 *   • `api`      — emitted when `preset.api.strategy !== "none"`,
 *                  variant = `<strategy>` (`trpc`) or `<strategy>-<mode>`
 *                  for hono (`hono-standalone`, `hono-route`).
 *   • `env`      — emitted when `integrations.envValidation !== "none"`,
 *                  variant = the env validation provider id.
 *   • integrations (email, monitoring, analytics, rate-limit, ai, cache)
 *                — emitted when the value is not `"none"`, variant = that
 *                  value. `errorTracking` → slot `monitoring`,
 *                  `rateLimit` → slot `rate-limit` (kebab in the slot).
 *   • `typescript-config` — always emitted, variant = `"default"`.
 *   • `ui`       — emitted when at least one user package has
 *                  `producesCSS: true`, variant = `"shadcn-starter"`.
 *
 * The order of requests in the returned list IS meaningful in one
 * direction only: `typescript-config` first (every other item extends it),
 * then `env` (most items read from it), then everything else in
 * deterministic order. The resolver re-orders via `registryDependencies`
 * for the final materialize pass; this is just the seed.
 */

import type { PackageSlot, Preset } from "@create-turbo-stack/schema";

export interface ItemRequest {
  slot: PackageSlot;
  variant: string;
  /**
   * For app slots, the app's own name (`preset.apps[i].name`). The
   * resolver uses this for the materialize root (`apps/<name>/`). For
   * non-app slots it's the conventional auto-package short name
   * (`"env"`, `"db"`, `"auth"`, …) — matches the existing
   * `INTEGRATION_PACKAGE_NAMES` mapping in schema/options/integrations.
   */
  pkgName: string;
}

export function selectRegistryItems(preset: Preset): ItemRequest[] {
  const out: ItemRequest[] = [];

  // typescript-config first — every other package's tsconfig extends it.
  out.push({
    slot: "typescript-config",
    variant: "default",
    pkgName: "typescript-config",
  });

  // env next — auth/db/api/integrations all read from it.
  if (preset.integrations.envValidation !== "none") {
    out.push({
      slot: "env",
      variant: preset.integrations.envValidation,
      pkgName: "env",
    });
  }

  // Database: variant encodes ORM × driver. Supabase has no driver.
  if (preset.database.strategy !== "none") {
    const variant = computeDbVariant(preset.database);
    if (variant) {
      out.push({ slot: "db", variant, pkgName: "db" });
    }
  }

  // Auth: variant = the provider id.
  if (preset.auth.provider !== "none") {
    out.push({
      slot: "auth",
      variant: preset.auth.provider,
      pkgName: "auth",
    });
  }

  // API: variant = strategy, with hono's mode suffixed.
  if (preset.api.strategy !== "none") {
    const variant = computeApiVariant(preset.api);
    if (variant) {
      out.push({ slot: "api", variant, pkgName: "api" });
    }
  }

  // Optional integrations — uniform shape. Slot id matches the
  // `INTEGRATION_PACKAGE_NAMES` key, not the snakey `errorTracking` /
  // `rateLimit` enum key; we map here.
  const integrations = preset.integrations;
  if (integrations.errorTracking !== "none") {
    out.push({
      slot: "monitoring",
      variant: integrations.errorTracking,
      pkgName: "monitoring",
    });
  }
  if (integrations.email !== "none") {
    out.push({ slot: "email", variant: integrations.email, pkgName: "email" });
  }
  if (integrations.analytics !== "none") {
    out.push({
      slot: "analytics",
      variant: integrations.analytics,
      pkgName: "analytics",
    });
  }
  if (integrations.rateLimit !== "none") {
    out.push({
      slot: "rate-limit",
      variant: integrations.rateLimit,
      pkgName: "rate-limit",
    });
  }
  if (integrations.ai !== "none") {
    out.push({ slot: "ai", variant: integrations.ai, pkgName: "ai" });
  }
  if (integrations.cache !== "none") {
    out.push({ slot: "cache", variant: integrations.cache, pkgName: "cache" });
  }

  // UI is opt-in via a user package with producesCSS. Only emit once — the
  // first such package triggers it.
  if (preset.packages.some((p) => p.producesCSS)) {
    out.push({ slot: "ui", variant: "shadcn-starter", pkgName: "ui" });
  }

  // Apps last — one per preset app.
  for (const app of preset.apps) {
    out.push({ slot: "app", variant: app.type, pkgName: app.name });
  }

  return out;
}

/**
 * Translate a `DatabaseConfig` into a registry variant id.
 * `<strategy>-<driver>` for ORM-style strategies; bare strategy for
 * adapter-style ones (supabase).
 */
function computeDbVariant(database: Preset["database"]): string | null {
  if (database.strategy === "none") return null;
  if (database.strategy === "supabase") return "supabase";
  // Drizzle / Prisma both carry a `driver` discriminant on the schema —
  // index it generically without re-narrowing each ORM case.
  const driver = (database as { driver?: string }).driver;
  return driver ? `${database.strategy}-${driver}` : database.strategy;
}

/**
 * Translate an `ApiConfig` into a registry variant id. Hono carries a
 * `mode` (`standalone-app` / `route-handler`); tRPC does not.
 */
function computeApiVariant(api: Preset["api"]): string | null {
  if (api.strategy === "none") return null;
  if (api.strategy === "hono") {
    const mode = (api as { mode?: string }).mode;
    // `standalone-app`: the Hono server IS the app (`slot: app`,
    // variant `hono-standalone`) — there's no separate `packages/api`.
    // Only `nextjs-route` (Hono mounted inside another app) needs a package.
    if (mode === "nextjs-route") return "hono-route";
    return null;
  }
  return api.strategy;
}
