import type { FileTreeNode, Package, Preset } from "@create-turbo-stack/schema";
import type { PackageResolveContext } from "../../integrations/types";
import { computeExportsMap } from "../../wiring/exports-map";
import {
  type PackageExports,
  type PackageJson,
  type TsConfig,
  toJsonFile,
} from "../manifest-types";

/**
 * package.json + tsconfig.json boilerplate shared by every workspace
 * package. Providers describe only what differs (their deps and source);
 * this owns the structure, the linter wiring, the @types/node default for
 * Node-side packages, and the tsconfig base selection.
 */
export function makeBasePackageFiles(
  preset: Preset,
  pkg: Package,
  base: string,
  extraDeps: Record<string, string> = {},
  extraDevDeps: Record<string, string> = {},
  opts: { react?: boolean } = {},
): FileTreeNode[] {
  const nodes: FileTreeNode[] = [];
  const scope = preset.basics.scope;
  const exportsMap: PackageExports = computeExportsMap(pkg);

  if (pkg.producesCSS) {
    exportsMap["./globals.css"] = "./src/globals.css";
  }

  const isReact = opts.react || pkg.type === "ui" || pkg.type === "react-library";

  const pkgJson: PackageJson = {
    name: `${scope}/${pkg.name}`,
    version: "0.1.0",
    private: true,
    type: "module",
    exports: exportsMap,
    scripts: {
      lint: preset.basics.linter === "biome" ? "biome check" : "eslint .",
      "type-check": "tsc --noEmit",
    },
    dependencies: { ...extraDeps },
    devDependencies: {
      [`${scope}/typescript-config`]: "workspace:*",
      ...(preset.basics.linter === "biome" ? { "@biomejs/biome": "catalog:" } : {}),
      typescript: "catalog:",
      // Node-targeted packages reference `process` and friends; React
      // packages get DOM libs from react.json instead.
      ...(pkg.type === "ui" || pkg.type === "react-library" ? {} : { "@types/node": "catalog:" }),
      ...(opts.react ? { "@types/react": "catalog:", "@types/react-dom": "catalog:" } : {}),
      ...extraDevDeps,
    },
  };

  nodes.push({
    path: `${base}/package.json`,
    content: toJsonFile(pkgJson),
    isDirectory: false,
  });

  const tsconfigBase = isReact
    ? "react.json"
    : pkg.type === "config"
      ? "base.json"
      : "library.json";

  const tsconfig: TsConfig = {
    extends: `${scope}/typescript-config/${tsconfigBase}`,
    compilerOptions: { outDir: "./dist", rootDir: "./src" },
    include: ["src/**/*"],
    exclude: ["node_modules", "dist"],
  };

  nodes.push({
    path: `${base}/tsconfig.json`,
    content: toJsonFile(tsconfig),
    isDirectory: false,
  });

  return nodes;
}

/**
 * Build the context object passed to a provider's `resolvePackageFiles`.
 * Binds `makeBase` to the package + preset so providers call it without
 * re-threading those args.
 */
export function buildPackageContext(
  preset: Preset,
  pkg: Package,
  base: string,
): PackageResolveContext {
  return {
    pkg,
    base,
    scope: preset.basics.scope,
    makeBase: (o = {}) =>
      makeBasePackageFiles(preset, pkg, base, o.deps ?? {}, o.devDeps ?? {}, { react: o.react }),
  };
}
