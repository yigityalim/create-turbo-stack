import type { Preset } from "@create-turbo-stack/schema";

export interface CatalogEntry {
  name: string;
  version: string;
}

export function computeCatalog(_preset: Preset): CatalogEntry[] {
  // TODO: Phase 2 implementation
  return [];
}
