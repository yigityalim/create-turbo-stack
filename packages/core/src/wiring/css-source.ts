import type { Preset } from "@create-turbo-stack/schema";

export interface CssSourceMap {
  /** app name → list of @source directives (relative paths) */
  [appName: string]: string[];
}

const CSS_CAPABLE_APPS = new Set([
  "nextjs",
  "vite-react",
  "vite-vue",
  "sveltekit",
  "astro",
  "remix",
]);

/**
 * Compute @source directives for each app's globals.css.
 *
 * Path: from apps/{app}/src/app/globals.css → packages/{pkg}/src
 * Relative: ../../../../packages/{pkg}/src
 */
export function computeCssSourceMap(preset: Preset): CssSourceMap {
  const map: CssSourceMap = {};

  const cssPackages = new Set<string>();
  for (const pkg of preset.packages) {
    if (pkg.producesCSS) cssPackages.add(pkg.name);
  }

  for (const app of preset.apps) {
    if (!CSS_CAPABLE_APPS.has(app.type)) continue;

    const sources: string[] = [];

    // Each consumed CSS-producing package
    for (const consumed of app.consumes) {
      if (cssPackages.has(consumed)) {
        sources.push(`../../packages/${consumed}/src`);
      }
    }

    map[app.name] = sources;
  }

  return map;
}
