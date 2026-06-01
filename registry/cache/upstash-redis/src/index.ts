export { redis, createCache } from "./client";
export type { CacheNamespace } from "./client";

export type { CachedOptions, FlexibleResult } from "./cache";
export { cached, cachedFlexible, invalidate, invalidateMany } from "./cache";

export { cachedWithTags, invalidateTag } from "./tags";

export type { MsetEntry } from "./batch";
export { mget, mset } from "./batch";
