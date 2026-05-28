import { renderSourceFiles } from "../render/render-source";
import { VERSIONS } from "../wiring/versions";
import { defineIntegration } from "./types";

/**
 * Upstash Redis (serverless / REST). Provider-neutral surface: the package
 * exports a `CacheProvider` instance, so swapping in a different cache
 * backend later means replacing only `./client` — consumers stay on `cache`.
 *
 * Env vars overlap with the rate-limit upstash integration; `computeEnvChain`
 * dedupes by name so a project running both still gets one entry each.
 */
export const upstashCache = defineIntegration({
  category: "cache",
  provider: "upstash",
  label: "Upstash Redis cache",
  catalogEntries: () => [{ name: "@upstash/redis", version: VERSIONS.upstashRedis }],
  envVars: () => ({
    server: [
      {
        name: "UPSTASH_REDIS_REST_URL",
        zodType: "z.string().url()",
        example: "https://xxx.upstash.io",
        description: "Upstash Redis REST URL",
      },
      {
        name: "UPSTASH_REDIS_REST_TOKEN",
        zodType: "z.string().min(1)",
        example: "AXxx...",
        description: "Upstash Redis REST token",
      },
    ],
  }),
  resolvePackageFiles: (_preset, ctx) => [
    ...ctx.makeBase({
      deps: { "@upstash/redis": "catalog:", ...ctx.env.workspaceDep },
    }),
    ...renderSourceFiles("integration/cache/upstash", ctx.base, { ...ctx.env.context }),
  ],
});

export const cacheIntegrations = [upstashCache];
