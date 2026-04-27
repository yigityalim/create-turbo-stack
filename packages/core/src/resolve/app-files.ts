import type { App, FileTreeNode, Preset } from "@create-turbo-stack/schema";
import { renderSourceFiles } from "../render/render-source";
import { computeCssSourceMap } from "../wiring/css-source";
import { computeWorkspaceRefs } from "../wiring/workspace-refs";
import { getAppTypeDefinition, listSupportedAppTypes } from "./app-types";

/**
 * App types that have a registered scaffold implementation.
 * Driven from the registry — adding `app-types/nuxt.ts` automatically
 * makes `nuxt` show up here.
 *
 * The schema accepts a wider set (see AppTypeSchema). Anything in the
 * schema but missing from the registry will throw UnsupportedAppTypeError
 * at scaffold time.
 */
export const SUPPORTED_APP_TYPES: readonly App["type"][] = listSupportedAppTypes();
export type SupportedAppType = (typeof SUPPORTED_APP_TYPES)[number];

export class UnsupportedAppTypeError extends Error {
  constructor(
    public readonly appType: string,
    public readonly appName: string,
  ) {
    super(
      `App type "${appType}" is declared in the schema but has no scaffold implementation yet (app: "${appName}"). ` +
        `Supported types: ${SUPPORTED_APP_TYPES.join(", ")}.`,
    );
    this.name = "UnsupportedAppTypeError";
  }
}

/**
 * Resolve the FileTreeNode[] for a single app by dispatching to the
 * registered AppTypeDefinition. Common boilerplate (workspace refs,
 * css source map, package.json + tsconfig writes) lives here so plugin
 * code stays minimal.
 */
export function resolveAppFiles(preset: Preset, app: App): FileTreeNode[] {
  const def = getAppTypeDefinition(app.type);
  if (!def) throw new UnsupportedAppTypeError(app.type, app.name);

  const base = `apps/${app.name}`;
  const scope = preset.basics.scope;
  const workspaceRefs = computeWorkspaceRefs(preset);
  const appRefs = workspaceRefs[app.name] ?? {};
  const cssSourceMap = computeCssSourceMap(preset);
  const cssDirectives = cssSourceMap[app.name] ?? [];

  const ctx = { base, scope, appRefs, cssDirectives };
  const nodes: FileTreeNode[] = [];

  nodes.push({
    path: `${base}/package.json`,
    content: JSON.stringify(def.buildPackageJson(preset, app, ctx), null, 2),
    isDirectory: false,
  });

  nodes.push({
    path: `${base}/tsconfig.json`,
    content: JSON.stringify(def.buildTsconfig(preset, app, ctx), null, 2),
    isDirectory: false,
  });

  // Templated source files
  nodes.push(
    ...renderSourceFiles(def.templateCategory, base, def.buildTemplateContext(preset, app, ctx)),
  );

  // Optional extras
  if (def.buildExtraFiles) {
    nodes.push(...def.buildExtraFiles(preset, app, ctx));
  }

  return nodes;
}
