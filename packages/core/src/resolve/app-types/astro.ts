import { defineAppType } from "./types";

export const astroAppType = defineAppType({
  type: "astro",

  buildPackageJson(preset, app, { appRefs }) {
    const hasReactPackages = app.consumes.some((c) =>
      preset.packages.some((p) => p.name === c && (p.type === "ui" || p.type === "react-library")),
    );

    const deps: Record<string, string> = {
      ...appRefs,
      astro: "catalog:",
    };

    // Astro brings its own tsconfig presets, so it doesn't extend the
    // shared typescript-config package. `astro check` does the real
    // type-checking (tsc can't read `.astro`).
    const devDeps: Record<string, string> = {
      typescript: "catalog:",
      "@astrojs/check": "catalog:",
    };
    if (hasReactPackages) {
      devDeps["@astrojs/react"] = "catalog:";
      deps.react = "catalog:";
      deps["react-dom"] = "catalog:";
      devDeps["@types/react"] = "catalog:";
      devDeps["@types/react-dom"] = "catalog:";
    }
    return {
      name: app.name,
      version: "0.1.0",
      private: true,
      type: "module",
      scripts: {
        dev: `astro dev --port ${app.port}`,
        build: "astro build",
        preview: "astro preview",
        "type-check": "astro check",
      },
      dependencies: deps,
      devDependencies: devDeps,
    };
  },

  buildTsconfig() {
    // Astro ships its own strict preset (knows `.astro` files, Astro
    // globals, content collections). tsc only sees the `.ts` files; `.astro`
    // type-checking is `astro check` (opt-in).
    return {
      extends: "astro/tsconfigs/strict",
      include: [".astro/types.d.ts", "**/*"],
      exclude: ["dist"],
    };
  },
});
