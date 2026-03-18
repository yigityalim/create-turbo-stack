import type { Preset } from "@create-turbo-stack/schema";

export interface CssSourceMap {
  [appName: string]: string[];
}

export function computeCssSourceMap(_preset: Preset): CssSourceMap {
  // TODO: Phase 1 implementation
  return {};
}
