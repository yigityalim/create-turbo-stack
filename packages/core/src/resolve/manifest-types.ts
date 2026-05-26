/**
 * Typed shapes for the JSON manifests this engine emits — package.json and
 * tsconfig.json. These are deliberately precise: every field we set has a
 * name and a type, so a typo in a key or a wrong-typed value is a compile
 * error, not a silently-broken generated project.
 *
 * Note on `Record<string, T>`: it appears here only for fields that are
 * *genuinely* open maps (dependency name -> version, script name -> command,
 * export subpath -> target). That is the field's real shape, not a stand-in
 * for an object whose keys we know. Known-shape objects get interfaces.
 */

/** A single conditional-exports entry: either a bare target or a conditions map. */
export type PackageExportTarget = string | { types: string; default: string };

/** package.json `exports` field: subpath -> target. */
export type PackageExports = Record<string, PackageExportTarget>;

/**
 * Bun reads its catalog from `workspaces.catalog`; npm/yarn use a plain
 * globs array. Both shapes are valid here.
 */
export type WorkspacesField = string[] | { packages: string[]; catalog?: Record<string, string> };

/** package.json — the fields this engine writes. */
export interface PackageJson {
  name: string;
  version?: string;
  private?: boolean;
  type?: "module" | "commonjs";
  exports?: PackageExports;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  packageManager?: string;
  workspaces?: WorkspacesField;
}

/** A TypeScript language-service plugin entry (e.g. `{ name: "next" }`). */
export interface TsPlugin {
  name: string;
}

/** tsconfig.json `compilerOptions` — the keys this engine sets. */
export interface TsCompilerOptions {
  target?: string;
  module?: string;
  moduleResolution?: string;
  lib?: string[];
  types?: string[];
  jsx?: string;
  declaration?: boolean;
  declarationMap?: boolean;
  sourceMap?: boolean;
  strict?: boolean;
  allowJs?: boolean;
  checkJs?: boolean;
  forceConsistentCasingInFileNames?: boolean;
  esModuleInterop?: boolean;
  skipLibCheck?: boolean;
  isolatedModules?: boolean;
  resolveJsonModule?: boolean;
  noEmit?: boolean;
  incremental?: boolean;
  outDir?: string;
  rootDir?: string;
  baseUrl?: string;
  /** Path-alias map, e.g. { "@/*": ["./src/*"] }. */
  paths?: Record<string, string[]>;
  plugins?: TsPlugin[];
}

/** tsconfig.json — base config, package config, and the shared presets. */
export interface TsConfig {
  $schema?: string;
  extends?: string;
  compilerOptions?: TsCompilerOptions;
  include?: string[];
  exclude?: string[];
  references?: { path: string }[];
}

/** Serialize a manifest to the 2-space JSON we write to disk. */
export function toJsonFile(value: PackageJson | TsConfig): string {
  return JSON.stringify(value, null, 2);
}
