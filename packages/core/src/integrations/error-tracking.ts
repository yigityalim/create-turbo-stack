import { renderSourceFiles } from "../render/render-source";
import { VERSIONS } from "../wiring/versions";
import { defineIntegration } from "./types";

export const sentry = defineIntegration({
  category: "errorTracking",
  provider: "sentry",
  label: "Sentry error tracking",
  catalogEntries: () => [{ name: "@sentry/nextjs", version: VERSIONS.sentryNextjs }],
  envVars: () => ({
    server: [
      {
        name: "SENTRY_DSN",
        zodType: "z.string().url()",
        example: "https://xxx@sentry.io/xxx",
        description: "Sentry DSN",
      },
    ],
  }),
  resolvePackageFiles: (_preset, ctx) => [
    ...ctx.makeBase({ deps: { "@sentry/nextjs": "catalog:", ...ctx.env.workspaceDep } }),
    ...renderSourceFiles("integration/monitoring/sentry", ctx.base, { ...ctx.env.context }),
  ],
});

export const bugsnag = defineIntegration({
  category: "errorTracking",
  provider: "bugsnag",
  label: "Bugsnag error tracking",
  catalogEntries: () => [{ name: "@bugsnag/js", version: VERSIONS.bugsnagJs }],
  envVars: () => ({
    server: [
      {
        name: "BUGSNAG_API_KEY",
        zodType: "z.string().min(1)",
        example: "abcdef1234567890abcdef1234567890",
        description: "Bugsnag project API key",
      },
    ],
  }),
  resolvePackageFiles: (_preset, ctx) => [
    ...ctx.makeBase({ deps: { "@bugsnag/js": "catalog:", ...ctx.env.workspaceDep } }),
    ...renderSourceFiles("integration/monitoring/bugsnag", ctx.base, { ...ctx.env.context }),
  ],
});

export const errorTrackingIntegrations = [sentry, bugsnag];
