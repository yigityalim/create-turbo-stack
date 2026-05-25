import type { DrizzleDriver } from "@create-turbo-stack/schema";
import { renderSourceFiles } from "../render/render-source";
import { VERSIONS } from "../wiring/versions";
import { type CatalogEntrySpec, defineIntegration, type EnvVarSpec } from "./types";

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
  resolvePackageFiles: (_preset, ctx) => [
    ...ctx.makeBase({
      deps: {
        "@supabase/supabase-js": "catalog:",
        "@supabase/ssr": "catalog:",
        ...ctx.env.workspaceDep,
      },
    }),
    ...renderSourceFiles("db/supabase", ctx.base, { ...ctx.env.context }),
  ],
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
  envVars: (preset) => {
    const server: EnvVarSpec[] = [
      {
        name: "DATABASE_URL",
        zodType: "z.string().url()",
        example: "postgresql://user:pass@localhost:5432/db",
        description: "Database connection URL",
      },
    ];
    // Turso needs an auth token alongside the libsql URL.
    if (
      preset.database.strategy === "drizzle" &&
      "driver" in preset.database &&
      preset.database.driver === "turso"
    ) {
      server.push({
        name: "DATABASE_AUTH_TOKEN",
        zodType: "z.string().optional()",
        example: "eyJ...",
        description: "Turso database auth token",
      });
    }
    return { server };
  },
  resolvePackageFiles: (preset, ctx) => {
    const driver =
      preset.database.strategy === "drizzle" && "driver" in preset.database
        ? preset.database.driver
        : "postgres";

    const deps: Record<string, string> = { "drizzle-orm": "catalog:", ...ctx.env.workspaceDep };
    const driverDep = DRIZZLE_DRIVER_DEPS[driver];
    if (driverDep) deps[driverDep.name] = "catalog:";

    return [
      ...ctx.makeBase({ deps, devDeps: { "drizzle-kit": "catalog:" } }),
      ...renderSourceFiles("db/drizzle", ctx.base, {
        ...ctx.env.context,
        scope: ctx.scope,
        driver,
        drizzleDialect: drizzleDialect(driver),
        drizzleSchemaImports: drizzleSchemaImports(driver),
        drizzleSchemaModule: drizzleSchemaModule(driver),
        drizzleTableFn: drizzleTableFn(driver),
        drizzleIdColumn: drizzleIdColumn(driver),
      }),
    ];
  },
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
  resolvePackageFiles: (_preset, ctx) => [
    ...ctx.makeBase({ deps: { "@prisma/client": "catalog:" }, devDeps: { prisma: "catalog:" } }),
    ...renderSourceFiles("db/prisma", ctx.base, {}),
  ],
});

export const databaseIntegrations = [supabase, drizzle, prisma];

// Drizzle driver → dialect/module/column mappings. Each driver renders a
// slightly different schema; these feed schema.ts.eta and drizzle.config.ts.eta
// so those stay generic. The per-driver client lives in client.ts.eta, keyed
// off `driver` directly.

function drizzleDialect(driver: DrizzleDriver): string {
  if (driver === "mysql" || driver === "planetscale") return "mysql";
  if (driver === "sqlite" || driver === "turso") return "sqlite";
  return "postgresql";
}

function drizzleSchemaModule(driver: DrizzleDriver): string {
  if (driver === "mysql" || driver === "planetscale") return "drizzle-orm/mysql-core";
  if (driver === "sqlite" || driver === "turso") return "drizzle-orm/sqlite-core";
  return "drizzle-orm/pg-core";
}

function drizzleSchemaImports(driver: DrizzleDriver): string {
  if (driver === "mysql" || driver === "planetscale")
    return "mysqlTable, varchar, text, timestamp, serial";
  if (driver === "sqlite" || driver === "turso") return "sqliteTable, text, integer";
  return "pgTable, varchar, text, timestamp, serial";
}

function drizzleTableFn(driver: DrizzleDriver): string {
  if (driver === "mysql" || driver === "planetscale") return "mysqlTable";
  if (driver === "sqlite" || driver === "turso") return "sqliteTable";
  return "pgTable";
}

function drizzleIdColumn(driver: DrizzleDriver): string {
  if (driver === "sqlite" || driver === "turso")
    return 'integer("id").primaryKey({ autoIncrement: true })';
  return 'serial("id").primaryKey()';
}
