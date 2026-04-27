import { defineAppType } from "./types";

export const remixAppType = defineAppType({
  type: "remix",
  templateCategory: "app/remix",

  buildPackageJson(preset, app, { scope, appRefs }) {
    const deps: Record<string, string> = {
      ...appRefs,
      "@remix-run/node": "catalog:",
      "@remix-run/react": "catalog:",
      "@remix-run/serve": "catalog:",
      react: "catalog:",
      "react-dom": "catalog:",
      isbot: "catalog:",
    };

    const devDeps: Record<string, string> = {
      [`${scope}/typescript-config`]: "workspace:*",
      "@remix-run/dev": "catalog:",
      vite: "catalog:",
      typescript: "catalog:",
      "@types/react": "catalog:",
      "@types/react-dom": "catalog:",
    };
    if (preset.basics.linter === "biome") devDeps["@biomejs/biome"] = "catalog:";

    return {
      name: app.name,
      version: "0.1.0",
      private: true,
      type: "module",
      scripts: {
        dev: `remix vite:dev --port ${app.port}`,
        build: "remix vite:build",
        start: "remix-serve ./build/server/index.js",
        lint: preset.basics.linter === "biome" ? "biome check" : "eslint .",
        "type-check": "tsc --noEmit",
      },
      dependencies: deps,
      devDependencies: devDeps,
    };
  },

  buildTsconfig(_preset, _app, { scope }) {
    return {
      extends: `${scope}/typescript-config/react.json`,
      compilerOptions: { paths: { "~/*": ["./app/*"] } },
      include: ["app/**/*"],
      exclude: ["node_modules", "build"],
    };
  },

  buildTemplateContext(_preset, app, { scope }) {
    return {
      app,
      scope,
    };
  },
});
