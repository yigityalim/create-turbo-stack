import { renderSourceFiles } from "../render/render-source";
import { VERSIONS } from "../wiring/versions";
import { defineIntegration } from "./types";

export const sentry = defineIntegration({
  category: "errorTracking",
  provider: "sentry",
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

export const errorTrackingIntegrations = [sentry];
