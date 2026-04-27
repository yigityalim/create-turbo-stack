import { VERSIONS } from "../wiring/versions";
import { defineIntegration } from "./types";

export const upstash = defineIntegration({
  category: "rateLimit",
  provider: "upstash",
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
});

export const rateLimitIntegrations = [upstash];
