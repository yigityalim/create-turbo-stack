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
});

export const errorTrackingIntegrations = [sentry];
