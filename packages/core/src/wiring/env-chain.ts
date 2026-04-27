import type { Preset } from "@create-turbo-stack/schema";
import { getIntegration, type IntegrationCategory } from "../integrations";

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
 * Map a Preset to the (category, provider) pair that determines which
 * integration's env vars apply. Returns null when the slot is set to
 * "none" / disabled.
 */
function resolveSelection(
  preset: Preset,
  category: IntegrationCategory,
): { provider: string } | null {
  switch (category) {
    case "auth":
      return preset.auth.provider === "none" ? null : { provider: preset.auth.provider };
    case "database":
      return preset.database.strategy === "none" ? null : { provider: preset.database.strategy };
    case "api":
      return preset.api.strategy === "none" ? null : { provider: preset.api.strategy };
    case "analytics":
    case "errorTracking":
    case "email":
    case "rateLimit":
    case "ai": {
      const value = preset.integrations[category];
      return !value || value === "none" ? null : { provider: value };
    }
  }
}

const INTEGRATION_CATEGORIES: IntegrationCategory[] = [
  "auth",
  "database",
  "api",
  "analytics",
  "errorTracking",
  "email",
  "rateLimit",
  "ai",
];

export function computeEnvChain(preset: Preset): EnvChain {
  const base: EnvChain["base"] = { server: [], client: [] };

  for (const category of INTEGRATION_CATEGORIES) {
    const selection = resolveSelection(preset, category);
    if (!selection) continue;
    const integration = getIntegration(category, selection.provider);
    if (!integration?.envVars) continue;
    const vars = integration.envVars(preset);
    if (vars.server) base.server.push(...vars.server);
    if (vars.client) base.client.push(...vars.client);
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
