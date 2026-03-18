import type { App, FileTreeNode, Preset } from "@create-turbo-stack/schema";
import { computeCssSourceMap } from "../wiring/css-source";
import { computeWorkspaceRefs } from "../wiring/workspace-refs";

/**
 * Resolve files for a single app.
 * Phase 1: only Next.js apps supported.
 */
export function resolveAppFiles(preset: Preset, app: App): FileTreeNode[] {
  switch (app.type) {
    case "nextjs":
    case "nextjs-api-only":
      return resolveNextjsApp(preset, app);
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

  // next.config.ts
  nodes.push({
    path: `${base}/next.config.ts`,
    content: `import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
`,
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

  // PostCSS config (if tailwind)
  if (preset.css.framework === "tailwind4" || preset.css.framework === "tailwind3") {
    nodes.push({
      path: `${base}/postcss.config.mjs`,
      content: `export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
`,
      isDirectory: false,
    });
  }

  // globals.css
  const cssDirectives = cssSourceMap[app.name] ?? [];
  let globalsCss = "";

  if (preset.css.framework === "tailwind4") {
    globalsCss += '@import "tailwindcss";\n';
    if (preset.css.ui === "shadcn") {
      globalsCss += '@import "tw-animate-css";\n';
    }

    // @source directives
    for (const source of cssDirectives) {
      globalsCss += `@source "${source}";\n`;
    }

    // Import UI package globals if consumed
    const consumedUi = app.consumes.find((c) => {
      const pkg = preset.packages.find((p) => p.name === c);
      return pkg?.producesCSS;
    });
    if (consumedUi) {
      globalsCss += `@import "${scope}/${consumedUi}/globals.css";\n`;
    }

    globalsCss += "\n@custom-variant dark (&:is(.dark *));\n";
  }

  nodes.push({
    path: `${base}/src/app/globals.css`,
    content: globalsCss || "/* Global styles */\n",
    isDirectory: false,
  });

  // layout.tsx
  const isApiOnly = app.type === "nextjs-api-only";

  if (!isApiOnly) {
    nodes.push({
      path: `${base}/src/app/layout.tsx`,
      content: `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "${app.name}",
  description: "${app.name} app",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`,
      isDirectory: false,
    });

    // page.tsx
    nodes.push({
      path: `${base}/src/app/page.tsx`,
      content: `export default function Home() {
  return (
    <main>
      <h1>${app.name}</h1>
    </main>
  );
}
`,
      isDirectory: false,
    });
  } else {
    // API-only: minimal layout + route handler
    nodes.push({
      path: `${base}/src/app/layout.tsx`,
      content: `export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`,
      isDirectory: false,
    });

    nodes.push({
      path: `${base}/src/app/api/health/route.ts`,
      content: `export function GET() {
  return Response.json({ status: "ok" });
}
`,
      isDirectory: false,
    });
  }

  return nodes;
}
