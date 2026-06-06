# analytics / posthog

PostHog server-side event capture, feature flags, and an optional browser client. Backed by `posthog-node` on the server. Set `POSTHOG_HOST` to `https://eu.i.posthog.com` for EU data residency (required for KVKK/GDPR compliance with EU-located users) or your self-hosted PostHog instance.

**Critical: serverless data loss prevention.** PostHog Node uses an internal async queue. In short-lived environments (Next.js App Router, Vercel Functions, Cloudflare Workers), the runtime terminates as soon as your response is sent — the queue may not have flushed yet, causing events to be silently lost. This package uses three layers of protection:

1. `flushAt: 1` + `flushInterval: 0` — queue flushes on every event with no delay
2. `captureImmediate` (not `capture`) — starts the HTTP request synchronously; `capture` is still async even with the above settings
3. `shutdownAnalytics()` — waits for all in-flight requests to complete

Always call `shutdownAnalytics()` after your handler logic, via `after()` (Next.js 15.1+) or `ctx.waitUntil()` (Cloudflare/Vercel older).

**Client-side** (`./client`): `posthog-js` is an optional peer dependency. Install it only if you need browser tracking. Server-only usage requires no additional packages.

**Variant swap:** uses the same `trackEvent` function name as `analytics/plausible`. Switching providers requires no changes to call sites — only the installed slot variant changes.

```ts
// Server-side event — Route Handler or Server Action
import { trackEvent, shutdownAnalytics } from "{{scope}}/analytics";
import { after } from "next/server";

export async function POST(request: Request) {
  const result = await processSignup(request);

  const { pending } = await trackEvent({
    distinctId: result.userId,
    event: "Signup",
    properties: { plan: result.plan },
  });

  // Ensure delivery after response is sent (Next.js 15.1+)
  after(() => Promise.all([pending, shutdownAnalytics()]));
  return Response.json(result);
}
```

```ts
// Server-side feature flag
import { isFeatureEnabled } from "{{scope}}/analytics";

const showNewCheckout = await isFeatureEnabled("new-checkout", userId);
if (showNewCheckout) {
  // render new checkout UI
}
```

```ts
// Client-side (requires: npm install posthog-js)
import { initPosthog, trackClientEvent } from "{{scope}}/analytics/client";

// In your root layout or _app:
initPosthog({
  apiProxyPath: "/ingest", // optional: proxy to bypass ad-blockers
});

// In a component:
function onUpgrade() {
  trackClientEvent("Upgrade Clicked", { from: "pricing-page" });
}
```
