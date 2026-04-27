import type { Preset } from "@create-turbo-stack/schema";
import { getIntegration, type IntegrationCategory } from "../integrations";
import { VERSIONS } from "./versions";

export interface CatalogEntry {
  name: string;
  version: string;
}

/**
 * Compute the full dependency catalog based on preset selections.
 * Each integration/framework/tool contributes its dependencies.
 */
export function computeCatalog(preset: Preset): CatalogEntry[] {
  const catalog = new Map<string, string>();

  const add = (name: string, version: string) => {
    if (!catalog.has(name)) catalog.set(name, version);
  };

  // Always
  add("typescript", VERSIONS.typescript);

  if (preset.basics.linter === "biome") {
    add("@biomejs/biome", VERSIONS.biome);
  } else {
    add("eslint", VERSIONS.eslint);
    add("prettier", VERSIONS.prettier);
  }

  if (preset.css.framework === "tailwind4") {
    add("tailwindcss", VERSIONS.tailwind4);
    add("@tailwindcss/postcss", VERSIONS.tailwindPostcss);
  } else if (preset.css.framework === "tailwind3") {
    add("tailwindcss", VERSIONS.tailwind3);
    add("postcss", VERSIONS.postcss);
    add("autoprefixer", VERSIONS.autoprefixer);
  }

  if (preset.css.ui === "shadcn") {
    add("tw-animate-css", VERSIONS.twAnimateCss);
    add("clsx", VERSIONS.clsx);
    add("tailwind-merge", VERSIONS.tailwindMerge);
  }

  for (const app of preset.apps) {
    if (app.type === "nextjs" || app.type === "nextjs-api-only") {
      add("next", VERSIONS.next);
      add("react", VERSIONS.react);
      add("react-dom", VERSIONS.reactDom);
      add("@types/react", VERSIONS.typesReact);
      add("@types/react-dom", VERSIONS.typesReactDom);
      add("@types/node", VERSIONS.typesNode);
    }
    if (app.type === "hono-standalone") {
      add("hono", VERSIONS.hono);
      add("@hono/node-server", VERSIONS.honoNodeServer);
      add("tsx", VERSIONS.tsx);
    }
    if (app.type === "vite-react") {
      add("react", VERSIONS.react);
      add("react-dom", VERSIONS.reactDom);
      add("@vitejs/plugin-react", VERSIONS.vitejsPluginReact);
      add("vite", VERSIONS.vite);
      add("@types/react", VERSIONS.typesReact);
      add("@types/react-dom", VERSIONS.typesReactDom);
    }
    if (app.type === "sveltekit") {
      add("@sveltejs/kit", VERSIONS.sveltejsKit);
      add("svelte", VERSIONS.svelte);
      add("@sveltejs/adapter-auto", VERSIONS.sveltejsAdapterAuto);
      add("@sveltejs/vite-plugin-svelte", VERSIONS.sveltejsVitePluginSvelte);
      add("vite", VERSIONS.vite);
    }
    if (app.type === "astro") {
      add("astro", VERSIONS.astro);
      add("@astrojs/react", VERSIONS.astrojsReact);
    }
    if (app.type === "remix") {
      add("@remix-run/node", VERSIONS.remixRunNode);
      add("@remix-run/react", VERSIONS.remixRunReact);
      add("@remix-run/serve", VERSIONS.remixRunServe);
      add("@remix-run/dev", VERSIONS.remixRunDev);
      add("react", VERSIONS.react);
      add("react-dom", VERSIONS.reactDom);
      add("isbot", VERSIONS.isbot);
      add("@types/react", VERSIONS.typesReact);
      add("@types/react-dom", VERSIONS.typesReactDom);
      add("vite", VERSIONS.vite);
    }
    if (app.i18n) {
      add("next-intl", VERSIONS.nextIntl);
    }
  }

  // Env validation: a built-in pseudo-integration (boolean flag, not a provider)
  if (preset.integrations.envValidation) {
    add("@t3-oss/env-nextjs", VERSIONS.t3Env);
    add("zod", VERSIONS.zod);
  }

  // Provider-driven catalog entries (auth, database, api, analytics, ...)
  // come from the integration registry — no hardcoded if-cascade.
  for (const category of INTEGRATION_CATEGORIES) {
    const provider = resolveCategorySelection(preset, category);
    if (!provider) continue;
    const integration = getIntegration(category, provider);
    if (!integration) continue;
    for (const entry of integration.catalogEntries(preset)) {
      add(entry.name, entry.version);
    }
  }

  return Array.from(catalog.entries()).map(([name, version]) => ({ name, version }));
}

const INTEGRATION_CATEGORIES: IntegrationCategory[] = [
  "auth",
  "database",
  "api",
  "analytics",
  "errorTracking",
  "email",
  "rateLimit",
  "ai",
];

function resolveCategorySelection(preset: Preset, category: IntegrationCategory): string | null {
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
