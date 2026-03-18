import type { App, Package, Preset } from "@create-turbo-stack/schema";
import { scopeToName } from "../utils/naming";
import { computeCatalog } from "../wiring/catalog";
import { computeCssSourceMap } from "../wiring/css-source";
import { computeEnvChain } from "../wiring/env-chain";
import { computeWorkspaceRefs } from "../wiring/workspace-refs";

export interface TemplateContext {
  // Basics
  projectName: string;
  scope: string;
  scopeName: string;
  packageManager: string;
  isStrict: boolean;
  linter: string;

  // Current target (app or package being rendered)
  app?: App;
  pkg?: Package & { fullName: string };

  // Global selections
  database: Preset["database"];
  api: Preset["api"];
  auth: Preset["auth"];
  css: Preset["css"];
  integrations: Preset["integrations"];

  // All apps and packages for cross-referencing
  apps: Preset["apps"];
  packages: Preset["packages"];

  // Computed wiring
  wiring: {
    cssSourceDirectives: string[];
    catalogDeps: Record<string, string>;
    workspaceRefs: Record<string, string>;
    envVars: { server: string[]; client: string[] };
    globalEnv: string[];
  };
}

export function buildTemplateContext(
  preset: Preset,
  target?: { type: "app" | "package"; name: string },
): TemplateContext {
  const scopeName = scopeToName(preset.basics.scope);
  const cssSourceMap = computeCssSourceMap(preset);
  const catalog = computeCatalog(preset);
  const workspaceRefs = computeWorkspaceRefs(preset);
  const envChain = computeEnvChain(preset);

  // Build catalog as Record<name, version>
  const catalogDeps: Record<string, string> = {};
  for (const entry of catalog) {
    catalogDeps[entry.name] = entry.version;
  }

  // Determine target-specific context
  let app: App | undefined;
  let pkg: (Package & { fullName: string }) | undefined;
  let targetCssDirectives: string[] = [];
  let targetWorkspaceRefs: Record<string, string> = {};
  let targetEnvVars = { server: [] as string[], client: [] as string[] };

  if (target?.type === "app") {
    app = preset.apps.find((a) => a.name === target.name);
    targetCssDirectives = cssSourceMap[target.name] ?? [];
    targetWorkspaceRefs = workspaceRefs[target.name] ?? {};
    const appEnv = envChain.apps[target.name];
    targetEnvVars = {
      server: [
        ...envChain.base.server.map((v) => v.name),
        ...(appEnv?.server.map((v) => v.name) ?? []),
      ],
      client: [
        ...envChain.base.client.map((v) => v.name),
        ...(appEnv?.client.map((v) => v.name) ?? []),
      ],
    };
  } else if (target?.type === "package") {
    const found = preset.packages.find((p) => p.name === target.name);
    if (found) {
      pkg = { ...found, fullName: `${preset.basics.scope}/${found.name}` };
    }
    targetWorkspaceRefs = workspaceRefs[target.name] ?? {};
  }

  return {
    projectName: preset.basics.projectName,
    scope: preset.basics.scope,
    scopeName,
    packageManager: preset.basics.packageManager,
    isStrict: preset.basics.typescript === "strict",
    linter: preset.basics.linter,
    app,
    pkg,
    database: preset.database,
    api: preset.api,
    auth: preset.auth,
    css: preset.css,
    integrations: preset.integrations,
    apps: preset.apps,
    packages: preset.packages,
    wiring: {
      cssSourceDirectives: targetCssDirectives,
      catalogDeps,
      workspaceRefs: targetWorkspaceRefs,
      envVars: targetEnvVars,
      globalEnv: envChain.globalEnv,
    },
  };
}
