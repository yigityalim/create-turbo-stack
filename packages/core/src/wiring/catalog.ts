import type { Preset } from "@create-turbo-stack/schema";
import { VERSIONS } from "./versions";

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
  add("typescript", VERSIONS.typescript);

  // Linter
  if (preset.basics.linter === "biome") {
    add("@biomejs/biome", VERSIONS.biome);
  } else {
    add("eslint", VERSIONS.eslint);
    add("prettier", VERSIONS.prettier);
  }

  // CSS
  if (preset.css.framework === "tailwind4") {
    add("tailwindcss", VERSIONS.tailwind4);
    add("@tailwindcss/postcss", VERSIONS.tailwindPostcss);
  } else if (preset.css.framework === "tailwind3") {
    add("tailwindcss", VERSIONS.tailwind3);
    add("postcss", VERSIONS.postcss);
    add("autoprefixer", VERSIONS.autoprefixer);
  }

  if (preset.css.ui === "shadcn") {
    add("tw-animate-css", VERSIONS.twAnimateCss);
  }

  // Apps
  for (const app of preset.apps) {
    if (app.type === "nextjs" || app.type === "nextjs-api-only") {
      add("next", VERSIONS.next);
      add("react", VERSIONS.react);
      add("react-dom", VERSIONS.reactDom);
      add("@types/react", VERSIONS.typesReact);
      add("@types/react-dom", VERSIONS.typesReactDom);
      add("@types/node", VERSIONS.typesNode);
    }
    if (app.type === "hono-standalone") {
      add("hono", VERSIONS.hono);
      add("@hono/node-server", VERSIONS.honoNodeServer);
      add("tsx", VERSIONS.tsx);
    }
    if (app.type === "vite-react") {
      add("react", VERSIONS.react);
      add("react-dom", VERSIONS.reactDom);
      add("@vitejs/plugin-react", VERSIONS.vitejsPluginReact);
      add("vite", VERSIONS.vite);
      add("@types/react", VERSIONS.typesReact);
      add("@types/react-dom", VERSIONS.typesReactDom);
    }
    if (app.type === "sveltekit") {
      add("@sveltejs/kit", VERSIONS.sveltejsKit);
      add("svelte", VERSIONS.svelte);
      add("@sveltejs/adapter-auto", VERSIONS.sveltejsAdapterAuto);
      add("@sveltejs/vite-plugin-svelte", VERSIONS.sveltejsVitePluginSvelte);
      add("vite", VERSIONS.vite);
    }
    if (app.type === "astro") {
      add("astro", VERSIONS.astro);
      add("@astrojs/react", VERSIONS.astrojsReact);
    }
    if (app.type === "remix") {
      add("@remix-run/node", VERSIONS.remixRunNode);
      add("@remix-run/react", VERSIONS.remixRunReact);
      add("@remix-run/serve", VERSIONS.remixRunServe);
      add("@remix-run/dev", VERSIONS.remixRunDev);
      add("react", VERSIONS.react);
      add("react-dom", VERSIONS.reactDom);
      add("isbot", VERSIONS.isbot);
      add("@types/react", VERSIONS.typesReact);
      add("@types/react-dom", VERSIONS.typesReactDom);
      add("vite", VERSIONS.vite);
    }
    if (app.i18n) {
      add("next-intl", VERSIONS.nextIntl);
    }
  }

  // Database
  if (preset.database.strategy === "supabase") {
    add("@supabase/supabase-js", VERSIONS.supabaseJs);
    add("@supabase/ssr", VERSIONS.supabaseSsr);
  } else if (preset.database.strategy === "drizzle") {
    add("drizzle-orm", VERSIONS.drizzleOrm);
    add("drizzle-kit", VERSIONS.drizzleKit);
    // Driver-specific deps
    if ("driver" in preset.database) {
      const driverDeps: Record<string, [string, string]> = {
        postgres: ["postgres", VERSIONS.postgres],
        mysql: ["mysql2", VERSIONS.mysql2],
        sqlite: ["better-sqlite3", VERSIONS.betterSqlite3],
        turso: ["@libsql/client", VERSIONS.libsqlClient],
        neon: ["@neondatabase/serverless", VERSIONS.neonServerless],
        planetscale: ["@planetscale/database", VERSIONS.planetscaleDatabase],
      };
      const dep = driverDeps[preset.database.driver];
      if (dep) add(dep[0], dep[1]);
    }
  } else if (preset.database.strategy === "prisma") {
    add("prisma", VERSIONS.prisma);
    add("@prisma/client", VERSIONS.prismaClient);
  }

  // API
  if (preset.api.strategy === "trpc") {
    add("@trpc/server", VERSIONS.trpcServer);
    add("@trpc/client", VERSIONS.trpcClient);
    add("@trpc/react-query", VERSIONS.trpcReactQuery);
    add("@tanstack/react-query", VERSIONS.tanstackReactQuery);
    add("superjson", VERSIONS.superjson);
    add("zod", VERSIONS.zod);
  } else if (preset.api.strategy === "hono") {
    add("hono", VERSIONS.hono);
  }

  // Auth
  if (preset.auth.provider === "better-auth") {
    add("better-auth", VERSIONS.betterAuth);
  } else if (preset.auth.provider === "clerk") {
    add("@clerk/nextjs", VERSIONS.clerkNextjs);
  } else if (preset.auth.provider === "next-auth") {
    add("next-auth", VERSIONS.nextAuth);
  }

  // Env
  if (preset.integrations.envValidation) {
    add("@t3-oss/env-nextjs", VERSIONS.t3Env);
    add("zod", VERSIONS.zod);
  }

  // Integrations
  if (preset.integrations.analytics === "posthog") {
    add("posthog-js", VERSIONS.posthogJs);
    add("posthog-node", VERSIONS.posthogNode);
  } else if (preset.integrations.analytics === "vercel-analytics") {
    add("@vercel/analytics", VERSIONS.vercelAnalytics);
  }

  if (preset.integrations.errorTracking === "sentry") {
    add("@sentry/nextjs", VERSIONS.sentryNextjs);
  }

  if (preset.integrations.email === "react-email-resend") {
    add("resend", VERSIONS.resend);
    add("@react-email/components", VERSIONS.reactEmailComponents);
  } else if (preset.integrations.email === "nodemailer") {
    add("nodemailer", VERSIONS.nodemailer);
  }

  if (preset.integrations.rateLimit === "upstash") {
    add("@upstash/ratelimit", VERSIONS.upstashRatelimit);
    add("@upstash/redis", VERSIONS.upstashRedis);
  }

  if (preset.integrations.ai === "vercel-ai-sdk") {
    add("ai", VERSIONS.ai);
    add("@ai-sdk/openai", VERSIONS.aiSdkOpenai);
  }

  return Array.from(catalog.entries()).map(([name, version]) => ({ name, version }));
}
