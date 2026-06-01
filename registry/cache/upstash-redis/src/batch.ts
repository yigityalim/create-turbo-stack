import { redis } from "./client";

/**
 * Fetches multiple cache keys in a single HTTP request.
 *
 * Upstash REST adds ~30ms of round-trip latency per call. Reading 10 keys
 * individually would cost 300ms; mget costs the same as reading one key.
 * Returns null for keys that do not exist.
 *
 * Upstash auto-deserializes values — do not JSON.parse results.
 */
export async function mget<T>(keys: string[]): Promise<(T | null)[]> {
  if (keys.length === 0) return [];
  return redis.mget<Array<T | null>>(...keys);
}

export interface MsetEntry<T> {
  key: string;
  value: T;
}

/**
 * Writes multiple cache entries in a single pipeline (one HTTP request).
 *
 * If ttlSeconds is provided, each entry expires after that duration.
 * Without ttlSeconds, entries persist until manually deleted or evicted by Redis.
 *
 * Note: mset does not support per-key TTLs; use a pipeline of individual set calls
 * if you need different TTLs per key.
 */
export async function mset<T>(
  entries: Array<MsetEntry<T>>,
  ttlSeconds?: number,
): Promise<void> {
  if (entries.length === 0) return;

  const p = redis.pipeline();
  for (const { key, value } of entries) {
    if (ttlSeconds !== undefined) {
      p.set(key, value, { ex: ttlSeconds });
    } else {
      p.set(key, value);
    }
  }
  await p.exec();
}
