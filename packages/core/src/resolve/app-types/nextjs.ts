import { defineAppType } from "./types";

/**
 * Next.js app (full-stack) and Next.js API-only variant share the same shape;
 * the only difference is the template category they pull source from.
 */
function build(templateCategory: "app/nextjs" | "app/nextjs-api-only") {
  return defineAppType({
    type: templateCategory === "app/nextjs" ? "nextjs" : "nextjs-api-only",
    templateCategory,

    buildPackageJson(preset, app, { scope, appRefs }) {
      const deps: Record<string, string> = {
        ...appRefs,
        next: "catalog:",
        react: "catalog:",
        "react-dom": "catalog:",
      };
      if (app.i18n) deps["next-intl"] = "catalog:";
      if (preset.integrations.errorTracking === "sentry") {
        deps["@sentry/nextjs"] = "catalog:";
      }
      if (preset.css.ui === "shadcn") {
        deps.clsx = "catalog:";
        deps["tailwind-merge"] = "catalog:";
      }

      const devDeps: Record<string, string> = {
        [`${scope}/typescript-config`]: "workspace:*",
        "@types/node": "catalog:",
        "@types/react": "catalog:",
        "@types/react-dom": "catalog:",
        typescript: "catalog:",
      };
      if (preset.basics.linter === "biome") devDeps["@biomejs/biome"] = "catalog:";
      if (preset.css.framework === "tailwind4") {
        devDeps.tailwindcss = "catalog:";
        devDeps["@tailwindcss/postcss"] = "catalog:";
      }

      return {
        name: app.name,
        version: "0.1.0",
        private: true,
        type: "module",
        scripts: {
          dev: `next dev --turbopack -p ${app.port}`,
          build: "next build",
          start: `next start -p ${app.port}`,
          lint: preset.basics.linter === "biome" ? "biome check" : "next lint",
          "type-check": "tsc --noEmit",
        },
        dependencies: deps,
        devDependencies: devDeps,
      };
    },

    buildTsconfig(_preset, _app, { scope }) {
      return {
        extends: `${scope}/typescript-config/nextjs.json`,
        compilerOptions: { paths: { "@/*": ["./src/*"] } },
        include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
        exclude: ["node_modules"],
      };
    },

    buildTemplateContext(preset, app, { scope, cssDirectives }) {
      return {
        app,
        scope,
        packageManager: preset.basics.packageManager,
        css: preset.css,
        packages: preset.packages,
        auth: preset.auth,
        integrations: preset.integrations,
        wiring: { cssSourceDirectives: cssDirectives },
      };
    },
  });
}

export const nextjsAppType = build("app/nextjs");
export const nextjsApiOnlyAppType = build("app/nextjs-api-only");
