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
 *   3. Implement the three `build*` methods. Common context is
 *      pre-computed for you in `AppResolveContext`:
 *      - `base`           absolute output directory (e.g. "apps/web")
 *      - `scope`           preset basics scope (e.g. "@my-saas")
 *      - `appRefs`         workspace deps the app `consumes`
 *      - `cssDirectives`   `@source` lines for Tailwind 4 CSS
 *
 *   4. Create `.eta` source templates in
 *      `packages/templates/src/app/<framework>/` then run
 *      `bun run build:templates` to regenerate `templates-map.ts`.
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
  templateCategory: "app/tauri", // ← matches packages/templates/src/<this>/

  // ── package.json ──────────────────────────────────────────────────
  buildPackageJson(preset, app, { scope, appRefs }) {
    const deps: Record<string, string> = {
      ...appRefs, // workspace:* refs the app consumes
      // Add framework runtime deps here:
      // "@tauri-apps/api": "catalog:",
    };

    const devDeps: Record<string, string> = {
      [`${scope}/typescript-config`]: "workspace:*",
      typescript: "catalog:",
    };
    if (preset.basics.linter === "biome") devDeps["@biomejs/biome"] = "catalog:";

    return {
      name: app.name,
      version: "0.1.0",
      private: true,
      type: "module",
      scripts: {
        dev: "echo TODO dev",
        build: "echo TODO build",
        lint: preset.basics.linter === "biome" ? "biome check" : "eslint .",
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

  // ── Template context ──────────────────────────────────────────────
  // Variables here are available in your .eta templates as `it.*`.
  // Keep this minimal — only what your templates actually read.
  buildTemplateContext(_preset, app, { cssDirectives }) {
    return {
      app,
      wiring: { cssSourceDirectives: cssDirectives },
    };
  },

  // ── Optional: extra files outside the templated directory ─────────
  // Use only when a file genuinely doesn't fit as a .eta template.
  // buildExtraFiles(preset, app, { base }) {
  //   return [{ path: `${base}/some-config.toml`, content: "...", isDirectory: false }];
  // },
});
