import type { Preset } from "@create-turbo-stack/schema";

export interface TsconfigTarget {
  path: string;
  extends: string;
  compilerOptions: Record<string, unknown>;
  include: string[];
  exclude: string[];
}

export function computeTsconfigChain(_preset: Preset): TsconfigTarget[] {
  // TODO: Phase 1 implementation
  return [];
}
