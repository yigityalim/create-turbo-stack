import type { FileTreeNode, Preset } from "@create-turbo-stack/schema";
import { activeProvider, getIntegration, INTEGRATION_CATEGORIES } from "../../integrations";
import { renderSourceFiles } from "../../render/render-source";
import { fullPackageName } from "../../utils/naming";
import { type PackageJson, type TsConfig, toJsonFile } from "../manifest-types";
import { makeBasePackageFiles } from "./base";

/**
 * Built-in (non-provider) packages: a user's generic library, the env
 * validation package, and the shared typescript-config. These have no
 * integration provider behind them, so they're resolved directly here.
 */

/** A user-declared package with no special meaning (ui, utils, library, ...). */
export function resolveGenericPackage(
  preset: Preset,
  pkg: Parameters<typeof makeBasePackageFiles>[1],
  base: string,
): FileTreeNode[] {
  const nodes: FileTreeNode[] = [];
  const name = fullPackageName(preset.basics.scope, pkg.name);

  nodes.push(...makeBasePackageFiles(preset, pkg, base));

  nodes.push({
    path: `${base}/src/index.ts`,
    content: `// ${name}\nexport {};\n`,
    isDirectory: false,
  });

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

  if (pkg.producesCSS) {
    nodes.push({
      path: `${base}/src/globals.css`,
      content: `/* ${name} global styles */\n`,
      isDirectory: false,
    });
  }

  return nodes;
}

interface EnvVarDef {
  name: string;
  zodType: string;
}

/**
 * Aggregate the env vars every active provider declares, so the env
 * package's `createEnv` schema is the union of what the stack needs.
 * Sourced from the integration registry rather than a local cascade.
 */
function computeBaseEnvVars(preset: Preset): { server: EnvVarDef[]; client: EnvVarDef[] } {
  const server = new Map<string, EnvVarDef>();
  const client = new Map<string, EnvVarDef>();

  // Two providers can legitimately declare the same var (e.g. Supabase as
  // both database and auth). Dedupe by name — first declaration wins — so
  // createEnv never emits a duplicate object key.
  for (const category of INTEGRATION_CATEGORIES) {
    const provider = activeProvider(preset, category);
    if (!provider) continue;
    const integration = getIntegration(category, provider);
    const vars = integration?.envVars?.(preset);
    if (!vars) continue;
    for (const v of vars.server ?? [])
      if (!server.has(v.name)) server.set(v.name, { name: v.name, zodType: v.zodType });
    for (const v of vars.client ?? [])
      if (!client.has(v.name)) client.set(v.name, { name: v.name, zodType: v.zodType });
  }

  return { server: [...server.values()], client: [...client.values()] };
}

export function resolveEnvPackage(
  preset: Preset,
  pkg: Parameters<typeof makeBasePackageFiles>[1],
  base: string,
): FileTreeNode[] {
  const envVars = computeBaseEnvVars(preset);

  return [
    ...makeBasePackageFiles(preset, pkg, base, {
      "@t3-oss/env-nextjs": "catalog:",
      zod: "catalog:",
    }),
    // The createEnv skeleton is a real source file (env/src/index.ts.eta);
    // we only feed it the var union the active providers declared.
    ...renderSourceFiles("env", base, {
      serverVars: envVars.server,
      clientVars: envVars.client,
    }),
  ];
}

export function resolveTypescriptConfigPackage(preset: Preset, base: string): FileTreeNode[] {
  const scope = preset.basics.scope;
  const strict = preset.basics.typescript === "strict";

  const pkgJson: PackageJson = {
    name: `${scope}/typescript-config`,
    version: "0.1.0",
    private: true,
    exports: {
      "./base.json": "./base.json",
      "./react.json": "./react.json",
      "./nextjs.json": "./nextjs.json",
      "./library.json": "./library.json",
    },
  };

  const baseConfig: TsConfig = {
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
  };

  const libraryConfig: TsConfig = {
    extends: "./base.json",
    compilerOptions: { lib: ["ES2022"] },
  };

  const reactConfig: TsConfig = {
    extends: "./base.json",
    compilerOptions: { jsx: "react-jsx", lib: ["ES2022", "DOM", "DOM.Iterable"] },
  };

  const nextjsConfig: TsConfig = {
    extends: "./base.json",
    compilerOptions: {
      jsx: "preserve",
      lib: ["ES2022", "DOM", "DOM.Iterable"],
      module: "esnext",
      noEmit: true,
      incremental: true,
      plugins: [{ name: "next" }],
    },
  };

  return [
    { path: `${base}/package.json`, content: toJsonFile(pkgJson), isDirectory: false },
    { path: `${base}/base.json`, content: toJsonFile(baseConfig), isDirectory: false },
    { path: `${base}/library.json`, content: toJsonFile(libraryConfig), isDirectory: false },
    { path: `${base}/react.json`, content: toJsonFile(reactConfig), isDirectory: false },
    { path: `${base}/nextjs.json`, content: toJsonFile(nextjsConfig), isDirectory: false },
  ];
}
