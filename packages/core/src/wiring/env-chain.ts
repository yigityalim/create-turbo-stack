import type { Preset } from "@create-turbo-stack/schema";
import { activeProvider, getIntegration, INTEGRATION_CATEGORIES } from "../integrations";

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

export function computeEnvChain(preset: Preset): EnvChain {
  const base: EnvChain["base"] = { server: [], client: [] };

  for (const category of INTEGRATION_CATEGORIES) {
    const provider = activeProvider(preset, category);
    if (!provider) continue;
    const integration = getIntegration(category, provider);
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
