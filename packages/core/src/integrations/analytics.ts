import { renderSourceFiles } from "../render/render-source";
import { VERSIONS } from "../wiring/versions";
import { defineIntegration } from "./types";

export const posthog = defineIntegration({
  category: "analytics",
  provider: "posthog",
  catalogEntries: () => [
    { name: "posthog-js", version: VERSIONS.posthogJs },
    { name: "posthog-node", version: VERSIONS.posthogNode },
    // PostHog ships a React provider; ensure the React toolchain is in
    // the catalog even for presets without a React app.
    { name: "react", version: VERSIONS.react },
    { name: "react-dom", version: VERSIONS.reactDom },
    { name: "@types/react", version: VERSIONS.typesReact },
    { name: "@types/react-dom", version: VERSIONS.typesReactDom },
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
  // Ships a React provider component (provider.tsx), so it needs the
  // JSX tsconfig + React deps.
  resolvePackageFiles: (_preset, ctx) => [
    ...ctx.makeBase({
      deps: {
        "posthog-js": "catalog:",
        "posthog-node": "catalog:",
        react: "catalog:",
        "react-dom": "catalog:",
      },
      react: true,
    }),
    ...renderSourceFiles("integration/analytics/posthog", ctx.base, {}),
  ],
});

export const vercelAnalytics = defineIntegration({
  category: "analytics",
  provider: "vercel-analytics",
  catalogEntries: () => [{ name: "@vercel/analytics", version: VERSIONS.vercelAnalytics }],
  resolvePackageFiles: (_preset, ctx) => [
    ...ctx.makeBase({ deps: { "@vercel/analytics": "catalog:" } }),
    ...renderSourceFiles("integration/analytics/vercel-analytics", ctx.base, {}),
  ],
});

export const plausible = defineIntegration({
  category: "analytics",
  provider: "plausible",
  catalogEntries: () => [],
  resolvePackageFiles: (_preset, ctx) => [
    ...ctx.makeBase(),
    ...renderSourceFiles("integration/analytics/plausible", ctx.base, {}),
  ],
});

export const analyticsIntegrations = [posthog, vercelAnalytics, plausible];
