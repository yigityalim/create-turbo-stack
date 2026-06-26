/**
 * App type registry — central source of truth for which frameworks are
 * scaffolded and how. Adding a new framework: write `app-types/<name>.ts`
 * and append it to BUILT_IN_APP_TYPES below. No other code changes needed.
 */

import { astroAppType } from "./astro";
import { expoAppType } from "./expo";
import { honoStandaloneAppType } from "./hono-standalone";
import { nextjsApiOnlyAppType, nextjsAppType } from "./nextjs";
import { registerAppType } from "./registry";
import { sveltekitAppType } from "./sveltekit";
import { viteReactAppType } from "./vite-react";
import { viteVueAppType } from "./vite-vue";

const BUILT_IN_APP_TYPES = [
  nextjsAppType,
  nextjsApiOnlyAppType,
  honoStandaloneAppType,
  viteReactAppType,
  viteVueAppType,
  sveltekitAppType,
  astroAppType,
  expoAppType,
];

for (const def of BUILT_IN_APP_TYPES) {
  registerAppType(def);
}

export {
  getAppTypeDefinition,
  listSupportedAppTypes,
  registerAppType,
} from "./registry";
export { type AppResolveContext, type AppTypeDefinition, defineAppType } from "./types";
