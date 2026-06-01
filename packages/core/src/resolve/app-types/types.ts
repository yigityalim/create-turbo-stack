import type { App, FileTreeNode, Preset } from "@create-turbo-stack/schema";
import type { PackageJson, TsConfig } from "../manifest-types";

/**
 * Shared context passed to every AppTypeDefinition hook.
 * Pre-computed once per app to avoid redundant work in plugin code.
 */
export interface AppResolveContext {
  base: string;
  scope: string;
  appRefs: Record<string, string>;
  cssDirectives: string[];
}

/**
 * Plugin contract for adding a new app framework.
 *
 * Each framework lives in its own file under `app-types/` and exports a
 * `defineAppType()` value. Adding a new framework (Nuxt, Solid, Qwik, ...)
 * means writing one file — no edits to switch-cases, no edits to
 * `app-files.ts`. Schema enum validation, resolver dispatch, and
 * `SUPPORTED_APP_TYPES` are all driven from the registry.
 */
export interface AppTypeDefinition {
  /** Schema discriminant (must exist in AppTypeSchema). */
  type: App["type"];

  /** Build the app's package.json. */
  buildPackageJson(preset: Preset, app: App, ctx: AppResolveContext): PackageJson;

  /** Build the app's tsconfig.json. */
  buildTsconfig(preset: Preset, app: App, ctx: AppResolveContext): TsConfig;

  /**
   * Optional: extra files beyond package.json + tsconfig.json + the
   * registry item's source files. Use sparingly — prefer shipping app
   * source via a registry item under `registry/apps/<framework>/` so the
   * content stays declarative.
   */
  buildExtraFiles?(preset: Preset, app: App, ctx: AppResolveContext): FileTreeNode[];
}

/** Helper for ergonomic registration. */
export function defineAppType(def: AppTypeDefinition): AppTypeDefinition {
  return def;
}
