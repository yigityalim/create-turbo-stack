import type { Preset } from "@create-turbo-stack/schema";
import { INTEGRATION_OPTION_CATEGORIES, integrationPackageName } from "@create-turbo-stack/schema";
import { registerTemplates } from "../render/template-registry";
import type { IntegrationCategory, IntegrationDefinition } from "./types";

const registry = new Map<string, IntegrationDefinition>();

/**
 * The active provider selected for `category` on this preset, or null
 * when the slot is "none". The three top-level slots (auth/database/api)
 * are discriminated unions; the rest live under `integrations.*`. Single
 * source of this mapping — catalog, env-chain, and the package resolver
 * all call it instead of repeating the switch.
 */
export function activeProvider(preset: Preset, category: IntegrationCategory): string | null {
  switch (category) {
    case "auth":
      return preset.auth.provider === "none" ? null : preset.auth.provider;
    case "database":
      return preset.database.strategy === "none" ? null : preset.database.strategy;
    case "api":
      return preset.api.strategy === "none" ? null : preset.api.strategy;
    default: {
      const value = preset.integrations[category];
      return !value || value === "none" ? null : value;
    }
  }
}

/** The three top-level discriminated-union slots, distinct from `integrations.*`. */
const TOP_LEVEL_CATEGORIES = ["auth", "database", "api"] as const;

/**
 * Every integration category, in a stable order. Derived from the schema
 * (top-level slots first, then the `integrations.*` keys) so a new category
 * appears here automatically.
 */
export const INTEGRATION_CATEGORIES = [
  ...TOP_LEVEL_CATEGORIES,
  ...INTEGRATION_OPTION_CATEGORIES,
] as readonly IntegrationCategory[];

const key = (category: IntegrationCategory, provider: string) => `${category}:${provider}`;

/**
 * Resolve a category + provider pair to the template path used by
 * `packages/templates`. Matches how the build script keys baked templates:
 * `<pkgName>/<provider>` for the top-level stack choices (e.g. `db/drizzle`,
 * `auth/clerk`) and `integration/<pkgName>/<provider>` for the per-app
 * integration categories (e.g. `integration/monitoring/sentry`). The folder
 * uses the package name, so errorTracking→monitoring and rateLimit→rate-limit
 * fall out of the shared map — no special-casing.
 */
function templateCategoryFor(category: IntegrationCategory, provider: string): string {
  const pkgName = integrationPackageName(category);
  const isTopLevel = (TOP_LEVEL_CATEGORIES as readonly string[]).includes(category);
  return isTopLevel ? `${pkgName}/${provider}` : `integration/${pkgName}/${provider}`;
}

export function registerIntegration(def: IntegrationDefinition): void {
  registry.set(key(def.category, def.provider), def);
  if (def.templates && Object.keys(def.templates).length > 0) {
    registerTemplates(templateCategoryFor(def.category, def.provider), def.templates);
  }
}

export function getIntegration(
  category: IntegrationCategory,
  provider: string,
): IntegrationDefinition | undefined {
  return registry.get(key(category, provider));
}

export function listIntegrations(category?: IntegrationCategory): readonly IntegrationDefinition[] {
  const all = Array.from(registry.values());
  return category ? all.filter((d) => d.category === category) : all;
}
