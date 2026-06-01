# analytics / plausible

Privacy-first, cookie-less analytics backed by the Plausible Events API. No npm dependencies — server-side tracking uses `fetch`, client-side tracking uses the script Plausible injects. Runs in Node 20+, Vercel/Cloudflare Edge, and browsers without modification. Compatible with GDPR and KVKK by design: no cookies, no cross-site tracking, no personal data stored.

**Server-side vs client-side:**
- **Client-side** (`plausibleScriptProps` + `trackClientEvent`): pageviews and UI interactions. Fires from the user's browser. Blocked by ad-blockers unless you use the proxy option.
- **Server-side** (`trackEvent`): critical conversions, purchases, signups. Cannot be blocked. More reliable for accuracy.

**UA and IP forwarding are required for server-side tracking.** Plausible derives the unique visitor ID from `User-Agent` and `X-Forwarded-For`. If you send a CDN or server IP instead of the actual visitor's IP, Plausible's bot filter silently drops the event — it still returns HTTP 202 but sets `x-plausible-dropped: 1` in the response headers. Always forward the real visitor's `User-Agent` and IP from your incoming request. Use `X-Debug-Request: true` to confirm which IP Plausible is receiving.

**Ad-blocker proxy:** Plausible's domain is blocked by many privacy browsers and ad-blockers. Set `proxyApiPath` in `plausibleScriptProps` and add a server route that forwards `/api/event` requests to Plausible. This serves the script and Events API from your own domain.

**Self-hosting:** Set `PLAUSIBLE_API_HOST` to your Plausible Community Edition URL. Leave it at the default (`https://plausible.io`) for the cloud version.

**Custom events** must be registered as goals in your Plausible dashboard before they appear in reports. Go to Site Settings → Goals → Add Goal.

```ts
// Server-side: track a conversion from a route handler or server action
import { trackEvent } from "{{scope}}/analytics";

export async function POST(request: Request) {
  const result = await processSignup(request);

  // Forward real visitor headers — never use server/CDN IPs here
  await trackEvent({
    name: "Signup",
    url: "https://yourapp.com/signup",
    userAgent: request.headers.get("user-agent") ?? "",
    clientIp: request.headers.get("x-forwarded-for") ?? "",
    props: { plan: result.plan },
  });

  return Response.json(result);
}
```

```tsx
// Client-side: load the tracking script (Next.js example)
import Script from "next/script";
import { plausibleScriptProps } from "{{scope}}/analytics";

export default function Layout({ children }) {
  return (
    <html>
      <head>
        <Script {...plausibleScriptProps({
          // Optional: proxy through your domain to bypass ad-blockers
          proxyApiPath: "/api/stats/event",
        })} />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

```ts
// Client-side: fire a custom event from a button click
import { trackClientEvent } from "{{scope}}/analytics";

function onUpgradeClick() {
  trackClientEvent("Upgrade", { from: "free", to: "pro" });
  router.push("/upgrade");
}
```
