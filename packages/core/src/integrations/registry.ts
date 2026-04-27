import { registerTemplates } from "../render/template-registry";
import type { IntegrationCategory, IntegrationDefinition } from "./types";

const registry = new Map<string, IntegrationDefinition>();

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
