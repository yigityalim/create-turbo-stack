import { defineAppType } from "./types";

/**
 * Next.js app (full-stack) and Next.js API-only variant share the same
 * package.json + tsconfig shape; the variant only changes which registry
 * item (`apps/nextjs` vs `apps/nextjs-api-only`) supplies the source files.
 */
function build(type: "nextjs" | "nextjs-api-only") {
  return defineAppType({
    type,

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
      if (preset.css.framework === "tailwind4") {
        devDeps.tailwindcss = "catalog:";
        devDeps["@tailwindcss/postcss"] = "catalog:";
      }
      // globals.css does `@import "tw-animate-css"` when shadcn is on, so
      // the package must be a dependency of the app, not just in the catalog.
      if (preset.css.ui === "shadcn" && preset.css.framework === "tailwind4") {
        devDeps["tw-animate-css"] = "catalog:";
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
  });
}

export const nextjsAppType = build("nextjs");
export const nextjsApiOnlyAppType = build("nextjs-api-only");
