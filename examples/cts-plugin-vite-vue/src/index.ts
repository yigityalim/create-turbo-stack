/**
 * Reference plugin — Vite + Vue 3 app type.
 *
 * Wired by listing this package in a project's `create-turbo-stack.json`:
 *
 *   {
 *     "plugins": ["cts-plugin-vite-vue"]
 *   }
 *
 * The CLI startup will dynamically import this module and register the
 * default export with the AppType registry. From that point, the
 * `vite-vue` value (already in `AppTypeSchema`) becomes scaffold-able
 * via `create-turbo-stack create` / `add app`.
 *
 * This plugin demonstrates the full contract: package.json shape,
 * tsconfig extends, template context, and inline `.eta` templates.
 */

import { defineAppType } from "@create-turbo-stack/core";
import { VITE_VUE_TEMPLATES } from "./templates";

const viteVueAppType = defineAppType({
  type: "vite-vue",
  templateCategory: "app/vite-vue",
  templates: VITE_VUE_TEMPLATES,

  buildPackageJson(preset, app, { scope, appRefs }) {
    const deps: Record<string, string> = {
      ...appRefs,
      vue: "catalog:",
    };

    const devDeps: Record<string, string> = {
      [`${scope}/typescript-config`]: "workspace:*",
      "@vitejs/plugin-vue": "catalog:",
      vite: "catalog:",
      typescript: "catalog:",
      "vue-tsc": "catalog:",
    };
    if (preset.basics.linter === "biome") devDeps["@biomejs/biome"] = "catalog:";

    return {
      name: app.name,
      version: "0.1.0",
      private: true,
      type: "module",
      scripts: {
        dev: `vite --port ${app.port}`,
        build: "vue-tsc -b && vite build",
        preview: "vite preview",
        lint: preset.basics.linter === "biome" ? "biome check" : "eslint .",
        "type-check": "vue-tsc --noEmit",
      },
      dependencies: deps,
      devDependencies: devDeps,
    };
  },

  buildTsconfig(_preset, _app, { scope }) {
    return {
      extends: `${scope}/typescript-config/base.json`,
      compilerOptions: {
        // Vue SFCs need module preservation for vue-tsc to introspect.
        moduleResolution: "bundler",
        jsx: "preserve",
        types: ["vite/client"],
      },
      include: ["src/**/*", "src/**/*.vue"],
      exclude: ["node_modules", "dist"],
    };
  },

  buildTemplateContext(_preset, app) {
    return { app };
  },
});

export default viteVueAppType;
