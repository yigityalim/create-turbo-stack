/**
 * TEMPLATE — copy this file to add a new app framework.
 *
 * This file is NOT registered. It exists as a typed, type-checked
 * reference so the pattern can't drift from the real interface.
 *
 * ─── How to add a framework (e.g. Nuxt, SolidStart, Qwik City) ──────
 *
 *   1. Add the framework value to `AppTypeSchema` in
 *      `packages/schema/src/options/app.ts`.
 *
 *   2. Copy this file to `app-types/<framework>.ts` and rename the
 *      exported value (e.g. `nuxtAppType`).
 *
 *   3. Implement the two `build*` methods. Common context is
 *      pre-computed for you in `AppResolveContext`:
 *      - `base`           absolute output directory (e.g. "apps/web")
 *      - `scope`           preset basics scope (e.g. "@my-saas")
 *      - `appRefs`         workspace deps the app `consumes`
 *      - `cssDirectives`   `@source` lines for Tailwind 4 CSS
 *
 *   4. Ship the framework's source files as a registry item under
 *      `registry/apps/<framework>/<variant>/` with `slot: "app"` and
 *      `variant: "<framework>"`. The item's `files[]` becomes the
 *      app's source tree; this file owns the package.json + tsconfig
 *      rules around it.
 *
 *   5. Append the new export to `BUILT_IN_APP_TYPES` in
 *      `app-types/index.ts`. Order matters only for prompt display.
 *
 *   6. If the value was previously in `INTENTIONALLY_UNSUPPORTED_APP_TYPES`
 *      (in `core/src/registry-sync.test.ts`), remove it. The sync test
 *      will fail otherwise.
 *
 * env-chain, catalog, workspace refs all pick up the new app type
 * automatically — no edits there.
 */

import { defineAppType } from "./types";

export const templateAppType = defineAppType({
  // ── Identity ──────────────────────────────────────────────────────
  type: "tauri", // ← real schema enum value; must exist in AppTypeSchema

  // ── package.json ──────────────────────────────────────────────────
  // Note: the `lint` script, linter devDep, and any per-package linter
  // config are injected centrally in app-files.ts — don't set them here.
  buildPackageJson(_preset, app, { scope, appRefs }) {
    const deps: Record<string, string> = {
      ...appRefs, // workspace:* refs the app consumes
      // Add framework runtime deps here:
      // "@tauri-apps/api": "catalog:",
    };

    const devDeps: Record<string, string> = {
      [`${scope}/typescript-config`]: "workspace:*",
      typescript: "catalog:",
    };

    return {
      name: app.name,
      version: "0.1.0",
      private: true,
      type: "module",
      scripts: {
        dev: "echo TODO dev",
        build: "echo TODO build",
        "type-check": "tsc --noEmit",
      },
      dependencies: deps,
      devDependencies: devDeps,
    };
  },

  // ── tsconfig.json ─────────────────────────────────────────────────
  buildTsconfig(_preset, _app, { scope }) {
    return {
      extends: `${scope}/typescript-config/base.json`,
      compilerOptions: {
        // Framework-specific compilerOptions go here.
      },
      include: ["src/**/*"],
      exclude: ["node_modules", "dist"],
    };
  },

  // ── Optional: extra files outside the registry item's source ─────
  // Use only when a file genuinely can't be expressed as a static
  // registry-item source file (e.g. generated platform configs).
  // buildExtraFiles(preset, app, { base }) {
  //   return [{ path: `${base}/some-config.toml`, content: "...", isDirectory: false }];
  // },
});
