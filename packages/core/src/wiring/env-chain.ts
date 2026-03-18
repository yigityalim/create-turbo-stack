import type { Preset } from "@create-turbo-stack/schema";

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

  // Database
  if (preset.database.strategy === "supabase") {
    base.server.push(
      {
        name: "SUPABASE_URL",
        zodType: "z.string().url()",
        example: "https://xxx.supabase.co",
        description: "Supabase project URL",
      },
      {
        name: "SUPABASE_ANON_KEY",
        zodType: "z.string().min(1)",
        example: "eyJ...",
        description: "Supabase anonymous key",
      },
      {
        name: "SUPABASE_SERVICE_ROLE_KEY",
        zodType: "z.string().min(1)",
        example: "eyJ...",
        description: "Supabase service role key (server-only)",
      },
    );
    base.client.push(
      {
        name: "NEXT_PUBLIC_SUPABASE_URL",
        zodType: "z.string().url()",
        example: "https://xxx.supabase.co",
        description: "Supabase URL (client)",
      },
      {
        name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        zodType: "z.string().min(1)",
        example: "eyJ...",
        description: "Supabase anon key (client)",
      },
    );
  } else if (preset.database.strategy === "drizzle" || preset.database.strategy === "prisma") {
    base.server.push({
      name: "DATABASE_URL",
      zodType: "z.string().url()",
      example: "postgresql://user:pass@localhost:5432/db",
      description: "Database connection URL",
    });
  }

  // Auth
  if (preset.auth.provider === "clerk") {
    base.server.push({
      name: "CLERK_SECRET_KEY",
      zodType: "z.string().min(1)",
      example: "sk_test_...",
      description: "Clerk secret key",
    });
    base.client.push({
      name: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
      zodType: "z.string().min(1)",
      example: "pk_test_...",
      description: "Clerk publishable key",
    });
  }

  // Sentry
  if (preset.integrations.errorTracking === "sentry") {
    base.server.push({
      name: "SENTRY_DSN",
      zodType: "z.string().url()",
      example: "https://xxx@sentry.io/xxx",
      description: "Sentry DSN",
    });
  }

  // PostHog
  if (preset.integrations.analytics === "posthog") {
    base.client.push(
      {
        name: "NEXT_PUBLIC_POSTHOG_KEY",
        zodType: "z.string().min(1)",
        example: "phc_...",
        description: "PostHog project API key",
      },
      {
        name: "NEXT_PUBLIC_POSTHOG_HOST",
        zodType: "z.string().url()",
        example: "https://us.i.posthog.com",
        description: "PostHog host",
      },
    );
  }

  // Per-app env
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
