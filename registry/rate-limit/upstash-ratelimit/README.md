# rate-limit / upstash-ratelimit

Framework-agnostic rate limiting backed by Upstash Redis. The core layer works with any environment that supports the Fetch API (`Request`/`Response`) — Node 20+, Vercel/Cloudflare Edge, and browser workers. Framework-specific adapters (Next.js middleware, Hono middleware, SvelteKit handle hook) live at separate export paths so their dependencies stay isolated.

The package maintains its own Redis client using `env.UPSTASH_REDIS_REST_URL` and `env.UPSTASH_REDIS_REST_TOKEN` from your env layer — not `Redis.fromEnv()`, which reads `process.env` directly and bypasses your application's env validation.

**Algorithm selection:**
- `Ratelimit.slidingWindow(n, "10 s")` — smooth limiting, no boundary stampede. Costs 2 Redis commands per request. Start here.
- `Ratelimit.fixedWindow(n, "10 s")` — cheaper (1 Redis command), but up to 2× the configured rate is possible at window boundaries.
- `Ratelimit.tokenBucket(n, "10 s", burst)` — allows short bursts up to `burst` while enforcing a long-term average.

**IP security:** Do not rely on the leftmost `X-Forwarded-For` value for rate-limiting decisions — it is entirely user-controlled and trivially spoofed. `getClientIdentifier` prefers `CF-Connecting-IP` (Cloudflare) and `True-Client-IP`, then uses XFF only when `trustedProxyCount` is explicitly set to count from the right (skipping client-controlled entries). The SvelteKit adapter uses `event.getClientAddress()` which is resolved by the adapter and is reliable.

**`pending` and `waitUntil`:** When analytics or multi-region sync is enabled, Upstash completes these operations asynchronously after returning the limit result. On Vercel Edge and Cloudflare Workers, the runtime shuts down when the response is sent — call `context.waitUntil(result.pending)` or `event.waitUntil(result.pending)` to keep it alive. The Next.js adapter does this automatically.

```ts
// (a) Generic Web handler
import { createRateLimiter, limitRequest, Ratelimit } from "{{scope}}/rate-limit";

const ratelimiter = createRateLimiter({
  limiter: Ratelimit.slidingWindow(10, "10 s"),
  analytics: true,
});

export async function handler(request: Request, ctx: ExecutionContext): Promise<Response> {
  const { result, response } = await limitRequest(ratelimiter, request);
  ctx.waitUntil(result.pending);
  return response ?? new Response("OK");
}
```

```ts
// (b) Next.js middleware
import { nextRateLimit } from "{{scope}}/rate-limit/next";
import { ratelimiter } from "@/lib/ratelimit"; // createRateLimiter(...) called outside handler

export const middleware = nextRateLimit(ratelimiter);
export const config = { matcher: ["/api/:path*"] };
```

```ts
// (c) Hono
import { honoRateLimit } from "{{scope}}/rate-limit/hono";
import { ratelimiter } from "@/lib/ratelimit";

app.use("/api/*", honoRateLimit(ratelimiter));
```

```ts
// (d) SvelteKit src/hooks.server.ts
import { svelteKitRateLimit } from "{{scope}}/rate-limit/sveltekit";
import { ratelimiter } from "$lib/ratelimit";

export const handle = svelteKitRateLimit(ratelimiter);
```

Install the adapter's peer dependency only for the framework you use — `next`, `hono`, or `@sveltejs/kit` are optional peers.
