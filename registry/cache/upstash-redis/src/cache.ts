import { redis } from "./client";

// Sentinel stored in Redis when a null/undefined result is negatively cached.
// Prevents cache penetration: repeated misses for non-existent records hit Redis,
// not the origin. Using a sentinel instead of an absent key lets us distinguish
// "not cached yet" from "cached as null".
/** @constant */
const NULL_SENTINEL = "__cts_null__" as const;

// Wrapper for SWR-cached values. Stored alongside the actual value so we can
// determine freshness without a separate TTL key. The outer Redis TTL is staleTtl;
// freshness is computed from _t in application code.
interface FlexibleEntry<T> {
  _t: number; // write timestamp in epoch milliseconds
  _v: T; // actual value
}

export interface CachedOptions {
  /**
   * Add ±10% random jitter to the TTL. Default: true.
   * Distributes expiration across time, preventing thundering-herd when many
   * keys were written simultaneously (e.g., after a cache flush or deployment).
   */
  jitter?: boolean;
  /**
   * Cache null/undefined results from fn with a short TTL. Default: false.
   * Prevents cache penetration — without this, repeated reads for a non-existent
   * record bypass the cache and hammer the origin on every request.
   */
  cacheNull?: boolean;
  /**
   * TTL for negatively cached (null) results in seconds. Default: 30.
   * Keep this short: if the record is created, callers should see it within this window.
   */
  nullTtlSeconds?: number;
}

export interface FlexibleResult<T> {
  value: T | null;
  /**
   * Resolves after the background revalidation write completes.
   * In edge runtimes, pass this to context.waitUntil() to prevent the runtime from
   * terminating before the refresh is written to Redis.
   */
  pending: Promise<unknown>;
}

function applyJitter(ttl: number): number {
  const delta = Math.floor(ttl * 0.1 * Math.random());
  const sign = Math.random() < 0.5 ? 1 : -1;
  return Math.max(1, ttl + sign * delta);
}

/**
 * Read-through cache. Returns cached value if present; otherwise calls fn,
 * caches the result, and returns it.
 *
 * Options:
 * - jitter: distributes TTL expiration to avoid stampede (default: on)
 * - cacheNull + nullTtlSeconds: negative caching for non-existent records
 *
 * Upstash auto-deserializes stored JSON — do not JSON.parse the result.
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T | null>,
  options: CachedOptions = {},
): Promise<T | null> {
  const { jitter = true, cacheNull = false, nullTtlSeconds = 30 } = options;

  const raw = await redis.get<unknown>(key);

  if (raw === NULL_SENTINEL) return null; // negative cache hit
  if (raw !== null) return raw as T; // cache hit

  // Cache miss — call origin
  const value = await fn();

  if (value === null || value === undefined) {
    if (cacheNull) {
      const ttl = jitter ? applyJitter(nullTtlSeconds) : nullTtlSeconds;
      await redis.set(key, NULL_SENTINEL, { ex: ttl });
    }
    return null;
  }

  const ttl = jitter ? applyJitter(ttlSeconds) : ttlSeconds;
  await redis.set(key, value, { ex: ttl });
  return value;
}

/**
 * Stale-while-revalidate cache. Returns data immediately even when stale,
 * then refreshes in the background.
 *
 * ttls = [freshTtl, staleTtl] in seconds:
 * - Within freshTtl of write time: return fresh data, no background work.
 * - Between freshTtl and staleTtl: return stale data immediately + schedule refresh.
 * - Beyond staleTtl (or cache miss): fetch fresh, block until written.
 *
 * The background refresh Promise is returned as `pending`. Pass it to
 * context.waitUntil() in edge runtimes — if the runtime terminates before
 * the refresh completes, the stale entry persists and the next request must
 * fetch fresh again.
 *
 * Metadata (_t timestamp) is stored with the value because Redis does not
 * natively expose write time through its TTL commands.
 */
export async function cachedFlexible<T>(
  key: string,
  ttls: [freshTtl: number, staleTtl: number],
  fn: () => Promise<T>,
): Promise<FlexibleResult<T>> {
  const [freshTtl, staleTtl] = ttls;

  const stored = await redis.get<FlexibleEntry<T>>(key);

  async function writeEntry(value: T): Promise<void> {
    const entry: FlexibleEntry<T> = { _t: Date.now(), _v: value };
    await redis.set(key, entry, { ex: staleTtl });
  }

  if (stored === null) {
    // Cold miss — fetch synchronously, block caller
    const value = await fn();
    const pending = writeEntry(value);
    await pending;
    return { value, pending: Promise.resolve() };
  }

  const ageSeconds = (Date.now() - stored._t) / 1000;

  if (ageSeconds <= freshTtl) {
    // Fresh — no background work needed
    return { value: stored._v, pending: Promise.resolve() };
  }

  // Stale — return immediately, refresh in background
  const pending = fn().then(writeEntry);
  return { value: stored._v, pending };
}

/** Deletes a single cache key. Returns number of keys deleted (0 or 1). */
export async function invalidate(key: string): Promise<number> {
  return redis.del(key);
}

/**
 * Deletes multiple cache keys in a single pipeline (one HTTP round-trip to Upstash).
 * Each REST call to Upstash costs ~30ms of latency; batching matters at scale.
 */
export async function invalidateMany(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const p = redis.pipeline();
  for (const key of keys) {
    p.del(key);
  }
  await p.exec();
}
