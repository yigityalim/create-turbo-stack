# analytics / vercel-analytics

Vercel Web Analytics — privacy-friendly, real-time page view and custom event tracking. Unlike other analytics variants, this package requires **no environment variables** and no API keys. Enable Web Analytics from the Vercel project dashboard; the tracking script is served automatically by Vercel's infrastructure on deploy.

This package wraps `@vercel/analytics` with the common `trackEvent`/`trackClientEvent` naming convention so swapping analytics providers requires no changes to call sites — only the installed slot variant changes.

**Limitation:** only works on Vercel-hosted deployments. For self-hosted or non-Vercel platforms, use `analytics/plausible` or `analytics/posthog`.

**Server-side tracking** (`trackEvent`) requires a Vercel Web Analytics **Pro or Enterprise** plan. Client-side tracking and the `<Analytics />` component are available on all plans.

**`data` constraints:** property values must be `string | number | boolean | null`. Nested objects are not accepted by Vercel and are rejected at the type level. Each value is limited to 255 characters. Custom events must be registered as goals in the Vercel Analytics dashboard to appear in reports.

**Dev mode:** tracking is automatically disabled in development (`NODE_ENV !== 'production'`). No configuration needed.

```tsx
// React (Next.js App Router) — add once to your root layout
import { Analytics } from "{{scope}}/analytics/react";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

```ts
// Client-side custom event — from a button handler or client component
import { trackClientEvent } from "{{scope}}/analytics";

function onUpgrade() {
  trackClientEvent("Upgrade", { from: "free", to: "pro" });
}
```

```ts
// Server-side event — Route Handler or Server Action (Pro/Enterprise)
import { trackEvent } from "{{scope}}/analytics";

export async function POST(request: Request) {
  const result = await processCheckout(request);
  await trackEvent("Purchase", { plan: result.plan, amount: result.amount }, {
    headers: request.headers, // pass headers for accurate attribution
  });
  return Response.json(result);
}
```

```ts
// Non-React frameworks — inject manually (SvelteKit, vanilla)
import { inject } from "{{scope}}/analytics";

inject({ beforeSend(event) {
  // Drop events for private routes
  if (event.url.includes("/admin")) return null;
  return event;
}});
```
