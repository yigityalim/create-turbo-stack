/**
 * Default preset for the builder's initial state.
 * Also used for "Reset" action.
 */
import type { Preset } from "@create-turbo-stack/schema";

export const DEFAULT_PRESET: Preset = {
  schemaVersion: "1.0",
  name: "my-turborepo",
  version: "1.0.0",
  description: "",

  basics: {
    projectName: "my-turborepo",
    packageManager: "bun",
    scope: "@my-org",
    typescript: "strict",
    linter: "biome",
    gitInit: true,
  },

  database: { strategy: "none" },
  api: { strategy: "none" },
  auth: { provider: "none", rbac: false, entitlements: false },

  css: {
    framework: "tailwind4",
    ui: "none",
    styling: "css-variables",
  },

  integrations: {
    analytics: "none",
    errorTracking: "none",
    email: "none",
    rateLimit: "none",
    ai: "none",
    envValidation: true,
  },

  apps: [
    {
      name: "web",
      type: "nextjs",
      port: 3000,
      i18n: false,
      cms: "none",
      consumes: [],
    },
  ],

  packages: [],
};

/** Built-in presets available in the builder dropdown. */
export const BUILTIN_PRESETS: {
  id: string;
  name: string;
  description: string;
  preset: Preset;
}[] = [
  {
    id: "minimal",
    name: "Minimal",
    description: "Next.js + Tailwind 4 + Biome — bare minimum monorepo",
    preset: DEFAULT_PRESET,
  },
  {
    id: "saas-starter",
    name: "SaaS Starter",
    description: "Next.js + Supabase + tRPC + shadcn + i18n",
    preset: {
      schemaVersion: "1.0",
      name: "saas-starter",
      version: "1.0.0",
      description: "Full-stack SaaS starter with Supabase",

      basics: {
        projectName: "saas-starter",
        packageManager: "bun",
        scope: "@saas",
        typescript: "strict",
        linter: "biome",
        gitInit: true,
      },

      database: { strategy: "supabase" },
      api: { strategy: "trpc", version: "v11" },
      auth: { provider: "supabase-auth", rbac: true, entitlements: false },

      css: {
        framework: "tailwind4",
        ui: "shadcn",
        styling: "css-variables",
      },

      integrations: {
        analytics: "posthog",
        errorTracking: "sentry",
        email: "react-email-resend",
        rateLimit: "none",
        ai: "none",
        envValidation: true,
      },

      apps: [
        {
          name: "web",
          type: "nextjs",
          port: 3000,
          i18n: true,
          cms: "none",
          consumes: [],
        },
      ],

      packages: [
        {
          name: "ui",
          type: "ui",
          producesCSS: true,
          exports: ["."],
        },
      ],
    },
  },
  {
    id: "api-only",
    name: "API Only",
    description: "Hono standalone + Drizzle + PostgreSQL — no frontend",
    preset: {
      schemaVersion: "1.0",
      name: "api-only",
      version: "1.0.0",
      description: "API-only monorepo with Hono and Drizzle",

      basics: {
        projectName: "api-only",
        packageManager: "bun",
        scope: "@api",
        typescript: "strict",
        linter: "biome",
        gitInit: true,
      },

      database: { strategy: "drizzle", driver: "postgres" },
      api: { strategy: "hono", mode: "standalone-app" },
      auth: { provider: "better-auth", rbac: false, entitlements: false },

      css: {
        framework: "vanilla",
        ui: "none",
        styling: "static",
      },

      integrations: {
        analytics: "none",
        errorTracking: "none",
        email: "none",
        rateLimit: "upstash",
        ai: "none",
        envValidation: true,
      },

      apps: [
        {
          name: "api",
          type: "hono-standalone",
          port: 4000,
          i18n: false,
          cms: "none",
          consumes: [],
        },
      ],

      packages: [],
    },
  },
];
