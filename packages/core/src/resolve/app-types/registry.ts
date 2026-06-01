import type { App } from "@create-turbo-stack/schema";
import type { AppTypeDefinition } from "./types";

const registry = new Map<App["type"], AppTypeDefinition>();

export function registerAppType(def: AppTypeDefinition): void {
  registry.set(def.type, def);
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
