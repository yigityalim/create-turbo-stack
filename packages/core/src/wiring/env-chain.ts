import type { Preset } from "@create-turbo-stack/schema";

export interface EnvChain {
  base: { server: EnvVar[]; client: EnvVar[] };
  apps: Record<string, { server: EnvVar[]; client: EnvVar[] }>;
  allVars: EnvVar[];
  globalEnv: string[];
}

export interface EnvVar {
  name: string;
  zodType: string;
  example: string;
  description: string;
}

export function computeEnvChain(_preset: Preset): EnvChain {
  // TODO: Phase 2 implementation
  return { base: { server: [], client: [] }, apps: {}, allVars: [], globalEnv: [] };
}
