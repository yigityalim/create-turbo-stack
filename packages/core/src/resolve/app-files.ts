import type { App, FileTreeNode, Preset } from "@create-turbo-stack/schema";
import { renderSourceFiles } from "../render/render-source";
import { computeCssSourceMap } from "../wiring/css-source";
import { computeWorkspaceRefs } from "../wiring/workspace-refs";

/**
 * Resolve files for a single app.
 */
export function resolveAppFiles(preset: Preset, app: App): FileTreeNode[] {
  switch (app.type) {
    case "nextjs":
    case "nextjs-api-only":
      return resolveNextjsApp(preset, app);
    case "hono-standalone":
      return resolveHonoApp(preset, app);
    case "vite-react":
      return resolveViteReactApp(preset, app);
    case "sveltekit":
      return resolveSvelteKitApp(preset, app);
    case "astro":
      return resolveAstroApp(preset, app);
    case "remix":
      return resolveRemixApp(preset, app);
    default:
      // Other app types will be implemented in later phases
      return [];
  }
}

function resolveNextjsApp(preset: Preset, app: App): FileTreeNode[] {
  const nodes: FileTreeNode[] = [];
  const base = `apps/${app.name}`;
  const scope = preset.basics.scope;
  const cssSourceMap = computeCssSourceMap(preset);
  const workspaceRefs = computeWorkspaceRefs(preset);
  const appRefs = workspaceRefs[app.name] ?? {};

  // package.json
  const deps: Record<string, string> = {
    ...Object.fromEntries(Object.entries(appRefs).map(([k, v]) => [k, v])),
    next: "catalog:",
    react: "catalog:",
    "react-dom": "catalog:",
  };
  if (app.i18n) deps["next-intl"] = "catalog:";

  const devDeps: Record<string, string> = {
    [`${scope}/typescript-config`]: "workspace:*",
    "@types/node": "catalog:",
    "@types/react": "catalog:",
    "@types/react-dom": "catalog:",
    typescript: "catalog:",
  };
  if (preset.basics.linter === "biome") {
    devDeps["@biomejs/biome"] = "catalog:";
  }
  if (preset.css.framework === "tailwind4") {
    devDeps.tailwindcss = "catalog:";
    devDeps["@tailwindcss/postcss"] = "catalog:";
  }

  const pkgJson: Record<string, unknown> = {
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

  nodes.push({
    path: `${base}/package.json`,
    content: JSON.stringify(pkgJson, null, 2),
    isDirectory: false,
  });

  // tsconfig.json
  nodes.push({
    path: `${base}/tsconfig.json`,
    content: JSON.stringify(
      {
        extends: `${scope}/typescript-config/nextjs.json`,
        compilerOptions: { paths: { "@/*": ["./src/*"] } },
        include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
        exclude: ["node_modules"],
      },
      null,
      2,
    ),
    isDirectory: false,
  });

  // Source files from templates
  const templateCategory = app.type === "nextjs-api-only" ? "app/nextjs-api-only" : "app/nextjs";
  const cssDirectives = cssSourceMap[app.name] ?? [];

  nodes.push(
    ...renderSourceFiles(templateCategory, base, {
      app,
      scope,
      css: preset.css,
      packages: preset.packages,
      wiring: { cssSourceDirectives: cssDirectives },
    }),
  );

  return nodes;
}

function resolveHonoApp(preset: Preset, app: App): FileTreeNode[] {
  const nodes: FileTreeNode[] = [];
  const base = `apps/${app.name}`;
  const scope = preset.basics.scope;
  const workspaceRefs = computeWorkspaceRefs(preset);
  const appRefs = workspaceRefs[app.name] ?? {};

  // package.json
  const deps: Record<string, string> = {
    ...Object.fromEntries(Object.entries(appRefs).map(([k, v]) => [k, v])),
    hono: "catalog:",
    "@hono/node-server": "catalog:",
  };

  const devDeps: Record<string, string> = {
    [`${scope}/typescript-config`]: "workspace:*",
    ...(preset.basics.linter === "biome" ? { "@biomejs/biome": "catalog:" } : {}),
    typescript: "catalog:",
    tsx: "catalog:",
  };

  const pkgJson: Record<string, unknown> = {
    name: app.name,
    version: "0.1.0",
    private: true,
    type: "module",
    scripts: {
      dev: `tsx watch src/index.ts`,
      build: "tsc",
      start: "node dist/index.js",
      lint: preset.basics.linter === "biome" ? "biome check" : "eslint .",
      "type-check": "tsc --noEmit",
    },
    dependencies: deps,
    devDependencies: devDeps,
  };

  nodes.push({
    path: `${base}/package.json`,
    content: JSON.stringify(pkgJson, null, 2),
    isDirectory: false,
  });

  // tsconfig.json
  nodes.push({
    path: `${base}/tsconfig.json`,
    content: JSON.stringify(
      {
        extends: `${scope}/typescript-config/library.json`,
        compilerOptions: {
          outDir: "./dist",
          rootDir: "./src",
        },
        include: ["src/**/*"],
        exclude: ["node_modules", "dist"],
      },
      null,
      2,
    ),
    isDirectory: false,
  });

  // Source files from templates
  nodes.push(
    ...renderSourceFiles("app/hono-standalone", base, {
      app,
      scope,
      api: preset.api,
    }),
  );

  return nodes;
}

function resolveViteReactApp(preset: Preset, app: App): FileTreeNode[] {
  const nodes: FileTreeNode[] = [];
  const base = `apps/${app.name}`;
  const scope = preset.basics.scope;
  const cssSourceMap = computeCssSourceMap(preset);
  const workspaceRefs = computeWorkspaceRefs(preset);
  const appRefs = workspaceRefs[app.name] ?? {};

  // package.json
  const deps: Record<string, string> = {
    ...Object.fromEntries(Object.entries(appRefs).map(([k, v]) => [k, v])),
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
  if (preset.basics.linter === "biome") {
    devDeps["@biomejs/biome"] = "catalog:";
  }
  if (preset.css.framework === "tailwind4") {
    devDeps.tailwindcss = "catalog:";
    devDeps["@tailwindcss/postcss"] = "catalog:";
  }

  const pkgJson: Record<string, unknown> = {
    name: app.name,
    version: "0.1.0",
    private: true,
    type: "module",
    scripts: {
      dev: `vite --port ${app.port}`,
      build: "vite build",
      preview: "vite preview",
      lint: preset.basics.linter === "biome" ? "biome check" : "eslint .",
      "type-check": "tsc --noEmit",
    },
    dependencies: deps,
    devDependencies: devDeps,
  };

  nodes.push({
    path: `${base}/package.json`,
    content: JSON.stringify(pkgJson, null, 2),
    isDirectory: false,
  });

  // tsconfig.json
  nodes.push({
    path: `${base}/tsconfig.json`,
    content: JSON.stringify(
      {
        extends: `${scope}/typescript-config/react.json`,
        compilerOptions: { paths: { "@/*": ["./src/*"] } },
        include: ["src/**/*"],
        exclude: ["node_modules", "dist"],
      },
      null,
      2,
    ),
    isDirectory: false,
  });

  // Source files from templates
  const cssDirectives = cssSourceMap[app.name] ?? [];

  nodes.push(
    ...renderSourceFiles("app/vite-react", base, {
      app,
      scope,
      css: preset.css,
      packages: preset.packages,
      wiring: { cssSourceDirectives: cssDirectives },
    }),
  );

  return nodes;
}

function resolveSvelteKitApp(preset: Preset, app: App): FileTreeNode[] {
  const nodes: FileTreeNode[] = [];
  const base = `apps/${app.name}`;
  const scope = preset.basics.scope;
  const workspaceRefs = computeWorkspaceRefs(preset);
  const appRefs = workspaceRefs[app.name] ?? {};

  // package.json
  const deps: Record<string, string> = {
    ...Object.fromEntries(Object.entries(appRefs).map(([k, v]) => [k, v])),
    "@sveltejs/kit": "catalog:",
    svelte: "catalog:",
  };

  const devDeps: Record<string, string> = {
    [`${scope}/typescript-config`]: "workspace:*",
    "@sveltejs/adapter-auto": "catalog:",
    "@sveltejs/vite-plugin-svelte": "catalog:",
    vite: "catalog:",
    typescript: "catalog:",
  };
  if (preset.basics.linter === "biome") {
    devDeps["@biomejs/biome"] = "catalog:";
  }

  const pkgJson: Record<string, unknown> = {
    name: app.name,
    version: "0.1.0",
    private: true,
    type: "module",
    scripts: {
      dev: `vite dev --port ${app.port}`,
      build: "vite build",
      preview: "vite preview",
      lint: preset.basics.linter === "biome" ? "biome check" : "eslint .",
      "type-check": "tsc --noEmit",
    },
    dependencies: deps,
    devDependencies: devDeps,
  };

  nodes.push({
    path: `${base}/package.json`,
    content: JSON.stringify(pkgJson, null, 2),
    isDirectory: false,
  });

  // tsconfig.json
  nodes.push({
    path: `${base}/tsconfig.json`,
    content: JSON.stringify(
      {
        extends: `${scope}/typescript-config/base.json`,
        compilerOptions: { outDir: "./dist", rootDir: "./src" },
        include: ["src/**/*"],
        exclude: ["node_modules", "dist"],
      },
      null,
      2,
    ),
    isDirectory: false,
  });

  // Source files from templates
  nodes.push(
    ...renderSourceFiles("app/sveltekit", base, {
      app,
      scope,
    }),
  );

  return nodes;
}

function resolveAstroApp(preset: Preset, app: App): FileTreeNode[] {
  const nodes: FileTreeNode[] = [];
  const base = `apps/${app.name}`;
  const scope = preset.basics.scope;
  const workspaceRefs = computeWorkspaceRefs(preset);
  const appRefs = workspaceRefs[app.name] ?? {};

  // Check if app consumes any React packages
  const hasReactPackages = app.consumes.some((c) =>
    preset.packages.some((p) => p.name === c && (p.type === "ui" || p.type === "react-library")),
  );

  // package.json
  const deps: Record<string, string> = {
    ...Object.fromEntries(Object.entries(appRefs).map(([k, v]) => [k, v])),
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
  if (preset.basics.linter === "biome") {
    devDeps["@biomejs/biome"] = "catalog:";
  }

  const pkgJson: Record<string, unknown> = {
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

  nodes.push({
    path: `${base}/package.json`,
    content: JSON.stringify(pkgJson, null, 2),
    isDirectory: false,
  });

  // tsconfig.json
  nodes.push({
    path: `${base}/tsconfig.json`,
    content: JSON.stringify(
      {
        extends: `${scope}/typescript-config/base.json`,
        include: ["src/**/*"],
        exclude: ["node_modules", "dist"],
      },
      null,
      2,
    ),
    isDirectory: false,
  });

  // Source files from templates
  nodes.push(
    ...renderSourceFiles("app/astro", base, {
      app,
      scope,
      hasReactPackages,
    }),
  );

  return nodes;
}

function resolveRemixApp(preset: Preset, app: App): FileTreeNode[] {
  const nodes: FileTreeNode[] = [];
  const base = `apps/${app.name}`;
  const scope = preset.basics.scope;
  const workspaceRefs = computeWorkspaceRefs(preset);
  const appRefs = workspaceRefs[app.name] ?? {};

  // package.json
  const deps: Record<string, string> = {
    ...Object.fromEntries(Object.entries(appRefs).map(([k, v]) => [k, v])),
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
  if (preset.basics.linter === "biome") {
    devDeps["@biomejs/biome"] = "catalog:";
  }

  const pkgJson: Record<string, unknown> = {
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

  nodes.push({
    path: `${base}/package.json`,
    content: JSON.stringify(pkgJson, null, 2),
    isDirectory: false,
  });

  // tsconfig.json
  nodes.push({
    path: `${base}/tsconfig.json`,
    content: JSON.stringify(
      {
        extends: `${scope}/typescript-config/react.json`,
        compilerOptions: { paths: { "~/*": ["./app/*"] } },
        include: ["app/**/*"],
        exclude: ["node_modules", "build"],
      },
      null,
      2,
    ),
    isDirectory: false,
  });

  // Source files from templates
  nodes.push(
    ...renderSourceFiles("app/remix", base, {
      app,
      scope,
    }),
  );

  return nodes;
}
