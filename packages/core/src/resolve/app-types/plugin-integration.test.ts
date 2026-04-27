import type { Preset } from "@create-turbo-stack/schema";
import { ValidatedPresetSchema } from "@create-turbo-stack/schema";
import { describe, expect, it } from "vitest";
import { resolveFileTree } from "../file-tree";
import { getAppTypeDefinition, registerAppType } from "./registry";
import { defineAppType } from "./types";

/**
 * Plugin contract integration test.
 *
 * Mirrors what `cts-plugin-vite-vue` (in `examples/`) does in real life:
 * declare an `AppTypeDefinition` with inline templates, register it via
 * `registerAppType`, then assert the registry, the runtime template
 * registry, and `resolveFileTree` all see it. This is the smallest
 * proof that the plugin pattern works end-to-end without forking.
 */
describe("AppType plugin integration", () => {
  // Define a tiny plugin in-test. Same shape a real npm-published
  // plugin would export from its default.
  const fakePlugin = defineAppType({
    type: "vite-vue",
    templateCategory: "app/test-plugin-vite-vue",
    templates: {
      "src/main.ts.eta": `// <%= it.app.name %> entry\nexport const NAME = "<%= it.app.name %>";\n`,
      "src/App.vue.eta": `<template><h1><%= it.app.name %></h1></template>\n`,
    },
    buildPackageJson(_preset, app, { scope, appRefs }) {
      return {
        name: app.name,
        version: "0.1.0",
        private: true,
        type: "module",
        scripts: {
          dev: `vite --port ${app.port}`,
          build: "vite build",
          "type-check": "tsc --noEmit",
        },
        dependencies: { ...appRefs, vue: "catalog:" },
        devDependencies: {
          [`${scope}/typescript-config`]: "workspace:*",
          vite: "catalog:",
          "@vitejs/plugin-vue": "catalog:",
          typescript: "catalog:",
        },
      };
    },
    buildTsconfig(_preset, _app, { scope }) {
      return {
        extends: `${scope}/typescript-config/base.json`,
        include: ["src/**/*"],
      };
    },
    buildTemplateContext(_preset, app) {
      return { app };
    },
  });

  registerAppType(fakePlugin);

  it("becomes resolvable by the AppType registry", () => {
    expect(getAppTypeDefinition("vite-vue")).toBe(fakePlugin);
  });

  it("renders package.json + templates for an app of the registered type", () => {
    const preset: Preset = {
      schemaVersion: "1.0",
      name: "demo",
      version: "1.0.0",
      basics: {
        projectName: "demo",
        packageManager: "bun",
        scope: "@demo",
        typescript: "strict",
        linter: "biome",
        gitInit: false,
      },
      database: { strategy: "none" },
      api: { strategy: "none" },
      auth: { provider: "none", rbac: false, entitlements: false },
      css: { framework: "tailwind4", ui: "none", styling: "css-variables" },
      integrations: {
        analytics: "none",
        errorTracking: "none",
        email: "none",
        rateLimit: "none",
        ai: "none",
        envValidation: false,
      },
      apps: [
        {
          name: "vue-app",
          type: "vite-vue",
          port: 5173,
          i18n: false,
          cms: "none",
          consumes: [],
        },
      ],
      packages: [],
    };

    const validated = ValidatedPresetSchema.safeParse(preset);
    expect(validated.success).toBe(true);

    const tree = resolveFileTree(preset);
    const paths = tree.nodes.filter((n) => !n.isDirectory).map((n) => n.path);

    expect(paths).toContain("apps/vue-app/package.json");
    expect(paths).toContain("apps/vue-app/tsconfig.json");
    expect(paths).toContain("apps/vue-app/src/main.ts");
    expect(paths).toContain("apps/vue-app/src/App.vue");

    const main = tree.nodes.find((n) => n.path === "apps/vue-app/src/main.ts");
    expect(main?.content).toContain("// vue-app entry");
    expect(main?.content).toContain('export const NAME = "vue-app"');

    const pkgNode = tree.nodes.find((n) => n.path === "apps/vue-app/package.json");
    const pkg = JSON.parse(pkgNode?.content ?? "{}") as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    expect(pkg.dependencies.vue).toBe("catalog:");
    expect(pkg.devDependencies.vite).toBe("catalog:");
  });
});
