import type { App } from "@create-turbo-stack/schema";
import { registerTemplates } from "../../render/template-registry";
import type { AppTypeDefinition } from "./types";

const registry = new Map<App["type"], AppTypeDefinition>();

export function registerAppType(def: AppTypeDefinition): void {
  registry.set(def.type, def);
  // Plugins ship templates inline; mirror them into the runtime
  // template registry so renderSourceFiles can pick them up.
  if (def.templates && Object.keys(def.templates).length > 0) {
    registerTemplates(def.templateCategory, def.templates);
  }
}

export function getAppTypeDefinition(type: App["type"]): AppTypeDefinition | undefined {
  return registry.get(type);
}

export function listSupportedAppTypes(): readonly App["type"][] {
  return Array.from(registry.keys());
}

export function clearRegistry(): void {
  registry.clear();
}
