import { VERSIONS } from "../wiring/versions";
import { type CatalogEntrySpec, defineIntegration } from "./types";

const SUPABASE_ENV = {
  server: [
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
  ],
  client: [
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
  ],
} as const;

export const supabase = defineIntegration({
  category: "database",
  provider: "supabase",
  catalogEntries: () => [
    { name: "@supabase/supabase-js", version: VERSIONS.supabaseJs },
    { name: "@supabase/ssr", version: VERSIONS.supabaseSsr },
  ],
  envVars: () => SUPABASE_ENV,
});

const DRIZZLE_DRIVER_DEPS: Record<string, CatalogEntrySpec> = {
  postgres: { name: "postgres", version: VERSIONS.postgres },
  mysql: { name: "mysql2", version: VERSIONS.mysql2 },
  sqlite: { name: "better-sqlite3", version: VERSIONS.betterSqlite3 },
  turso: { name: "@libsql/client", version: VERSIONS.libsqlClient },
  neon: { name: "@neondatabase/serverless", version: VERSIONS.neonServerless },
  planetscale: { name: "@planetscale/database", version: VERSIONS.planetscaleDatabase },
};

export const drizzle = defineIntegration({
  category: "database",
  provider: "drizzle",
  catalogEntries: (preset) => {
    const entries: CatalogEntrySpec[] = [
      { name: "drizzle-orm", version: VERSIONS.drizzleOrm },
      { name: "drizzle-kit", version: VERSIONS.drizzleKit },
    ];
    if (preset.database.strategy === "drizzle" && "driver" in preset.database) {
      const driverDep = DRIZZLE_DRIVER_DEPS[preset.database.driver];
      if (driverDep) entries.push(driverDep);
    }
    return entries;
  },
  envVars: () => ({
    server: [
      {
        name: "DATABASE_URL",
        zodType: "z.string().url()",
        example: "postgresql://user:pass@localhost:5432/db",
        description: "Database connection URL",
      },
    ],
  }),
});

export const prisma = defineIntegration({
  category: "database",
  provider: "prisma",
  catalogEntries: () => [
    { name: "prisma", version: VERSIONS.prisma },
    { name: "@prisma/client", version: VERSIONS.prismaClient },
  ],
  envVars: () => ({
    server: [
      {
        name: "DATABASE_URL",
        zodType: "z.string().url()",
        example: "postgresql://user:pass@localhost:5432/db",
        description: "Database connection URL",
      },
    ],
  }),
});

export const databaseIntegrations = [supabase, drizzle, prisma];
