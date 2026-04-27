import { defineAppType } from "./types";

export const sveltekitAppType = defineAppType({
  type: "sveltekit",
  templateCategory: "app/sveltekit",

  buildPackageJson(preset, app, { scope, appRefs }) {
    const deps: Record<string, string> = {
      ...appRefs,
      "@sveltejs/kit": "catalog:",
      svelte: "catalog:",
    };

    const devDeps: Record<string, string> = {
      [`${scope}/typescript-config`]: "workspace:*",
      "@sveltejs/adapter-auto": "catalog:",
      "@sveltejs/vite-plugin-svelte": "catalog:",
      vite: "catalog:",
      typescript: "catalog:",
    };
    if (preset.basics.linter === "biome") devDeps["@biomejs/biome"] = "catalog:";

    return {
      name: app.name,
      version: "0.1.0",
      private: true,
      type: "module",
      scripts: {
        dev: `vite dev --port ${app.port}`,
        build: "vite build",
        preview: "vite preview",
        lint: preset.basics.linter === "biome" ? "biome check" : "eslint .",
        "type-check": "tsc --noEmit",
      },
      dependencies: deps,
      devDependencies: devDeps,
    };
  },

  buildTsconfig(_preset, _app, { scope }) {
    return {
      extends: `${scope}/typescript-config/base.json`,
      compilerOptions: { outDir: "./dist", rootDir: "./src" },
      include: ["src/**/*"],
      exclude: ["node_modules", "dist"],
    };
  },

  buildTemplateContext(_preset, app, { scope }) {
    return {
      app,
      scope,
    };
  },
});
