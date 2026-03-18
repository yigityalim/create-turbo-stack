import type { Preset } from "@create-turbo-stack/schema";

export interface TemplateContext {
  projectName: string;
  scope: string;
  scopeName: string;
  packageManager: string;
  isStrict: boolean;
  app?: Record<string, unknown>;
  pkg?: Record<string, unknown>;
  database: Record<string, unknown>;
  api: Record<string, unknown>;
  auth: Record<string, unknown>;
  css: Record<string, unknown>;
  integrations: Record<string, unknown>;
  wiring: {
    cssSourceDirectives: string[];
    catalogDeps: Record<string, string>;
    devCatalogDeps: Record<string, string>;
    workspaceRefs: Record<string, string>;
    envVars: { server: string[]; client: string[] };
    turboTasks: Record<string, unknown>;
  };
}

export function buildTemplateContext(
  _preset: Preset,
  _target?: { type: "app" | "package"; name: string },
): TemplateContext {
  // TODO: Phase 1 implementation
  throw new Error("Not implemented");
}
