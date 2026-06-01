import { redis } from "./client";

function tagSetKey(tag: string): string {
  return `tag:${tag}`;
}

/**
 * Read-through cache with tag tracking. On a cache miss, calls fn, stores the value,
 * and registers the key in each tag's set (SADD tag:<tag> <key>).
 *
 * Tag registration and value storage are pipelined into a single HTTP round-trip.
 *
 * Use invalidateTag to flush all keys belonging to a tag:
 *   await cachedWithTags("user:42:profile", 300, ["user:42", "profiles"], fetchProfile);
 *   // later, on user update:
 *   await invalidateTag("user:42"); // clears all keys tagged with "user:42"
 */
export async function cachedWithTags<T>(
  key: string,
  ttlSeconds: number,
  tags: string[],
  fn: () => Promise<T | null>,
): Promise<T | null> {
  const raw = await redis.get<unknown>(key);
  if (raw !== null) return raw as T;

  const value = await fn();
  if (value === null || value === undefined) return null;

  // Store value + register key in each tag set — single pipeline, one round-trip
  const p = redis.pipeline();
  p.set(key, value, { ex: ttlSeconds });
  for (const tag of tags) {
    p.sadd(tagSetKey(tag), key);
  }
  await p.exec();

  return value;
}

/**
 * Invalidates all cache keys associated with a tag.
 *
 * Steps (pipelined — single round-trip after the SMEMBERS):
 *   1. SMEMBERS tag:<tag> → list of registered keys
 *   2. UNLINK <keys...> + UNLINK tag:<tag> → async deletion
 *
 * UNLINK is preferred over DEL: it reclaims memory asynchronously without blocking
 * the Redis event loop, which matters for large tag sets.
 *
 * Limitation: tag sets accumulate keys even after those keys have naturally expired.
 * The UNLINK on expired keys is a no-op, but the pipeline still contains those commands.
 * For very high-churn caches, periodically rebuilding tag sets or using short-lived tags
 * keeps set sizes manageable.
 */
export async function invalidateTag(tag: string): Promise<void> {
  const tagKey = tagSetKey(tag);
  const keys = await redis.smembers<string[]>(tagKey);

  if (keys.length === 0) {
    // Tag set is empty or already gone; clean up the set key anyway
    await redis.del(tagKey);
    return;
  }

  const p = redis.pipeline();
  // Unlink all cached keys registered under this tag
  p.unlink(...keys);
  // Unlink the tag set itself so it does not accumulate stale members
  p.unlink(tagKey);
  await p.exec();
}
