# cache / upstash-redis

Read-through caching, stale-while-revalidate, tag-based group invalidation, TTL jitter, negative caching, namespace isolation, and pipeline batch operations — backed by Upstash Redis and designed for serverless and edge environments. Requires only the Fetch API; runs unmodified in Node 20+, Vercel/Cloudflare Edge, and modern browsers. Uses its own Redis client from the env layer — not a shared connection from another package, because cache and rate-limit are independent concerns with different keys and TTL strategies.

**When to use each function:**
- `cached` — simple read-through for most use cases. Enable `cacheNull` for non-existent records to prevent cache penetration.
- `cachedFlexible` — stale-while-revalidate for hot keys where slight staleness is acceptable and latency matters most. Pass `pending` to `waitUntil`.
- `cachedWithTags` + `invalidateTag` — group invalidation: tag all cache keys for a user or entity, then flush them all with one call on update.
- `mget` / `mset` — batch operations. Upstash REST costs ~30ms per round trip; reading 20 keys individually = 600ms; `mget` reads all 20 in one call.
- `createCache(namespace)` — scoped API that prefixes all keys. Prevents collision between feature areas or tenants in a shared Redis instance.

**Why no distributed lock or single-flight?** In serverless environments, a busy-wait lock is a billing trap: the function pays for execution time while spinning, and if it crashes mid-lock the key stays locked until TTL expiry. TTL jitter (±10% random deviation) distributes stampede risk across time. SWR (`cachedFlexible`) serves stale data while refreshing in the background, so only one caller per staleness window pays the origin cost. Negative caching (`cacheNull: true`) prevents repeated penetration for non-existent records. These three together handle the stampede problem without any lock.

**`pending` and `waitUntil`:** `cachedFlexible` returns `pending` — a Promise that resolves when the background refresh write completes. In edge runtimes (Vercel, Cloudflare Workers), the runtime shuts down when the response is sent. If you do not call `context.waitUntil(pending)`, the refresh Promise is abandoned mid-flight, the stale entry persists, and the next request must fetch fresh again.

```ts
// Simple read-through
import { cached } from "{{scope}}/cache";

const user = await cached("user:42", 300, () => db.users.findById(42));
```

```ts
// Negative caching — avoids DB hit for every lookup of a deleted record
import { cached } from "{{scope}}/cache";

const post = await cached("post:99", 300, fetchPost, {
  cacheNull: true,
  nullTtlSeconds: 60,
});
```

```ts
// SWR — serve stale immediately, refresh in background
import { cachedFlexible } from "{{scope}}/cache";

export async function GET(req: Request, ctx: ExecutionContext) {
  const { value, pending } = await cachedFlexible(
    "leaderboard",
    [30, 300],    // fresh for 30s, serve stale up to 300s
    fetchLeaderboard,
  );
  ctx.waitUntil(pending); // keep runtime alive for background refresh
  return Response.json(value);
}
```

```ts
// Tag invalidation — flush all cache for a user on update
import { cachedWithTags, invalidateTag } from "{{scope}}/cache";

const profile = await cachedWithTags(
  `user:${id}:profile`, 600, [`user:${id}`], fetchProfile,
);
// On user update:
await invalidateTag(`user:${id}`); // deletes every key tagged with this user
```

```ts
// Batch — read 50 product cards in one request
import { mget, mset } from "{{scope}}/cache";

const cached = await mget<ProductCard>(keys);
const missing = keys.filter((_, i) => cached[i] === null);
const fresh = await Promise.all(missing.map(fetchProduct));
await mset(fresh.map((p) => ({ key: `product:${p.id}`, value: p })), 300);
```

**Out of scope and why:**
- **Distributed lock / single-flight:** serverless busy-wait = billing trap + deadlock on crash. Use SWR + jitter instead.
- **Probabilistic early expiration:** requires a persistent hot-cache instance to be useful; meaningless in cold-start serverless.
- **Pub/sub invalidation bus:** Upstash REST does not support persistent pub/sub subscriptions across requests.
