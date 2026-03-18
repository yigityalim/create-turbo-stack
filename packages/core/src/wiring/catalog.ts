import type { Preset } from "@create-turbo-stack/schema";

export interface CatalogEntry {
  name: string;
  version: string;
}

/**
 * Compute the full dependency catalog based on preset selections.
 * Each integration/framework/tool contributes its dependencies.
 */
export function computeCatalog(preset: Preset): CatalogEntry[] {
  const catalog = new Map<string, string>();

  const add = (name: string, version: string) => {
    if (!catalog.has(name)) catalog.set(name, version);
  };

  // Always
  add("typescript", "^5.9.0");

  // Linter
  if (preset.basics.linter === "biome") {
    add("@biomejs/biome", "^1.9.0");
  } else {
    add("eslint", "^9.0.0");
    add("prettier", "^3.8.0");
  }

  // CSS
  if (preset.css.framework === "tailwind4") {
    add("tailwindcss", "^4.0.0");
    add("@tailwindcss/postcss", "^4.0.0");
  } else if (preset.css.framework === "tailwind3") {
    add("tailwindcss", "^3.4.0");
    add("postcss", "^8.0.0");
    add("autoprefixer", "^10.0.0");
  }

  if (preset.css.ui === "shadcn") {
    add("tw-animate-css", "^1.0.0");
  }

  // Apps
  for (const app of preset.apps) {
    if (app.type === "nextjs" || app.type === "nextjs-api-only") {
      add("next", "^15.0.0");
      add("react", "^19.0.0");
      add("react-dom", "^19.0.0");
      add("@types/react", "^19.0.0");
      add("@types/react-dom", "^19.0.0");
    }
    if (app.type === "hono-standalone") {
      add("hono", "^4.0.0");
    }
    if (app.i18n) {
      add("next-intl", "^4.0.0");
    }
  }

  // Database
  if (preset.database.strategy === "supabase") {
    add("@supabase/supabase-js", "^2.0.0");
    add("@supabase/ssr", "^0.5.0");
  } else if (preset.database.strategy === "drizzle") {
    add("drizzle-orm", "^0.38.0");
    add("drizzle-kit", "^0.30.0");
  } else if (preset.database.strategy === "prisma") {
    add("prisma", "^6.0.0");
    add("@prisma/client", "^6.0.0");
  }

  // API
  if (preset.api.strategy === "trpc") {
    add("@trpc/server", "^11.0.0");
    add("@trpc/client", "^11.0.0");
    add("@trpc/react-query", "^11.0.0");
    add("@tanstack/react-query", "^5.0.0");
    add("superjson", "^2.0.0");
    add("zod", "^3.24.0");
  } else if (preset.api.strategy === "hono") {
    add("hono", "^4.0.0");
  }

  // Auth
  if (preset.auth.provider === "better-auth") {
    add("better-auth", "^1.0.0");
  } else if (preset.auth.provider === "clerk") {
    add("@clerk/nextjs", "^6.0.0");
  } else if (preset.auth.provider === "next-auth") {
    add("next-auth", "^5.0.0");
  }

  // Env
  if (preset.integrations.envValidation) {
    add("@t3-oss/env-nextjs", "^0.12.0");
    add("zod", "^3.24.0");
  }

  // Integrations
  if (preset.integrations.analytics === "posthog") {
    add("posthog-js", "^1.0.0");
    add("posthog-node", "^4.0.0");
  } else if (preset.integrations.analytics === "vercel-analytics") {
    add("@vercel/analytics", "^1.0.0");
  }

  if (preset.integrations.errorTracking === "sentry") {
    add("@sentry/nextjs", "^9.0.0");
  }

  if (preset.integrations.email === "react-email-resend") {
    add("resend", "^4.0.0");
    add("@react-email/components", "^0.1.0");
  }

  if (preset.integrations.rateLimit === "upstash") {
    add("@upstash/ratelimit", "^2.0.0");
    add("@upstash/redis", "^1.0.0");
  }

  if (preset.integrations.ai === "vercel-ai-sdk") {
    add("ai", "^4.0.0");
    add("@ai-sdk/openai", "^1.0.0");
  }

  return Array.from(catalog.entries()).map(([name, version]) => ({ name, version }));
}
