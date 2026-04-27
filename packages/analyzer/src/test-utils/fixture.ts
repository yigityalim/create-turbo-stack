import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

/**
 * Creates a temporary directory populated with the given file tree.
 * Keys are relative paths, values are file contents (strings or JSON-serializable objects).
 */
export async function createFixture(files: Record<string, string | object>): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "analyzer-test-"));
  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(dir, filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    const data = typeof content === "string" ? content : JSON.stringify(content, null, 2);
    await fs.writeFile(fullPath, data, "utf-8");
  }
  return dir;
}

export async function removeFixture(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true });
}

// Canonical package.json builders — reused across multiple test files

export function pkgWith(
  deps: Record<string, string> = {},
  devDeps: Record<string, string> = {},
  extra: object = {},
): object {
  return {
    name: "@test/pkg",
    version: "0.0.0",
    dependencies: deps,
    devDependencies: devDeps,
    ...extra,
  };
}

export function workspacePkg(
  name: string,
  deps: Record<string, string> = {},
  devDeps: Record<string, string> = {},
  scripts: Record<string, string> = {},
): object {
  return {
    name,
    version: "0.0.0",
    dependencies: deps,
    devDependencies: devDeps,
    scripts,
  };
}

// Preset fixture builders — canonical monorepo structures

/**
 * Minimal monorepo: bun, biome, Next.js app, no database/auth/api.
 */
export const MINIMAL_FIXTURE: Record<string, string | object> = {
  "package.json": {
    name: "@minimal/root",
    private: true,
    workspaces: ["apps/*", "packages/*"],
  },
  "bun.lock": "",
  "biome.json": { formatter: { enabled: true } },
  "tsconfig.json": { compilerOptions: { strict: true } },
  "apps/web/package.json": workspacePkg(
    "@minimal/web",
    {
      next: "15.0.0",
      react: "19.0.0",
      "react-dom": "19.0.0",
      tailwindcss: "^4.0.0",
    },
    {},
    { dev: "next dev -p 3000" },
  ),
  "apps/web/components.json": JSON.stringify({ style: "default" }),
};

/**
 * Full SaaS monorepo: pnpm, biome, Next.js + Expo, tRPC, Drizzle/postgres,
 * Supabase auth, shadcn, Sentry, PostHog, Resend, Upstash, Vercel AI SDK.
 */
export const SAAS_FULL_FIXTURE: Record<string, string | object> = {
  "package.json": {
    name: "@saas/root",
    private: true,
    workspaces: ["apps/*", "packages/*"],
  },
  "pnpm-lock.yaml": "",
  "biome.json": {},
  "tsconfig.json": { compilerOptions: { strict: true } },

  "apps/web/package.json": workspacePkg(
    "@saas/web",
    {
      next: "15.0.0",
      react: "19.0.0",
      "react-dom": "19.0.0",
      tailwindcss: "^4.0.0",
      "next-intl": "^3.0.0",
      "@sentry/nextjs": "^8.0.0",
      posthog: "^1.0.0",
    },
    {},
    { dev: "next dev -p 3000" },
  ),
  "apps/web/components.json": JSON.stringify({ style: "default" }),
  "apps/mobile/package.json": workspacePkg(
    "@saas/mobile",
    { expo: "~52.0.0" },
    {},
    { start: "expo start" },
  ),

  "packages/api/package.json": workspacePkg("@saas/api", {
    "@trpc/server": "^11.0.0",
  }),
  "packages/db/package.json": workspacePkg("@saas/db", {
    "drizzle-orm": "^0.38.0",
    postgres: "^3.4.0",
    "@supabase/ssr": "^0.5.0",
  }),
  "packages/auth/package.json": workspacePkg("@saas/auth", {
    "@clerk/nextjs": "^5.0.0",
  }),
  "packages/ui/package.json": workspacePkg("@saas/ui", {
    react: "19.0.0",
    tailwindcss: "^4.0.0",
  }),
  "packages/analytics/package.json": workspacePkg("@saas/analytics", {
    "posthog-js": "^1.0.0",
    resend: "^3.0.0",
    "@upstash/ratelimit": "^2.0.0",
    ai: "^4.0.0",
    "@t3-oss/env-nextjs": "^0.10.0",
  }),
};

/**
 * API-only: no frontend, Hono standalone, Drizzle + SQLite, better-auth.
 */
export const API_ONLY_FIXTURE: Record<string, string | object> = {
  "package.json": {
    name: "@api/root",
    private: true,
    workspaces: ["apps/*", "packages/*"],
  },
  "pnpm-lock.yaml": "",
  "biome.json": {},
  "tsconfig.json": { compilerOptions: { strict: false } },

  "apps/server/package.json": workspacePkg(
    "@api/server",
    { hono: "^4.0.0", "@hono/node-server": "^1.0.0" },
    {},
    { dev: "node --watch src/index.js" },
  ),

  "packages/api/package.json": workspacePkg("@api/api", { hono: "^4.0.0" }),
  "packages/db/package.json": workspacePkg("@api/db", {
    "drizzle-orm": "^0.38.0",
    "better-sqlite3": "^9.0.0",
  }),
  "packages/db/drizzle.config.ts": `export default { dialect: 'sqlite', schema: './src/schema.ts' }`,
  "packages/auth/package.json": workspacePkg("@api/auth", {
    "better-auth": "^1.0.0",
  }),
};
