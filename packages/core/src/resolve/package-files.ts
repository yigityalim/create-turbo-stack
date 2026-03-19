import type { FileTreeNode, Package, Preset } from "@create-turbo-stack/schema";
import { renderSourceFiles } from "../render/render-source";
import { fullPackageName } from "../utils/naming";
import { computeExportsMap } from "../wiring/exports-map";

/**
 * Resolve files for a single package (user-specified or auto-generated).
 */
export function resolvePackageFiles(preset: Preset, pkg: Package): FileTreeNode[] {
  const _scope = preset.basics.scope;
  const base = `packages/${pkg.name}`;

  // Special case: typescript-config
  if (pkg.name === "typescript-config") {
    return resolveTypescriptConfigPackage(preset, base);
  }

  // Route to specialized resolvers for auto-generated packages
  if (pkg.name === "db") return resolveDbPackage(preset, pkg, base);
  if (pkg.name === "api") return resolveApiPackage(preset, pkg, base);
  if (pkg.name === "auth") return resolveAuthPackage(preset, pkg, base);
  if (pkg.name === "env") return resolveEnvPackage(preset, pkg, base);
  if (pkg.name === "analytics") return resolveAnalyticsPackage(preset, pkg, base);
  if (pkg.name === "monitoring") return resolveMonitoringPackage(preset, pkg, base);
  if (pkg.name === "email") return resolveEmailPackage(preset, pkg, base);
  if (pkg.name === "rate-limit") return resolveRateLimitPackage(preset, pkg, base);
  if (pkg.name === "ai") return resolveAiPackage(preset, pkg, base);

  // Generic package
  return resolveGenericPackage(preset, pkg, base);
}

// ---------------------------------------------------------------------------
// Generic package (user-specified)
// ---------------------------------------------------------------------------

function resolveGenericPackage(preset: Preset, pkg: Package, base: string): FileTreeNode[] {
  const nodes: FileTreeNode[] = [];
  const scope = preset.basics.scope;
  const name = fullPackageName(scope, pkg.name);

  nodes.push(...makeBasePackageFiles(preset, pkg, base));

  // src/index.ts
  nodes.push({
    path: `${base}/src/index.ts`,
    content: `// ${name}\nexport {};\n`,
    isDirectory: false,
  });

  // Extra exports
  for (const exp of pkg.exports) {
    if (exp !== ".") {
      const fileName = exp.replace(/^\.\//, "");
      nodes.push({
        path: `${base}/src/${fileName}.ts`,
        content: `// ${name}/${fileName}\nexport {};\n`,
        isDirectory: false,
      });
    }
  }

  // CSS-producing packages get globals.css
  if (pkg.producesCSS) {
    nodes.push({
      path: `${base}/src/globals.css`,
      content: `/* ${name} global styles */\n`,
      isDirectory: false,
    });
  }

  return nodes;
}

// ---------------------------------------------------------------------------
// Database package
// ---------------------------------------------------------------------------

function resolveDbPackage(preset: Preset, pkg: Package, base: string): FileTreeNode[] {
  const nodes: FileTreeNode[] = [];
  const scope = preset.basics.scope;
  const db = preset.database;

  // Extra deps for db package
  const extraDeps: Record<string, string> = {};
  const extraDevDeps: Record<string, string> = {};

  if (db.strategy === "drizzle") {
    extraDeps["drizzle-orm"] = "catalog:";
    extraDevDeps["drizzle-kit"] = "catalog:";
    // Driver-specific deps
    if ("driver" in db) {
      const driverDep = drizzleDriverDep(db.driver);
      if (driverDep) extraDeps[driverDep.name] = "catalog:";
    }
  } else if (db.strategy === "prisma") {
    extraDevDeps.prisma = "catalog:";
    extraDeps["@prisma/client"] = "catalog:";
  } else if (db.strategy === "supabase") {
    extraDeps["@supabase/supabase-js"] = "catalog:";
    extraDeps["@supabase/ssr"] = "catalog:";
  }

  nodes.push(...makeBasePackageFiles(preset, pkg, base, extraDeps, extraDevDeps));

  if (db.strategy === "drizzle") {
    const driver = "driver" in db ? db.driver : "postgres";

    nodes.push(
      ...renderSourceFiles("db/drizzle", base, {
        scope,
        drizzleDialect: drizzleDialect(driver),
        drizzleSchemaImports: drizzleSchemaImports(driver),
        drizzleSchemaModule: drizzleSchemaModule(driver),
        drizzleTableFn: drizzleTableFn(driver),
        drizzleIdColumn: drizzleIdColumn(driver),
        drizzleClientContent: drizzleClientContent(driver, scope),
      }),
    );
  } else if (db.strategy === "prisma") {
    nodes.push(...renderSourceFiles("db/prisma", base, {}));
  } else if (db.strategy === "supabase") {
    nodes.push(...renderSourceFiles("db/supabase", base, {}));
  }

  return nodes;
}

// ---------------------------------------------------------------------------
// API package
// ---------------------------------------------------------------------------

function resolveApiPackage(preset: Preset, pkg: Package, base: string): FileTreeNode[] {
  const nodes: FileTreeNode[] = [];
  const scope = preset.basics.scope;
  const api = preset.api;

  const extraDeps: Record<string, string> = {};

  if (api.strategy === "trpc") {
    extraDeps["@trpc/server"] = "catalog:";
    extraDeps["@trpc/client"] = "catalog:";
    extraDeps["@trpc/react-query"] = "catalog:";
    extraDeps["@tanstack/react-query"] = "catalog:";
    extraDeps.superjson = "catalog:";
    extraDeps.zod = "catalog:";
  } else if (api.strategy === "hono") {
    extraDeps.hono = "catalog:";
  }

  // Add db dep if database is set
  if (preset.database.strategy !== "none") {
    extraDeps[`${scope}/db`] = "workspace:*";
  }

  nodes.push(...makeBasePackageFiles(preset, pkg, base, extraDeps));

  if (api.strategy === "trpc") {
    nodes.push(
      ...renderSourceFiles("api/trpc", base, {
        scope,
        database: preset.database,
      }),
    );
  } else if (api.strategy === "hono") {
    nodes.push(...renderSourceFiles("api/hono", base, {}));
  } else if (api.strategy === "rest-nextjs") {
    nodes.push(...renderSourceFiles("api/rest-nextjs", base, {}));
  }

  return nodes;
}

// ---------------------------------------------------------------------------
// Auth package
// ---------------------------------------------------------------------------

function resolveAuthPackage(preset: Preset, pkg: Package, base: string): FileTreeNode[] {
  const nodes: FileTreeNode[] = [];
  const scope = preset.basics.scope;
  const auth = preset.auth;

  const extraDeps: Record<string, string> = {};

  if (auth.provider === "supabase-auth") {
    extraDeps[`${scope}/db`] = "workspace:*";
  } else if (auth.provider === "better-auth") {
    extraDeps["better-auth"] = "catalog:";
    if (preset.database.strategy !== "none") {
      extraDeps[`${scope}/db`] = "workspace:*";
    }
  } else if (auth.provider === "clerk") {
    extraDeps["@clerk/nextjs"] = "catalog:";
  } else if (auth.provider === "next-auth") {
    extraDeps["next-auth"] = "catalog:";
    if (preset.database.strategy !== "none") {
      extraDeps[`${scope}/db`] = "workspace:*";
    }
  } else if (auth.provider === "lucia") {
    if (preset.database.strategy !== "none") {
      extraDeps[`${scope}/db`] = "workspace:*";
    }
  }

  nodes.push(...makeBasePackageFiles(preset, pkg, base, extraDeps));

  if (auth.provider === "supabase-auth") {
    nodes.push(...renderSourceFiles("auth/supabase-auth", base, { scope }));
  } else if (auth.provider === "better-auth") {
    nodes.push(...renderSourceFiles("auth/better-auth", base, {}));
  } else if (auth.provider === "clerk") {
    nodes.push(...renderSourceFiles("auth/clerk", base, {}));
  } else if (auth.provider === "next-auth") {
    nodes.push(...renderSourceFiles("auth/next-auth", base, {}));
  } else if (auth.provider === "lucia") {
    nodes.push(...renderSourceFiles("auth/lucia", base, {}));
  }

  return nodes;
}

// ---------------------------------------------------------------------------
// Env package
// ---------------------------------------------------------------------------

function resolveEnvPackage(preset: Preset, pkg: Package, base: string): FileTreeNode[] {
  const nodes: FileTreeNode[] = [];
  const _scope = preset.basics.scope;

  const extraDeps: Record<string, string> = {
    "@t3-oss/env-nextjs": "catalog:",
    zod: "catalog:",
  };

  nodes.push(...makeBasePackageFiles(preset, pkg, base, extraDeps));

  // Compute env vars from chain
  const envVars = computeBaseEnvVars(preset);

  // src/index.ts
  const serverLines = envVars.server.map((v) => `    ${v.name}: ${v.zodType},`).join("\n");
  const clientLines = envVars.client.map((v) => `    ${v.name}: ${v.zodType},`).join("\n");
  const runtimeLines = [...envVars.server, ...envVars.client]
    .map((v) => `    ${v.name}: process.env.${v.name},`)
    .join("\n");

  const sections: string[] = [];
  if (serverLines) sections.push(`  server: {\n${serverLines}\n  },`);
  if (clientLines) sections.push(`  client: {\n${clientLines}\n  },`);
  if (runtimeLines) {
    sections.push(`  runtimeEnv: {\n${runtimeLines}\n  },`);
  } else {
    sections.push("  runtimeEnv: {},");
  }

  nodes.push({
    path: `${base}/src/index.ts`,
    content: `import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
${sections.join("\n")}
});
`,
    isDirectory: false,
  });

  return nodes;
}

// ---------------------------------------------------------------------------
// Analytics package
// ---------------------------------------------------------------------------

function resolveAnalyticsPackage(preset: Preset, pkg: Package, base: string): FileTreeNode[] {
  const nodes: FileTreeNode[] = [];
  const analytics = preset.integrations.analytics;

  const extraDeps: Record<string, string> = {};
  if (analytics === "posthog") {
    extraDeps["posthog-js"] = "catalog:";
    extraDeps["posthog-node"] = "catalog:";
  } else if (analytics === "vercel-analytics") {
    extraDeps["@vercel/analytics"] = "catalog:";
  }

  nodes.push(...makeBasePackageFiles(preset, pkg, base, extraDeps));

  if (analytics === "posthog") {
    nodes.push(...renderSourceFiles("integration/analytics/posthog", base, {}));
  } else if (analytics === "vercel-analytics") {
    nodes.push(...renderSourceFiles("integration/analytics/vercel-analytics", base, {}));
  } else if (analytics === "plausible") {
    nodes.push(...renderSourceFiles("integration/analytics/plausible", base, {}));
  }

  return nodes;
}

// ---------------------------------------------------------------------------
// Monitoring package (Sentry)
// ---------------------------------------------------------------------------

function resolveMonitoringPackage(preset: Preset, pkg: Package, base: string): FileTreeNode[] {
  const nodes: FileTreeNode[] = [];

  const extraDeps: Record<string, string> = {
    "@sentry/nextjs": "catalog:",
  };

  nodes.push(...makeBasePackageFiles(preset, pkg, base, extraDeps));

  nodes.push(...renderSourceFiles("integration/monitoring/sentry", base, {}));

  return nodes;
}

// ---------------------------------------------------------------------------
// Email package
// ---------------------------------------------------------------------------

function resolveEmailPackage(preset: Preset, pkg: Package, base: string): FileTreeNode[] {
  const nodes: FileTreeNode[] = [];
  const email = preset.integrations.email;

  const extraDeps: Record<string, string> = {};
  if (email === "react-email-resend") {
    extraDeps.resend = "catalog:";
    extraDeps["@react-email/components"] = "catalog:";
    extraDeps.react = "catalog:";
  } else if (email === "nodemailer") {
    extraDeps.nodemailer = "catalog:";
  }

  nodes.push(...makeBasePackageFiles(preset, pkg, base, extraDeps));

  if (email === "react-email-resend") {
    nodes.push(...renderSourceFiles("integration/email/react-email-resend", base, {}));
  } else if (email === "nodemailer") {
    nodes.push(...renderSourceFiles("integration/email/nodemailer", base, {}));
  }

  return nodes;
}

// ---------------------------------------------------------------------------
// Rate limit package
// ---------------------------------------------------------------------------

function resolveRateLimitPackage(preset: Preset, pkg: Package, base: string): FileTreeNode[] {
  const nodes: FileTreeNode[] = [];

  const extraDeps: Record<string, string> = {
    "@upstash/ratelimit": "catalog:",
    "@upstash/redis": "catalog:",
  };

  nodes.push(...makeBasePackageFiles(preset, pkg, base, extraDeps));

  nodes.push(...renderSourceFiles("integration/rate-limit/upstash", base, {}));

  return nodes;
}

// ---------------------------------------------------------------------------
// AI package
// ---------------------------------------------------------------------------

function resolveAiPackage(preset: Preset, pkg: Package, base: string): FileTreeNode[] {
  const nodes: FileTreeNode[] = [];
  const ai = preset.integrations.ai;

  const extraDeps: Record<string, string> = {};
  if (ai === "vercel-ai-sdk") {
    extraDeps.ai = "catalog:";
    extraDeps["@ai-sdk/openai"] = "catalog:";
  } else if (ai === "langchain") {
    // langchain deps would go here
  }

  nodes.push(...makeBasePackageFiles(preset, pkg, base, extraDeps));

  if (ai === "vercel-ai-sdk") {
    nodes.push(...renderSourceFiles("integration/ai/vercel-ai-sdk", base, {}));
  } else if (ai === "langchain") {
    nodes.push(...renderSourceFiles("integration/ai/langchain", base, {}));
  }

  return nodes;
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * Generate base package files: package.json + tsconfig.json.
 * Specialized resolvers add their own source files on top.
 */
function makeBasePackageFiles(
  preset: Preset,
  pkg: Package,
  base: string,
  extraDeps: Record<string, string> = {},
  extraDevDeps: Record<string, string> = {},
): FileTreeNode[] {
  const nodes: FileTreeNode[] = [];
  const scope = preset.basics.scope;
  const name = fullPackageName(scope, pkg.name);
  const exportsMap: Record<string, unknown> = computeExportsMap(pkg);

  // CSS-producing packages need a style export for globals.css
  if (pkg.producesCSS) {
    exportsMap["./globals.css"] = "./src/globals.css";
  }

  const pkgJson: Record<string, unknown> = {
    name,
    version: "0.1.0",
    private: true,
    type: "module",
    exports: exportsMap,
    scripts: {
      lint: preset.basics.linter === "biome" ? "biome check" : "eslint .",
      "type-check": "tsc --noEmit",
    },
    dependencies: { ...extraDeps },
    devDependencies: {
      [`${scope}/typescript-config`]: "workspace:*",
      ...(preset.basics.linter === "biome" ? { "@biomejs/biome": "catalog:" } : {}),
      typescript: "catalog:",
      ...extraDevDeps,
    },
  };

  nodes.push({
    path: `${base}/package.json`,
    content: JSON.stringify(pkgJson, null, 2),
    isDirectory: false,
  });

  // tsconfig.json
  const tsconfigBase =
    pkg.type === "ui" || pkg.type === "react-library"
      ? "react.json"
      : pkg.type === "config"
        ? "base.json"
        : "library.json";

  nodes.push({
    path: `${base}/tsconfig.json`,
    content: JSON.stringify(
      {
        extends: `${scope}/typescript-config/${tsconfigBase}`,
        compilerOptions: { outDir: "./dist", rootDir: "./src" },
        include: ["src/**/*"],
        exclude: ["node_modules", "dist"],
      },
      null,
      2,
    ),
    isDirectory: false,
  });

  return nodes;
}

// ---------------------------------------------------------------------------
// Drizzle helpers
// ---------------------------------------------------------------------------

function drizzleDriverDep(driver: string): { name: string } | null {
  const map: Record<string, string> = {
    postgres: "postgres",
    mysql: "mysql2",
    sqlite: "better-sqlite3",
    turso: "@libsql/client",
    neon: "@neondatabase/serverless",
    planetscale: "@planetscale/database",
  };
  const name = map[driver];
  return name ? { name } : null;
}

function drizzleDialect(driver: string): string {
  if (driver === "mysql" || driver === "planetscale") return "mysql";
  if (driver === "sqlite" || driver === "turso") return "sqlite";
  return "postgresql";
}

function drizzleSchemaModule(driver: string): string {
  if (driver === "mysql" || driver === "planetscale") return "drizzle-orm/mysql-core";
  if (driver === "sqlite" || driver === "turso") return "drizzle-orm/sqlite-core";
  return "drizzle-orm/pg-core";
}

function drizzleSchemaImports(driver: string): string {
  if (driver === "mysql" || driver === "planetscale") {
    return "mysqlTable, varchar, text, timestamp, serial";
  }
  if (driver === "sqlite" || driver === "turso") {
    return "sqliteTable, text, integer";
  }
  return "pgTable, varchar, text, timestamp, serial";
}

function drizzleTableFn(driver: string): string {
  if (driver === "mysql" || driver === "planetscale") return "mysqlTable";
  if (driver === "sqlite" || driver === "turso") return "sqliteTable";
  return "pgTable";
}

function drizzleIdColumn(driver: string): string {
  if (driver === "sqlite" || driver === "turso") {
    return 'integer("id").primaryKey({ autoIncrement: true })';
  }
  return 'serial("id").primaryKey()';
}

function drizzleClientContent(driver: string, _scope: string): string {
  if (driver === "neon") {
    return `import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
`;
  }
  if (driver === "turso") {
    return `import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const client = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
`;
  }
  if (driver === "planetscale") {
    return `import { Client } from "@planetscale/database";
import { drizzle } from "drizzle-orm/planetscale-serverless";
import * as schema from "./schema";

const client = new Client({ url: process.env.DATABASE_URL! });
export const db = drizzle(client, { schema });
`;
  }
  if (driver === "mysql") {
    return `import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "./schema";

const connection = await mysql.createConnection(process.env.DATABASE_URL!);
export const db = drizzle(connection, { schema });
`;
  }
  if (driver === "sqlite") {
    return `import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const sqlite = new Database(process.env.DATABASE_URL ?? "sqlite.db");
export const db = drizzle(sqlite, { schema });
`;
  }
  // postgres (default)
  return `import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema });
`;
}

// ---------------------------------------------------------------------------
// Env helpers
// ---------------------------------------------------------------------------

interface EnvVarDef {
  name: string;
  zodType: string;
}

function computeBaseEnvVars(preset: Preset): { server: EnvVarDef[]; client: EnvVarDef[] } {
  const server: EnvVarDef[] = [];
  const client: EnvVarDef[] = [];

  // Database
  if (preset.database.strategy === "supabase") {
    server.push({ name: "SUPABASE_URL", zodType: "z.string().url()" });
    server.push({ name: "SUPABASE_ANON_KEY", zodType: "z.string().min(1)" });
    server.push({ name: "SUPABASE_SERVICE_ROLE_KEY", zodType: "z.string().min(1)" });
    client.push({ name: "NEXT_PUBLIC_SUPABASE_URL", zodType: "z.string().url()" });
    client.push({ name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", zodType: "z.string().min(1)" });
  } else if (preset.database.strategy === "drizzle" || preset.database.strategy === "prisma") {
    server.push({ name: "DATABASE_URL", zodType: "z.string().url()" });
  }

  // Auth
  if (preset.auth.provider === "clerk") {
    server.push({ name: "CLERK_SECRET_KEY", zodType: "z.string().min(1)" });
    client.push({ name: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", zodType: "z.string().min(1)" });
  }

  // Integrations
  if (preset.integrations.errorTracking === "sentry") {
    server.push({ name: "SENTRY_DSN", zodType: "z.string().url()" });
  }
  if (preset.integrations.analytics === "posthog") {
    client.push({ name: "NEXT_PUBLIC_POSTHOG_KEY", zodType: "z.string().min(1)" });
    client.push({ name: "NEXT_PUBLIC_POSTHOG_HOST", zodType: "z.string().url()" });
  }
  if (preset.integrations.email === "react-email-resend") {
    server.push({ name: "RESEND_API_KEY", zodType: "z.string().min(1)" });
    server.push({ name: "EMAIL_FROM", zodType: "z.string().email()" });
  } else if (preset.integrations.email === "nodemailer") {
    server.push({ name: "SMTP_HOST", zodType: "z.string().min(1)" });
    server.push({ name: "SMTP_PORT", zodType: "z.string().min(1)" });
    server.push({ name: "SMTP_USER", zodType: "z.string().min(1)" });
    server.push({ name: "SMTP_PASS", zodType: "z.string().min(1)" });
  }
  if (preset.integrations.rateLimit === "upstash") {
    server.push({ name: "UPSTASH_REDIS_REST_URL", zodType: "z.string().url()" });
    server.push({ name: "UPSTASH_REDIS_REST_TOKEN", zodType: "z.string().min(1)" });
  }
  if (preset.integrations.ai === "vercel-ai-sdk") {
    server.push({ name: "OPENAI_API_KEY", zodType: "z.string().min(1)" });
  }

  return { server, client };
}

function resolveTypescriptConfigPackage(preset: Preset, base: string): FileTreeNode[] {
  const nodes: FileTreeNode[] = [];
  const scope = preset.basics.scope;
  const strict = preset.basics.typescript === "strict";

  // package.json
  nodes.push({
    path: `${base}/package.json`,
    content: JSON.stringify(
      {
        name: `${scope}/typescript-config`,
        version: "0.1.0",
        private: true,
        exports: {
          "./base.json": "./base.json",
          "./react.json": "./react.json",
          "./nextjs.json": "./nextjs.json",
          "./library.json": "./library.json",
        },
      },
      null,
      2,
    ),
    isDirectory: false,
  });

  // base.json
  nodes.push({
    path: `${base}/base.json`,
    content: JSON.stringify(
      {
        $schema: "https://json.schemastore.org/tsconfig",
        compilerOptions: {
          target: "ES2022",
          module: "ES2022",
          moduleResolution: "bundler",
          declaration: true,
          declarationMap: true,
          sourceMap: true,
          strict,
          esModuleInterop: true,
          skipLibCheck: true,
          isolatedModules: true,
          resolveJsonModule: true,
        },
      },
      null,
      2,
    ),
    isDirectory: false,
  });

  // library.json
  nodes.push({
    path: `${base}/library.json`,
    content: JSON.stringify(
      { extends: "./base.json", compilerOptions: { lib: ["ES2022"] } },
      null,
      2,
    ),
    isDirectory: false,
  });

  // react.json
  nodes.push({
    path: `${base}/react.json`,
    content: JSON.stringify(
      {
        extends: "./base.json",
        compilerOptions: { jsx: "react-jsx", lib: ["ES2022", "DOM", "DOM.Iterable"] },
      },
      null,
      2,
    ),
    isDirectory: false,
  });

  // nextjs.json
  nodes.push({
    path: `${base}/nextjs.json`,
    content: JSON.stringify(
      {
        extends: "./base.json",
        compilerOptions: {
          jsx: "preserve",
          lib: ["ES2022", "DOM", "DOM.Iterable"],
          module: "esnext",
          noEmit: true,
          incremental: true,
          plugins: [{ name: "next" }],
        },
      },
      null,
      2,
    ),
    isDirectory: false,
  });

  return nodes;
}
