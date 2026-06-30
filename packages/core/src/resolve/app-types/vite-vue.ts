import { defineAppType } from "./types";

export const viteVueAppType = defineAppType({
  type: "vite-vue",

  buildPackageJson(preset, app, { appRefs }) {
    const deps: Record<string, string> = {
      ...appRefs,
      vue: "catalog:",
    };

    // Vue ships its own tsconfig presets (@vue/tsconfig) and type-checks `.vue`
    // via vue-tsc, so it doesn't extend the shared typescript-config package.
    const devDeps: Record<string, string> = {
      "@vitejs/plugin-vue": "catalog:",
      "@vue/tsconfig": "catalog:",
      "vue-tsc": "catalog:",
      vite: "catalog:",
      typescript: "catalog:",
      "@types/node": "catalog:",
    };
    if (preset.css.framework === "tailwind4") {
      devDeps.tailwindcss = "catalog:";
      devDeps["@tailwindcss/vite"] = "catalog:";
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
        // vue-tsc understands `.vue`; plain tsc cannot.
        "type-check": "vue-tsc --noEmit",
      },
      dependencies: deps,
      devDependencies: devDeps,
    };
  },

  buildTsconfig() {
    return {
      extends: "@vue/tsconfig/tsconfig.dom.json",
      compilerOptions: {
        // Vite owns the build; vue-tsc is type-check only. vite/client adds
        // import.meta.env + asset module types.
        noEmit: true,
        types: ["vite/client"],
      },
      include: ["src/**/*.ts", "src/**/*.vue"],
      exclude: ["node_modules", "dist"],
    };
  },
});
