import type { FileTreeNode, Package, Preset } from "@create-turbo-stack/schema";
import { fullPackageName } from "../utils/naming";
import { computeExportsMap } from "../wiring/exports-map";

/**
 * Resolve files for a single package (user-specified or auto-generated).
 */
export function resolvePackageFiles(preset: Preset, pkg: Package): FileTreeNode[] {
  const nodes: FileTreeNode[] = [];
  const scope = preset.basics.scope;
  const name = fullPackageName(scope, pkg.name);
  const base = `packages/${pkg.name}`;

  // Special case: typescript-config
  if (pkg.name === "typescript-config") {
    return resolveTypescriptConfigPackage(preset, base);
  }

  // package.json
  const exportsMap = computeExportsMap(pkg);
  const pkgJson: Record<string, unknown> = {
    name,
    version: "0.1.0",
    private: true,
    type: "module",
    exports: exportsMap,
    scripts: {
      lint: preset.basics.linter === "biome" ? "biome check" : "eslint .",
      "type-check": "tsc --noEmit",
    },
    dependencies: {},
    devDependencies: {
      [`${scope}/typescript-config`]: "workspace:*",
      ...(preset.basics.linter === "biome" ? { "@biomejs/biome": "catalog:" } : {}),
      typescript: "catalog:",
    },
  };

  nodes.push({
    path: `${base}/package.json`,
    content: JSON.stringify(pkgJson, null, 2),
    isDirectory: false,
  });

  // tsconfig.json
  const tsconfigBase =
    pkg.type === "ui" || pkg.type === "react-library"
      ? "react.json"
      : pkg.type === "config"
        ? "base.json"
        : "library.json";

  nodes.push({
    path: `${base}/tsconfig.json`,
    content: JSON.stringify(
      {
        extends: `${scope}/typescript-config/${tsconfigBase}`,
        compilerOptions: { outDir: "./dist", rootDir: "./src" },
        include: ["src/**/*"],
        exclude: ["node_modules", "dist"],
      },
      null,
      2,
    ),
    isDirectory: false,
  });

  // src/index.ts
  nodes.push({
    path: `${base}/src/index.ts`,
    content: `// ${name}\nexport {};\n`,
    isDirectory: false,
  });

  // Extra exports
  for (const exp of pkg.exports) {
    if (exp !== ".") {
      const fileName = exp.replace(/^\.\//, "");
      nodes.push({
        path: `${base}/src/${fileName}.ts`,
        content: `// ${name}/${fileName}\nexport {};\n`,
        isDirectory: false,
      });
    }
  }

  // CSS-producing packages get globals.css
  if (pkg.producesCSS) {
    nodes.push({
      path: `${base}/src/globals.css`,
      content: `/* ${name} global styles */\n`,
      isDirectory: false,
    });
  }

  return nodes;
}

function resolveTypescriptConfigPackage(preset: Preset, base: string): FileTreeNode[] {
  const nodes: FileTreeNode[] = [];
  const scope = preset.basics.scope;
  const strict = preset.basics.typescript === "strict";

  // package.json
  nodes.push({
    path: `${base}/package.json`,
    content: JSON.stringify(
      {
        name: `${scope}/typescript-config`,
        version: "0.1.0",
        private: true,
        exports: {
          "./base.json": "./base.json",
          "./react.json": "./react.json",
          "./nextjs.json": "./nextjs.json",
          "./library.json": "./library.json",
        },
      },
      null,
      2,
    ),
    isDirectory: false,
  });

  // base.json
  nodes.push({
    path: `${base}/base.json`,
    content: JSON.stringify(
      {
        $schema: "https://json.schemastore.org/tsconfig",
        compilerOptions: {
          target: "ES2022",
          module: "ES2022",
          moduleResolution: "bundler",
          declaration: true,
          declarationMap: true,
          sourceMap: true,
          strict,
          esModuleInterop: true,
          skipLibCheck: true,
          isolatedModules: true,
          resolveJsonModule: true,
        },
      },
      null,
      2,
    ),
    isDirectory: false,
  });

  // library.json
  nodes.push({
    path: `${base}/library.json`,
    content: JSON.stringify(
      { extends: "./base.json", compilerOptions: { lib: ["ES2022"] } },
      null,
      2,
    ),
    isDirectory: false,
  });

  // react.json
  nodes.push({
    path: `${base}/react.json`,
    content: JSON.stringify(
      {
        extends: "./base.json",
        compilerOptions: { jsx: "react-jsx", lib: ["ES2022", "DOM", "DOM.Iterable"] },
      },
      null,
      2,
    ),
    isDirectory: false,
  });

  // nextjs.json
  nodes.push({
    path: `${base}/nextjs.json`,
    content: JSON.stringify(
      {
        extends: "./base.json",
        compilerOptions: {
          jsx: "preserve",
          lib: ["ES2022", "DOM", "DOM.Iterable"],
          module: "esnext",
          noEmit: true,
          incremental: true,
          plugins: [{ name: "next" }],
        },
      },
      null,
      2,
    ),
    isDirectory: false,
  });

  return nodes;
}
