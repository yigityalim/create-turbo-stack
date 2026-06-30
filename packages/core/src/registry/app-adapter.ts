/**
 * App adapter — same shape as `package-adapter.ts` but for slot=app items.
 *
 * App packages differ from regular auto-packages in two structural ways:
 *
 *   1. They materialize under `apps/<appName>/` (or wherever
 *      `app.location` points), not `packages/<name>/`.
 *   2. Their package.json carries framework-specific scripts (e.g.
 *      `next dev --turbopack -p 3000`) plus the per-app
 *      `appRefs` workspace dependency map (`@scope/env`, `@scope/db`, …).
 *
 * Both pieces still live in `packages/core/src/resolve/app-types/<type>.ts`
 * as `buildPackageJson` + `buildTsconfig` builders, because per-framework
 * package.json shape is a RULE, not CONTENT. The adapter glues those
 * builders together with the item's source files run through the
 * substituter.
 *
 * The item's own `dependencies` declaration is merged into the package.json
 * the app-type builder emits — items can declare additional runtime deps
 * (a specific Markdown library, say) without the engine knowing about them.
 */

import type { App, FileTreeNode, PackageRegistryItem, Preset } from "@create-turbo-stack/schema";
import { UnsupportedAppTypeError } from "../resolve/app-files";
import { getAppTypeDefinition } from "../resolve/app-types";
import { toJsonFile } from "../resolve/manifest-types";
import { computeCssSourceMap } from "../wiring/css-source";
import { getLinter } from "../wiring/linters";
import { computeWorkspaceRefs } from "../wiring/workspace-refs";
import { materializeRegistryItem } from "./materialize.js";
import { parseDep } from "./parse-dep.js";

export function materializeAsApp(
  preset: Preset,
  app: App,
  base: string,
  item: PackageRegistryItem,
): FileTreeNode[] {
  const def = getAppTypeDefinition(app.type);
  if (!def) throw new UnsupportedAppTypeError(app.type, app.name);

  const scope = preset.basics.scope;
  const appRefs = computeWorkspaceRefs(preset)[app.name] ?? {};
  const cssDirectives = computeCssSourceMap(preset)[app.name] ?? [];
  const linter = getLinter(preset.basics.linter);

  // The app-type builder still owns per-framework deps + scripts. Items
  // declare additional deps in their manifest; we merge them on top as
  // catalog refs.
  const ctx = { base, scope, appRefs, cssDirectives };
  const pkgJson = def.buildPackageJson(preset, app, ctx);
  pkgJson.scripts = { ...pkgJson.scripts, lint: linter.lintScript };
  pkgJson.devDependencies = {
    ...pkgJson.devDependencies,
    ...linter.packageDevDeps,
  };
  for (const dep of item.dependencies) {
    pkgJson.dependencies = pkgJson.dependencies ?? {};
    pkgJson.dependencies[parseDep(dep).name] = "catalog:";
  }
  for (const dep of item.devDependencies) {
    pkgJson.devDependencies = pkgJson.devDependencies ?? {};
    pkgJson.devDependencies[parseDep(dep).name] = "catalog:";
  }

  const nodes: FileTreeNode[] = [
    {
      path: `${base}/package.json`,
      content: toJsonFile(pkgJson),
      isDirectory: false,
    },
    {
      path: `${base}/tsconfig.json`,
      content: toJsonFile(def.buildTsconfig(preset, app, ctx)),
      isDirectory: false,
    },
    ...linter.packageConfigFiles(base),
  ];

  // Item source files — placeholders substituted, written under `<base>/`.
  // `cssDirectives` flows in as `{{css-sources}}` so the app's single
  // `globals.css` picks up the CSS packages it consumes (paths are relative
  // to the app root, which is where the item places `globals.css`).
  const itemResult = materializeRegistryItem(item, {
    scope,
    pkgName: app.name,
    pm: preset.basics.packageManager,
    pkgRoot: base,
    cssSources: cssDirectives,
    workspaceDeps: Object.keys(appRefs),
  });
  nodes.push(...itemResult.nodes);

  // Optional per-app extras from the app-type def — `.gitignore`,
  // `next-env.d.ts`, etc. These are RULES (every Next.js app needs them
  // regardless of variant) so they stay in the app-type def.
  if (def.buildExtraFiles) {
    nodes.push(...def.buildExtraFiles(preset, app, ctx));
  }

  return nodes;
}
