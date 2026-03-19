import path from "node:path";
import type { Database } from "@create-turbo-stack/schema";
import type { Detection } from "../types";
import { hasDep, readPackageJson } from "../utils/dep-scanner";
import { fileExists, readFileIfExists } from "../utils/file-scanner";

export async function detectDatabase(root: string): Promise<Detection<Database>> {
  const dbDir = path.join(root, "packages", "db");
  const pkg = await readPackageJson(dbDir);

  // Check for Drizzle
  if (pkg && hasDep(pkg, "drizzle-orm")) {
    const driver = await detectDrizzleDriver(dbDir, pkg);
    return {
      value: { strategy: "drizzle", driver } as Database,
      confidence: "certain",
      reason: "drizzle-orm found in packages/db",
    };
  }

  // Check for drizzle config in root
  if (await fileExists(path.join(root, "drizzle.config.ts"))) {
    return {
      value: { strategy: "drizzle", driver: "postgres" } as Database,
      confidence: "high",
      reason: "drizzle.config.ts found in root",
    };
  }

  // Check for Prisma
  if (pkg && (hasDep(pkg, "@prisma/client") || hasDep(pkg, "prisma"))) {
    return {
      value: { strategy: "prisma" } as Database,
      confidence: "certain",
      reason: "prisma found in packages/db",
    };
  }
  if (
    (await fileExists(path.join(root, "prisma", "schema.prisma"))) ||
    (await fileExists(path.join(dbDir, "prisma", "schema.prisma")))
  ) {
    return {
      value: { strategy: "prisma" } as Database,
      confidence: "certain",
      reason: "schema.prisma found",
    };
  }

  // Check for Supabase
  if (pkg && hasDep(pkg, "@supabase/supabase-js")) {
    return {
      value: { strategy: "supabase" } as Database,
      confidence: "certain",
      reason: "@supabase/supabase-js found",
    };
  }

  // Check root package.json
  const rootPkg = await readPackageJson(root);
  if (rootPkg) {
    if (hasDep(rootPkg, "drizzle-orm")) {
      return {
        value: { strategy: "drizzle", driver: "postgres" } as Database,
        confidence: "high",
        reason: "drizzle-orm in root deps",
      };
    }
    if (hasDep(rootPkg, "@prisma/client")) {
      return {
        value: { strategy: "prisma" } as Database,
        confidence: "high",
        reason: "@prisma/client in root deps",
      };
    }
    if (hasDep(rootPkg, "@supabase/supabase-js")) {
      return {
        value: { strategy: "supabase" } as Database,
        confidence: "high",
        reason: "@supabase/supabase-js in root deps",
      };
    }
  }

  return {
    value: { strategy: "none" } as Database,
    confidence: "medium",
    reason: "No database detected",
  };
}

async function detectDrizzleDriver(
  dbDir: string,
  pkg: NonNullable<Awaited<ReturnType<typeof readPackageJson>>>,
): Promise<string> {
  // Check for driver-specific packages
  if (hasDep(pkg, "postgres") || hasDep(pkg, "@neondatabase/serverless") || hasDep(pkg, "pg")) {
    return "postgres";
  }
  if (hasDep(pkg, "mysql2")) return "mysql";
  if (hasDep(pkg, "better-sqlite3") || hasDep(pkg, "@libsql/client")) return "sqlite";

  // Check drizzle.config.ts for dialect
  const config = await readFileIfExists(path.join(dbDir, "drizzle.config.ts"));
  if (config) {
    if (config.includes('"postgresql"') || config.includes("'postgresql'")) return "postgres";
    if (config.includes('"mysql"') || config.includes("'mysql'")) return "mysql";
    if (config.includes('"sqlite"') || config.includes("'sqlite'")) return "sqlite";
  }

  return "postgres"; // Default
}
