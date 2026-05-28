import { renderSourceFiles } from "../render/render-source";
import { VERSIONS } from "../wiring/versions";
import { defineIntegration } from "./types";

export const upstash = defineIntegration({
  category: "rateLimit",
  provider: "upstash",
  label: "Upstash rate limiting",
  catalogEntries: () => [
    { name: "@upstash/ratelimit", version: VERSIONS.upstashRatelimit },
    { name: "@upstash/redis", version: VERSIONS.upstashRedis },
  ],
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
      deps: {
        "@upstash/ratelimit": "catalog:",
        "@upstash/redis": "catalog:",
        ...ctx.env.workspaceDep,
      },
    }),
    ...renderSourceFiles("integration/rate-limit/upstash", ctx.base, { ...ctx.env.context }),
  ],
});

export const rateLimitIntegrations = [upstash];
