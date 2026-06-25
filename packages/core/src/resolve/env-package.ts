import type { PackageRegistryItem, Preset } from "@create-turbo-stack/schema";
import { computeEnvChain, type EnvVar } from "../wiring/env-chain";

/**
 * Generate the `env` package's `src/index.ts` from the env chain.
 *
 * The env package is the one auto-package whose source is COMPUTED, not
 * copied from a static registry file: every other selected item declares the
 * vars it reads (`item.envVars`), and those have to land in a single
 * validated `createEnv` so consumers can `import { env } from "{{scope}}/env"`
 * and get `env.POSTHOG_API_KEY` typed. A static file can't know which
 * providers a given preset selected, so we build it here.
 *
 * `NODE_ENV` is always present; everything else comes from `computeEnvChain`
 * (items → server/client, apps → `NEXT_PUBLIC_APP_URL`). Output is formatted
 * to match Biome (double quotes, semicolons, 2-space indent, trailing commas)
 * so the generated project lints clean.
 */
export function buildEnvIndex(preset: Preset, items: ReadonlyArray<PackageRegistryItem>): string {
  const chain = computeEnvChain(preset, items);

  const nodeEnv: EnvVar = {
    name: "NODE_ENV",
    zodType: 'z.enum(["development", "test", "production"]).default("development")',
    example: "development",
    description: "",
  };

  const server = dedupe([nodeEnv, ...chain.base.server]);
  const client = dedupe([
    ...chain.base.client,
    ...Object.values(chain.apps).flatMap((a) => a.client),
  ]);

  const block = (vars: EnvVar[]) =>
    vars.length ? `\n${vars.map((v) => `    ${v.name}: ${v.zodType},`).join("\n")}\n  ` : "";
  const runtime = [...server, ...client]
    .map((v) => `    ${v.name}: process.env.${v.name},`)
    .join("\n");

  return `import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {${block(server)}},
  client: {${block(client)}},
  runtimeEnv: {
${runtime}
  },
  emptyStringAsUndefined: true,
});
`;
}

function dedupe(vars: EnvVar[]): EnvVar[] {
  const seen = new Set<string>();
  const out: EnvVar[] = [];
  for (const v of vars) {
    if (seen.has(v.name)) continue;
    seen.add(v.name);
    out.push(v);
  }
  return out;
}
