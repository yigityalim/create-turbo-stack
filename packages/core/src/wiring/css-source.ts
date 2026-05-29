import type { Preset } from "@create-turbo-stack/schema";
import { appDirOf, packageDirByName } from "../utils/package-path";
import { relativePath } from "../utils/path";

export interface CssSourceMap {
  /** app name → list of @source directives (relative paths) */
  [appName: string]: string[];
}

const CSS_CAPABLE_APPS = new Set(["nextjs", "vite-react", "vite-vue", "sveltekit", "astro"]);

/**
 * Compute @source directives for each app's globals.css.
 *
 * Each path is `relativePath(appDir, packageDir/src)` — adapts automatically
 * to custom app/package locations (e.g. `services/api` consuming
 * `packages/billing/u`). The anchor is the app's root directory (not the
 * actual globals.css file deeper down); Tailwind resolves @source relative
 * to that anchor in our setup.
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
    const appDir = appDirOf(app);

    // Each consumed CSS-producing package
    for (const consumed of app.consumes) {
      if (cssPackages.has(consumed)) {
        const pkgDir = packageDirByName(consumed, preset);
        sources.push(relativePath(appDir, `${pkgDir}/src`));
      }
    }

    map[app.name] = sources;
  }

  return map;
}
