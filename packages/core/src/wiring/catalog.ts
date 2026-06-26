import type { PackageRegistryItem, Preset } from "@create-turbo-stack/schema";
import { parseDep } from "../registry/parse-dep";
import { getLinter } from "./linters";
import { VERSIONS } from "./versions";

export interface CatalogEntry {
  name: string;
  version: string;
}

/**
 * Compute the full dependency catalog based on preset selections plus the
 * registry items the engine has bundled. The catalog is the single
 * resolution layer for workspace deps: every package.json references
 * `catalog:`, and this function decides what's in that catalog.
 *
 * Two layers feed into the catalog:
 *
 *   1. **Rules** — framework + CSS deps that come from the preset itself
 *      (`next`, `react`, `tailwindcss`, …). Engine knows these from the app
 *      type and CSS config. Hard-coded against the central `VERSIONS` map.
 *
 *   2. **Content** — every selected registry item's `dependencies` and
 *      `devDependencies`. Items can declare versions inline
 *      (`zod@^4.0.0`); when they don't, the engine looks up the bare name
 *      in `VERSIONS`, falling back to `"latest"` if it's unknown.
 *
 * Pure function — no I/O. Browser-safe.
 */
export function computeCatalog(
  preset: Preset,
  items: ReadonlyArray<PackageRegistryItem> = [],
): CatalogEntry[] {
  const catalog = new Map<string, string>();

  const add = (name: string, version: string) => {
    if (!catalog.has(name)) catalog.set(name, version);
  };

  // Always
  add("typescript", VERSIONS.typescript);
  add("@types/node", VERSIONS.typesNode);

  for (const entry of getLinter(preset.basics.linter).catalogEntries) {
    add(entry.name, entry.version);
  }

  if (preset.css.framework === "tailwind4") {
    add("tailwindcss", VERSIONS.tailwind4);
    add("@tailwindcss/postcss", VERSIONS.tailwindPostcss);
  }

  if (preset.css.ui === "shadcn") {
    add("tw-animate-css", VERSIONS.twAnimateCss);
    add("clsx", VERSIONS.clsx);
    add("tailwind-merge", VERSIONS.tailwindMerge);
    // The shadcn `ui` package is React regardless of which app framework
    // consumes it — pin React + its types even when no app is React-based
    // (e.g. a SvelteKit app that imports the UI package's styles).
    add("react", VERSIONS.react);
    add("react-dom", VERSIONS.reactDom);
    add("@types/react", VERSIONS.typesReact);
    add("@types/react-dom", VERSIONS.typesReactDom);
  }

  // Next.js apps pull in @sentry/nextjs directly (client + edge + build
  // plugin) — the app-type adds it to package.json, so it needs a catalog pin.
  if (
    preset.integrations.errorTracking === "sentry" &&
    preset.apps.some((a) => a.type === "nextjs" || a.type === "nextjs-api-only")
  ) {
    add("@sentry/nextjs", VERSIONS.sentryNextjs);
  }

  // Prisma ships a new client every major with breaking codegen changes —
  // pin it (the items declare the deps but the catalog owns the version).
  if (preset.database.strategy === "prisma") {
    add("@prisma/client", VERSIONS.prismaClient);
    add("prisma", VERSIONS.prisma);
  }

  // next-auth's stable `latest` is still v4; pin the v5 beta the item targets.
  if (preset.auth.provider === "next-auth") {
    add("next-auth", VERSIONS.nextAuth);
  }

  for (const app of preset.apps) {
    if (app.type === "nextjs" || app.type === "nextjs-api-only") {
      add("next", VERSIONS.next);
      add("react", VERSIONS.react);
      add("react-dom", VERSIONS.reactDom);
      add("@types/react", VERSIONS.typesReact);
      add("@types/react-dom", VERSIONS.typesReactDom);
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
      if (preset.css.framework === "tailwind4") add("@tailwindcss/vite", VERSIONS.tailwindVite);
    }
    if (app.type === "vite-vue") {
      add("vue", VERSIONS.vue);
      add("@vitejs/plugin-vue", VERSIONS.vitejsPluginVue);
      add("@vue/tsconfig", VERSIONS.vueTsconfig);
      add("vue-tsc", VERSIONS.vueTsc);
      add("vite", VERSIONS.vite);
      add("@types/node", VERSIONS.typesNode);
      if (preset.css.framework === "tailwind4") add("@tailwindcss/vite", VERSIONS.tailwindVite);
    }
    if (app.type === "expo") {
      add("expo", VERSIONS.expo);
      add("expo-status-bar", VERSIONS.expoStatusBar);
      add("react", VERSIONS.react);
      add("react-native", VERSIONS.reactNative);
      add("@types/react", VERSIONS.typesReact);
    }
    if (app.type === "sveltekit") {
      add("@sveltejs/kit", VERSIONS.sveltejsKit);
      add("svelte", VERSIONS.svelte);
      add("@sveltejs/adapter-auto", VERSIONS.sveltejsAdapterAuto);
      add("@sveltejs/vite-plugin-svelte", VERSIONS.sveltejsVitePluginSvelte);
      add("svelte-check", VERSIONS.svelteCheck);
      add("vite", VERSIONS.vite);
    }
    if (app.type === "astro") {
      add("astro", VERSIONS.astro);
      add("@astrojs/check", VERSIONS.astrojsCheck);
      add("@astrojs/react", VERSIONS.astrojsReact);
      add("react", VERSIONS.react);
      add("react-dom", VERSIONS.reactDom);
      add("@types/react", VERSIONS.typesReact);
      add("@types/react-dom", VERSIONS.typesReactDom);
    }
    if (app.i18n) {
      add("next-intl", VERSIONS.nextIntl);
    }
  }

  // Items contribute their declared deps. Versions come from inline specs
  // ("zod@^4.0.0"), the central VERSIONS map (by bare name), or "latest"
  // as the last-resort fallback.
  for (const item of items) {
    for (const spec of item.dependencies) {
      const { name, version } = parseDep(spec);
      const resolved = version !== "latest" ? version : (versionFromMap(name) ?? "latest");
      add(name, resolved);
    }
    for (const spec of item.devDependencies) {
      const { name, version } = parseDep(spec);
      const resolved = version !== "latest" ? version : (versionFromMap(name) ?? "latest");
      add(name, resolved);
    }
  }

  return Array.from(catalog.entries()).map(([name, version]) => ({ name, version }));
}

/**
 * Best-effort lookup of a bare package name in the central VERSIONS map.
 * Keys in VERSIONS are camelCase versions of npm names (`@t3-oss/env-nextjs`
 * → `t3Env`), so we can't just `VERSIONS[name]`. This is a small
 * known-package table; unknown packages return undefined and the caller
 * falls back to "latest".
 */
function versionFromMap(name: string): string | undefined {
  const KNOWN: Record<string, string> = {
    "@t3-oss/env-nextjs": VERSIONS.t3Env,
    zod: VERSIONS.zod,
    next: VERSIONS.next,
    react: VERSIONS.react,
    "react-dom": VERSIONS.reactDom,
    "@types/react": VERSIONS.typesReact,
    "@types/react-dom": VERSIONS.typesReactDom,
    "@types/node": VERSIONS.typesNode,
    typescript: VERSIONS.typescript,
    tailwindcss: VERSIONS.tailwind4,
    "@tailwindcss/postcss": VERSIONS.tailwindPostcss,
    "@tailwindcss/vite": VERSIONS.tailwindVite,
    "tw-animate-css": VERSIONS.twAnimateCss,
    clsx: VERSIONS.clsx,
    "tailwind-merge": VERSIONS.tailwindMerge,
    hono: VERSIONS.hono,
    "@hono/node-server": VERSIONS.honoNodeServer,
    tsx: VERSIONS.tsx,
    "next-intl": VERSIONS.nextIntl,
    vite: VERSIONS.vite,
    "@vitejs/plugin-react": VERSIONS.vitejsPluginReact,
    "@sveltejs/kit": VERSIONS.sveltejsKit,
    svelte: VERSIONS.svelte,
    "@sveltejs/adapter-auto": VERSIONS.sveltejsAdapterAuto,
    "@sveltejs/vite-plugin-svelte": VERSIONS.sveltejsVitePluginSvelte,
    "svelte-check": VERSIONS.svelteCheck,
    astro: VERSIONS.astro,
    "@astrojs/check": VERSIONS.astrojsCheck,
    "@astrojs/react": VERSIONS.astrojsReact,
  };
  return KNOWN[name];
}
