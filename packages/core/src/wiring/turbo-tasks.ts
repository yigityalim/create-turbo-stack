import type { Preset } from "@create-turbo-stack/schema";

export interface TurboConfig {
  $schema: string;
  ui: string;
  tasks: Record<string, unknown>;
  globalDependencies: string[];
  globalEnv: string[];
}

export function computeTurboConfig(
  _preset: Preset,
  _globalEnv: string[] = [],
): TurboConfig {
  // TODO: Phase 1 implementation
  return {
    $schema: "https://turborepo.dev/schema.json",
    ui: "tui",
    tasks: {},
    globalDependencies: [],
    globalEnv: [],
  };
}
