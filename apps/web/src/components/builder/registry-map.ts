/**
 * Maps (schema group, value) → registry (slot, variant)[] pairs.
 * null  = no registry item needed (built-in behaviour, always available)
 */
export const REGISTRY_MAP: Record<
  string,
  Record<string, [string, string][] | null>
> = {
  database: {
    none: null,
    supabase: [["db", "supabase"]],
    drizzle: [
      ["db", "drizzle-postgres"],
      ["db", "drizzle-mysql"],
      ["db", "drizzle-sqlite"],
    ],
    prisma: [
      ["db", "prisma-postgres"],
      ["db", "prisma-mysql"],
      ["db", "prisma-sqlite"],
    ],
  },
  driver: {
    postgres: null,
    turso: null,
    neon: null,
    planetscale: null,
    mysql: null,
    sqlite: null,
  },
  api: {
    none: null,
    trpc: [["api", "trpc"]],
    hono: [
      ["api", "hono-route"],
      ["api", "hono-standalone"],
    ],
    "rest-nextjs": null,
  },
  auth: {
    none: null,
    "better-auth": [["auth", "better-auth"]],
    clerk: [["auth", "clerk"]],
    "supabase-auth": [["auth", "supabase-auth"]],
    "next-auth": [["auth", "authjs"]],
    lucia: null,
  },
  css: { tailwind4: null, vanilla: null, "css-modules": null },
  ui: {
    none: null,
    shadcn: [["ui", "shadcn-starter"]],
    "radix-raw": null,
  },
  analytics: {
    none: null,
    posthog: [["analytics", "posthog"]],
    "vercel-analytics": [["analytics", "vercel-analytics"]],
    plausible: [["analytics", "plausible"]],
  },
  errorTracking: {
    none: null,
    sentry: [["monitoring", "sentry"]],
    bugsnag: [["monitoring", "bugsnag"]],
  },
  email: {
    none: null,
    "react-email-resend": [["email", "resend"]],
    nodemailer: [["email", "nodemailer"]],
  },
  rateLimit: {
    none: null,
    upstash: [["rate-limit", "upstash-ratelimit"]],
  },
  ai: {
    none: null,
    "vercel-ai-sdk": [["ai", "vercel-ai-sdk"]],
    langchain: [["ai", "langchain"]],
  },
  cache: {
    none: null,
    upstash: [["cache", "upstash-redis"]],
  },
};
