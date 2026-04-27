import type { App, FileTreeNode, Preset } from "@create-turbo-stack/schema";

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

  /** Template directory key passed to renderSourceFiles. */
  templateCategory: string;

  /**
   * Optional inline templates for this app type. Keys are paths
   * relative to the rendered app's base directory (e.g.
   * `"src/main.ts.eta"`); values are raw Eta source. Plugins use this
   * to ship templates alongside the framework definition without
   * forking the templates package.
   *
   * Built-in app types leave this empty — their templates live in
   * `packages/templates/src/app/<framework>/` and are loaded from the
   * baked map.
   */
  templates?: Record<string, string>;

  /** Build the app's package.json. */
  buildPackageJson(preset: Preset, app: App, ctx: AppResolveContext): Record<string, unknown>;

  /** Build the app's tsconfig.json. */
  buildTsconfig(preset: Preset, app: App, ctx: AppResolveContext): Record<string, unknown>;

  /** Variables available to .eta templates as `it.*`. */
  buildTemplateContext(preset: Preset, app: App, ctx: AppResolveContext): Record<string, unknown>;

  /**
   * Optional: extra files beyond package.json + tsconfig.json + rendered templates.
   * Use sparingly; prefer adding .eta templates to `templateCategory`.
   */
  buildExtraFiles?(preset: Preset, app: App, ctx: AppResolveContext): FileTreeNode[];
}

/** Helper for ergonomic registration. */
export function defineAppType(def: AppTypeDefinition): AppTypeDefinition {
  return def;
}
