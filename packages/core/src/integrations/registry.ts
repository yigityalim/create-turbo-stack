import type { Preset } from "@create-turbo-stack/schema";
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

/** Every integration category, in a stable order for iteration. */
export const INTEGRATION_CATEGORIES: readonly IntegrationCategory[] = [
  "auth",
  "database",
  "api",
  "analytics",
  "errorTracking",
  "email",
  "rateLimit",
  "ai",
];

const key = (category: IntegrationCategory, provider: string) => `${category}:${provider}`;

/**
 * Resolve a category + provider pair to the template path used by
 * `packages/templates`. This must match how the build script keys
 * baked templates: `integration/<category>/<provider>` for the per-app
 * integration categories, and `<category>/<provider>` for the top-level
 * stack choices (auth, database, api).
 */
function templateCategoryFor(category: IntegrationCategory, provider: string): string {
  switch (category) {
    case "auth":
    case "database":
    case "api":
      return `${category}/${provider}`;
    case "errorTracking":
      return `integration/monitoring/${provider}`;
    default:
      return `integration/${category}/${provider}`;
  }
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
