import { defineAppType } from "./types";

export const astroAppType = defineAppType({
  type: "astro",
  templateCategory: "app/astro",

  buildPackageJson(preset, app, { scope, appRefs }) {
    const hasReactPackages = app.consumes.some((c) =>
      preset.packages.some((p) => p.name === c && (p.type === "ui" || p.type === "react-library")),
    );

    const deps: Record<string, string> = {
      ...appRefs,
      astro: "catalog:",
    };

    const devDeps: Record<string, string> = {
      [`${scope}/typescript-config`]: "workspace:*",
      typescript: "catalog:",
    };
    if (hasReactPackages) {
      devDeps["@astrojs/react"] = "catalog:";
      deps.react = "catalog:";
      deps["react-dom"] = "catalog:";
      devDeps["@types/react"] = "catalog:";
      devDeps["@types/react-dom"] = "catalog:";
    }
    if (preset.basics.linter === "biome") devDeps["@biomejs/biome"] = "catalog:";

    return {
      name: app.name,
      version: "0.1.0",
      private: true,
      type: "module",
      scripts: {
        dev: `astro dev --port ${app.port}`,
        build: "astro build",
        preview: "astro preview",
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
      include: ["src/**/*"],
      exclude: ["node_modules", "dist"],
    };
  },

  buildTemplateContext(preset, app, { scope }) {
    const hasReactPackages = app.consumes.some((c) =>
      preset.packages.some((p) => p.name === c && (p.type === "ui" || p.type === "react-library")),
    );
    return {
      app,
      scope,
      hasReactPackages,
    };
  },
});
