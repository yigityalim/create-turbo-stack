import { VERSIONS } from "../wiring/versions";
import { defineIntegration } from "./types";

export const posthog = defineIntegration({
  category: "analytics",
  provider: "posthog",
  catalogEntries: () => [
    { name: "posthog-js", version: VERSIONS.posthogJs },
    { name: "posthog-node", version: VERSIONS.posthogNode },
  ],
  envVars: () => ({
    client: [
      {
        name: "NEXT_PUBLIC_POSTHOG_KEY",
        zodType: "z.string().min(1)",
        example: "phc_...",
        description: "PostHog project API key",
      },
      {
        name: "NEXT_PUBLIC_POSTHOG_HOST",
        zodType: "z.string().url()",
        example: "https://us.i.posthog.com",
        description: "PostHog host",
      },
    ],
  }),
});

export const vercelAnalytics = defineIntegration({
  category: "analytics",
  provider: "vercel-analytics",
  catalogEntries: () => [{ name: "@vercel/analytics", version: VERSIONS.vercelAnalytics }],
});

export const plausible = defineIntegration({
  category: "analytics",
  provider: "plausible",
  catalogEntries: () => [],
});

export const analyticsIntegrations = [posthog, vercelAnalytics, plausible];
