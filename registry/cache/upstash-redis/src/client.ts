import { Redis } from "@upstash/redis";
import { env } from "{{scope}}/env";

// Shared Redis client. Not fromEnv() — that reads process.env directly and bypasses
// the application's env validation layer.
export const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});

import type { CachedOptions, FlexibleResult } from "./cache";
import { cached, cachedFlexible, invalidate, invalidateMany } from "./cache";
import { cachedWithTags, invalidateTag } from "./tags";
import { mget, mset } from "./batch";

/** Namespaced cache bound to a key prefix. Prevents collision in multi-tenant setups. */
export interface CacheNamespace {
  cached<T>(
    key: string,
    ttlSeconds: number,
    fn: () => Promise<T | null>,
    options?: CachedOptions,
  ): Promise<T | null>;
  cachedFlexible<T>(
    key: string,
    ttls: [freshTtl: number, staleTtl: number],
    fn: () => Promise<T>,
  ): Promise<FlexibleResult<T>>;
  cachedWithTags<T>(
    key: string,
    ttlSeconds: number,
    tags: string[],
    fn: () => Promise<T | null>,
  ): Promise<T | null>;
  invalidate(key: string): Promise<number>;
  invalidateMany(keys: string[]): Promise<void>;
  invalidateTag(tag: string): Promise<void>;
  mget<T>(keys: string[]): Promise<(T | null)[]>;
  mset<T>(
    entries: Array<{ key: string; value: T }>,
    ttlSeconds?: number,
  ): Promise<void>;
}

/**
 * Returns a namespaced cache API. All keys and tag sets are automatically prefixed
 * with `<namespace>:`, preventing collisions between feature areas or tenants.
 *
 * Create once at module level, not inside handlers:
 *   const productCache = createCache("product");
 *   const userCache    = createCache("user");
 */
export function createCache(namespace: string): CacheNamespace {
  const k = (key: string) => `${namespace}:${key}`;
  const t = (tag: string) => `${namespace}:tag:${tag}`;

  return {
    cached: (key, ttlSeconds, fn, options) =>
      cached(k(key), ttlSeconds, fn, options),
    cachedFlexible: (key, ttls, fn) => cachedFlexible(k(key), ttls, fn),
    cachedWithTags: (key, ttlSeconds, tags, fn) =>
      cachedWithTags(k(key), ttlSeconds, tags.map(t), fn),
    invalidate: (key) => invalidate(k(key)),
    invalidateMany: (keys) => invalidateMany(keys.map(k)),
    invalidateTag: (tag) => invalidateTag(t(tag)),
    mget: <T>(keys: string[]) => mget<T>(keys.map(k)),
    mset: <T>(entries: Array<{ key: string; value: T }>, ttlSeconds?: number) =>
      mset(
        entries.map((e) => ({ ...e, key: k(e.key) })),
        ttlSeconds,
      ),
  };
}
