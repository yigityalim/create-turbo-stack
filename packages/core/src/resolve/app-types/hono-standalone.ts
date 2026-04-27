import { defineAppType } from "./types";

export const honoStandaloneAppType = defineAppType({
  type: "hono-standalone",
  templateCategory: "app/hono-standalone",

  buildPackageJson(preset, app, { scope, appRefs }) {
    const deps: Record<string, string> = {
      ...appRefs,
      hono: "catalog:",
      "@hono/node-server": "catalog:",
    };

    const devDeps: Record<string, string> = {
      [`${scope}/typescript-config`]: "workspace:*",
      ...(preset.basics.linter === "biome" ? { "@biomejs/biome": "catalog:" } : {}),
      typescript: "catalog:",
      tsx: "catalog:",
    };

    return {
      name: app.name,
      version: "0.1.0",
      private: true,
      type: "module",
      scripts: {
        dev: "tsx watch src/index.ts",
        build: "tsc",
        start: "node dist/index.js",
        lint: preset.basics.linter === "biome" ? "biome check" : "eslint .",
        "type-check": "tsc --noEmit",
      },
      dependencies: deps,
      devDependencies: devDeps,
    };
  },

  buildTsconfig(_preset, _app, { scope }) {
    return {
      extends: `${scope}/typescript-config/library.json`,
      compilerOptions: {
        outDir: "./dist",
        rootDir: "./src",
      },
      include: ["src/**/*"],
      exclude: ["node_modules", "dist"],
    };
  },

  buildTemplateContext(preset, app, { scope }) {
    return {
      app,
      scope,
      api: preset.api,
    };
  },
});
