import type { App, Package, Preset } from "@create-turbo-stack/schema";
import { IntegrationsSchema } from "@create-turbo-stack/schema";

export function makePreset(overrides: Partial<Preset> = {}): Preset {
  return {
    schemaVersion: "1.0",
    name: "test",
    version: "1.0.0",
    basics: {
      projectName: "test-project",
      packageManager: "bun",
      scope: "@test",
      typescript: "strict",
      linter: "biome",
      gitInit: false,
    },
    database: { strategy: "none" },
    api: { strategy: "none" },
    auth: { provider: "none", rbac: false, entitlements: false },
    css: { framework: "tailwind4", ui: "none", styling: "css-variables" },
    // Derived from the schema so every new integration field flows in with
    // its declared default — no hand-list to keep in sync.
    integrations: IntegrationsSchema.parse({ envValidation: "none" }),
    apps: [],
    packages: [],
    ...overrides,
  } as Preset;
}

export const WEB_APP: App = {
  name: "web",
  type: "nextjs",
  location: "apps",
  port: 3000,
  i18n: false,
  consumes: [],
};

export const UI_PKG: Package = {
  name: "ui",
  type: "ui",
  location: "packages",
  producesCSS: true,
  exports: ["."],
};

export const UTILS_PKG: Package = {
  name: "utils",
  type: "utils",
  location: "packages",
  producesCSS: false,
  exports: ["."],
};

/** Full SaaS preset — every toggle on */
export function makeFullPreset(): Preset {
  return makePreset({
    basics: {
      projectName: "saas-app",
      packageManager: "pnpm",
      scope: "@saas",
      typescript: "strict",
      linter: "biome",
      gitInit: true,
    },
    database: { strategy: "drizzle", driver: "postgres" },
    api: { strategy: "trpc", version: "v11" },
    auth: { provider: "clerk", rbac: false, entitlements: false },
    css: { framework: "tailwind4", ui: "shadcn", styling: "css-variables" },
    integrations: IntegrationsSchema.parse({
      analytics: "posthog",
      errorTracking: "sentry",
      email: "resend",
      rateLimit: "upstash",
      ai: "vercel-ai-sdk",
      cache: "upstash",
      envValidation: "t3-env",
    }),
    apps: [
      {
        name: "web",
        type: "nextjs",
        location: "apps",
        port: 3000,
        i18n: true,
        consumes: ["ui"],
      },
      {
        name: "mobile",
        type: "expo",
        location: "apps",
        port: 8081,
        i18n: false,
        consumes: [],
      },
    ],
    packages: [UI_PKG, UTILS_PKG],
  });
}
