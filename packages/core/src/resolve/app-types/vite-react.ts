import { defineAppType } from "./types";

export const viteReactAppType = defineAppType({
  type: "vite-react",
  templateCategory: "app/vite-react",

  buildPackageJson(preset, app, { scope, appRefs }) {
    const deps: Record<string, string> = {
      ...appRefs,
      react: "catalog:",
      "react-dom": "catalog:",
    };

    const devDeps: Record<string, string> = {
      [`${scope}/typescript-config`]: "workspace:*",
      "@vitejs/plugin-react": "catalog:",
      vite: "catalog:",
      typescript: "catalog:",
      "@types/react": "catalog:",
      "@types/react-dom": "catalog:",
    };
    if (preset.css.framework === "tailwind4") {
      devDeps.tailwindcss = "catalog:";
      // Vite uses the first-party Tailwind plugin, not the PostCSS one.
      devDeps["@tailwindcss/vite"] = "catalog:";
      // index.css `@import "tw-animate-css"` when shadcn is on — must be a dep.
      if (preset.css.ui === "shadcn") devDeps["tw-animate-css"] = "catalog:";
    }

    return {
      name: app.name,
      version: "0.1.0",
      private: true,
      type: "module",
      scripts: {
        dev: `vite --port ${app.port}`,
        build: "vite build",
        preview: "vite preview",
        "type-check": "tsc --noEmit",
      },
      dependencies: deps,
      devDependencies: devDeps,
    };
  },

  buildTsconfig(_preset, _app, { scope }) {
    return {
      extends: `${scope}/typescript-config/react.json`,
      compilerOptions: {
        // Vite owns the build; tsc is type-check only. vite/client adds
        // import.meta.env + asset module types.
        noEmit: true,
        types: ["vite/client"],
        paths: { "@/*": ["./src/*"] },
      },
      include: ["src/**/*"],
      exclude: ["node_modules", "dist"],
    };
  },

  buildTemplateContext(preset, app, { scope, cssDirectives }) {
    return {
      app,
      scope,
      css: preset.css,
      packages: preset.packages,
      wiring: { cssSourceDirectives: cssDirectives },
    };
  },
});
