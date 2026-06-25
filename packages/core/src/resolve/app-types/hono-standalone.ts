import { defineAppType } from "./types";

export const honoStandaloneAppType = defineAppType({
  type: "hono-standalone",

  buildPackageJson(_preset, app, { scope, appRefs }) {
    const deps: Record<string, string> = {
      ...appRefs,
      hono: "catalog:",
      "@hono/node-server": "catalog:",
    };

    const devDeps: Record<string, string> = {
      [`${scope}/typescript-config`]: "workspace:*",
      typescript: "catalog:",
      tsx: "catalog:",
      "@types/node": "catalog:",
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
        // The base config is no-emit (internal packages export source). A
        // standalone server is the exception: `build` runs `tsc` to `dist/`
        // and `start` runs `node dist/index.js`, so it must emit.
        noEmit: false,
        outDir: "./dist",
        rootDir: "./src",
      },
      include: ["src/**/*"],
      exclude: ["node_modules", "dist"],
    };
  },
});
