import type { PackageRegistryItem, Preset } from "@create-turbo-stack/schema";

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

/**
 * Compute the union of env vars the project needs. Two sources:
 *
 *   1. **Items** — each selected registry item declares the env vars it
 *      reads at runtime via `item.envVars: { name → example }`. The engine
 *      defaults the zod type to `z.string()` for every var (the right
 *      validation for the vast majority of API keys / URLs); items can
 *      override by emitting their own env helper later.
 *
 *   2. **Apps** — the engine knows app-type-specific vars (Next.js wants a
 *      `NEXT_PUBLIC_APP_URL` per app). These come from the preset, not
 *      items, because they're per-app rules, not per-provider content.
 *
 * Items declaring the same var de-dupe on first occurrence — supabase
 * declaring `SUPABASE_URL` from both `slot: db` and `slot: auth` is
 * legitimate and produces a single entry.
 */
export function computeEnvChain(
  preset: Preset,
  items: ReadonlyArray<PackageRegistryItem> = [],
): EnvChain {
  const base: EnvChain["base"] = { server: [], client: [] };

  const seen = new Set<string>();
  for (const item of items) {
    for (const [name, example] of Object.entries(item.envVars)) {
      if (seen.has(name)) continue;
      seen.add(name);
      const target = name.startsWith("NEXT_PUBLIC_") ? base.client : base.server;
      target.push({
        name,
        // Most env vars are opaque strings; URLs and ints aren't worth the
        // complexity of inferring here. Item authors who want stricter
        // validation can override in `src/index.ts` of the env package.
        zodType: "z.string()",
        example,
        description: "",
      });
    }
  }

  const apps: EnvChain["apps"] = {};
  for (const app of preset.apps) {
    apps[app.name] = { server: [], client: [] };

    if (app.type === "nextjs" || app.type === "nextjs-api-only") {
      apps[app.name].client.push({
        name: "NEXT_PUBLIC_APP_URL",
        zodType: "z.string().url()",
        example: `http://localhost:${app.port}`,
        description: `${app.name} app URL`,
      });
    }
  }

  const allVars = [
    ...base.server,
    ...base.client,
    ...Object.values(apps).flatMap((a) => [...a.server, ...a.client]),
  ];

  const globalEnv = allVars.map((v) => v.name);

  return { base, apps, allVars, globalEnv };
}
