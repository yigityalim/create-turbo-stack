import type { App, Package, Preset } from "@create-turbo-stack/schema";

export function makePreset(overrides: Partial<Preset> = {}): Preset {
  return {
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
    integrations: {
      analytics: "none",
      errorTracking: "none",
      email: "none",
      rateLimit: "none",
      ai: "none",
      envValidation: false,
    },
    apps: [],
    packages: [],
    ...overrides,
  } as Preset;
}

export const WEB_APP: App = {
  name: "web",
  type: "nextjs",
  port: 3000,
  i18n: false,
  cms: "none",
  consumes: [],
};

export const UI_PKG: Package = {
  name: "ui",
  type: "ui",
  producesCSS: true,
  exports: ["."],
};

export const UTILS_PKG: Package = {
  name: "utils",
  type: "utils",
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
    integrations: {
      analytics: "posthog",
      errorTracking: "sentry",
      email: "react-email-resend",
      rateLimit: "upstash",
      ai: "vercel-ai-sdk",
      envValidation: true,
    },
    apps: [
      {
        name: "web",
        type: "nextjs",
        port: 3000,
        i18n: true,
        cms: "none",
        consumes: ["ui"],
      },
      {
        name: "mobile",
        type: "expo",
        port: 8081,
        i18n: false,
        cms: "none",
        consumes: [],
      },
    ],
    packages: [UI_PKG, UTILS_PKG],
  });
}
