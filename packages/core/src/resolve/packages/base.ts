import type { FileTreeNode, Package, Preset } from "@create-turbo-stack/schema";
import { computeExportsMap } from "../../wiring/exports-map";
import { getLinter } from "../../wiring/linters";
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
  const linter = getLinter(preset.basics.linter);

  // The typescript-config package ships JSON files only — it IS the tsconfig
  // base, so it can't extend itself and has no TypeScript source to check.
  const isTsConfigPkg = pkg.name === "typescript-config";

  const pkgJson: PackageJson = {
    name: `${scope}/${pkg.name}`,
    version: "0.1.0",
    private: true,
    type: "module",
    exports: exportsMap,
    scripts: {
      ...(isTsConfigPkg ? {} : { lint: linter.lintScript }),
      ...(isTsConfigPkg ? {} : { "type-check": "tsc --noEmit" }),
    },
    dependencies: { ...extraDeps },
    devDependencies: {
      ...(isTsConfigPkg ? {} : { [`${scope}/typescript-config`]: "workspace:*" }),
      ...(isTsConfigPkg ? {} : linter.packageDevDeps),
      ...(isTsConfigPkg ? {} : { typescript: "catalog:" }),
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

  if (!isTsConfigPkg) {
    nodes.push(...linter.packageConfigFiles(base));
  }

  if (!isTsConfigPkg) {
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
  }

  return nodes;
}
