import type { Package, Preset } from "@create-turbo-stack/schema";
import { integrationPackageName } from "@create-turbo-stack/schema";
import { activeProvider, getIntegration, INTEGRATION_CATEGORIES } from "../integrations";

/**
 * Based on preset selections, determine which packages are automatically
 * created. These are not user-specified — they're generated from choices like
 * database, API, auth, and the `integrations.*` providers.
 *
 * Structural built-ins (typescript-config, env) are explicit; every
 * provider-backed package is derived from the integration registry: if a
 * category has an active provider that scaffolds a package, that provider owns
 * the package name (`integrationPackageName`) and its `exports`. No per-category
 * branch to keep in sync — a new category appears here for free.
 */
export function resolveAutoPackages(preset: Preset): Package[] {
  const auto: Package[] = [];

  // Always: typescript-config
  auto.push({ name: "typescript-config", type: "config", producesCSS: false, exports: ["."] });

  // If env validation enabled
  if (preset.integrations.envValidation) {
    auto.push({ name: "env", type: "library", producesCSS: false, exports: ["."] });
  }

  // Provider-backed packages (db, api, auth, analytics, monitoring, email, …)
  for (const category of INTEGRATION_CATEGORIES) {
    const provider = activeProvider(preset, category);
    if (!provider) continue;
    const integration = getIntegration(category, provider);
    if (!integration?.resolvePackageFiles) continue;
    const name = integrationPackageName(category);
    const providerExports = integration.packageExports ?? ["."];
    // `packageOverrides.<name>.exports` is additive — extra subpaths surface
    // in package.json so the user can publish a custom entry without losing
    // what the provider emits. Deduped to keep package.json clean.
    const extraExports = preset.packageOverrides?.[name]?.exports ?? [];
    auto.push({
      name,
      type: "library",
      producesCSS: false,
      exports: Array.from(new Set([...providerExports, ...extraExports])),
    });
  }

  return auto;
}
