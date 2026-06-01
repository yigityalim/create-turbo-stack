import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "{{scope}}/env";

// Re-export Ratelimit so callers can access static algorithm factories:
//   Ratelimit.slidingWindow, Ratelimit.fixedWindow, Ratelimit.tokenBucket
export { Ratelimit };

// Derive the limiter type from the Ratelimit constructor without hard-coding internals.
type RatelimitConstructorConfig = ConstructorParameters<typeof Ratelimit>[0];

export interface RateLimiterOptions {
  /**
   * Rate limiting algorithm. Obtain via:
   *   Ratelimit.slidingWindow(n, "10 s")  — smoother, costs 2 Redis commands
   *   Ratelimit.fixedWindow(n, "10 s")    — cheaper, stampede at window boundary
   *   Ratelimit.tokenBucket(n, "10 s", b) — fixed burst tolerance b
   */
  limiter: RatelimitConstructorConfig["limiter"];
  /** Redis key prefix. Defaults to "@upstash/ratelimit". */
  prefix?: string;
  /** Send request analytics to the Upstash console. Default: false. */
  analytics?: boolean;
  /**
   * In-memory Map for caching blocked identifiers. Create outside your handler
   * so warm serverless instances skip Redis for known-blocked IDs.
   * Pass false to disable. Defaults to a new Map() if omitted.
   */
  ephemeralCache?: Map<string, number> | false;
  /**
   * Fail-open timeout in milliseconds. If Redis does not respond within this
   * window the request is allowed to pass. Default: 5000.
   */
  timeout?: number;
}

export interface ClientIdentifierOptions {
  /** Use this value directly, skipping header inspection. */
  identifier?: string;
  /**
   * Number of proxies you trust between the internet and your server.
   * Used to extract the real IP from X-Forwarded-For by counting from the right.
   *
   * Example: one reverse proxy → trustedProxyCount: 1
   * Only configure this if you fully control and verify your proxy topology.
   */
  trustedProxyCount?: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  /** Unix timestamp in milliseconds when the window resets (from Upstash). */
  reset: number;
  /**
   * Resolves after background analytics / multi-region sync completes.
   * On Vercel Edge or Cloudflare Workers, pass this to context.waitUntil()
   * to prevent the runtime from terminating before the work finishes.
   */
  pending: Promise<unknown>;
  /** Seconds until the rate limit resets. Use directly as the Retry-After value. */
  retryAfterSeconds: number;
}

export interface LimitRequestResult {
  result: RateLimitResult;
  /** null if the request is allowed; a 429 Response if rate-limited. */
  response: Response | null;
}

/**
 * Constructs an Upstash Ratelimit instance backed by a Redis client from env.
 * Uses env.UPSTASH_REDIS_REST_URL / env.UPSTASH_REDIS_REST_TOKEN — not fromEnv()
 * which would bypass the application's env validation layer.
 */
export function createRateLimiter(options: RateLimiterOptions): Ratelimit {
  const redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });

  return new Ratelimit({
    redis,
    limiter: options.limiter,
    prefix: options.prefix,
    analytics: options.analytics,
    ephemeralCache: options.ephemeralCache,
    timeout: options.timeout,
  });
}

/**
 * Extracts a rate-limiting identifier from a Request using a safe priority chain.
 *
 * Priority:
 *   1. options.identifier (explicit override)
 *   2. CF-Connecting-IP  — Cloudflare sets this; end users cannot spoof it
 *   3. True-Client-IP    — Akamai / Cloudflare Enterprise
 *   4. X-Forwarded-For rightmost-N  — only when trustedProxyCount is set;
 *      counting from the right skips spoofable client-controlled entries
 *   5. X-Real-IP         — nginx proxy; trust depends on your infrastructure
 *   6. "unknown"         — all unidentified traffic shares one bucket; replace
 *      this with a meaningful application-level fallback in production
 *
 * WARNING: Never use the leftmost X-Forwarded-For value for security decisions.
 * It is entirely user-controlled and trivially spoofed to bypass rate limits.
 */
export function getClientIdentifier(
  request: Request,
  options?: ClientIdentifierOptions,
): string {
  if (options?.identifier !== undefined) return options.identifier;

  const cfIp = request.headers.get("CF-Connecting-IP");
  if (cfIp) return cfIp.trim();

  const trueClientIp = request.headers.get("True-Client-IP");
  if (trueClientIp) return trueClientIp.trim();

  const xff = request.headers.get("X-Forwarded-For");
  if (xff !== null && options?.trustedProxyCount !== undefined) {
    const ips = xff.split(",").map((ip) => ip.trim());
    // e.g. trustedProxyCount=1 → take the second-to-last entry
    const safeIndex = ips.length - 1 - options.trustedProxyCount;
    const ip = safeIndex >= 0 ? ips[safeIndex] : undefined;
    if (ip) return ip;
  }

  const realIp = request.headers.get("X-Real-IP");
  if (realIp) return realIp.trim();

  return "unknown";
}

/** Calls ratelimiter.limit and normalises the result. */
export async function checkRateLimit(
  ratelimiter: Ratelimit,
  identifier: string,
): Promise<RateLimitResult> {
  const raw = await ratelimiter.limit(identifier);
  const retryAfterSeconds = Math.max(
    0,
    Math.ceil((raw.reset - Date.now()) / 1000),
  );
  return {
    success: raw.success,
    limit: raw.limit,
    remaining: raw.remaining,
    reset: raw.reset,
    pending: raw.pending,
    retryAfterSeconds,
  };
}

/**
 * Returns IETF-draft rate-limit response headers.
 * RateLimit-Reset is in epoch seconds (Upstash gives milliseconds; we convert).
 * Retry-After is included only on 429 responses (success: false).
 */
export function rateLimitHeaders(
  result: RateLimitResult,
): Record<string, string> {
  const headers: Record<string, string> = {
    "RateLimit-Limit": String(result.limit),
    "RateLimit-Remaining": String(Math.max(0, result.remaining)),
    "RateLimit-Reset": String(Math.ceil(result.reset / 1000)),
  };
  if (!result.success) {
    headers["Retry-After"] = String(result.retryAfterSeconds);
  }
  return headers;
}

/** Returns a spec-correct 429 Response with IETF rate-limit headers. */
export function rateLimitResponse(result: RateLimitResult): Response {
  return new Response("Too Many Requests", {
    status: 429,
    headers: rateLimitHeaders(result),
  });
}

/**
 * Single-call guard: extracts the client identifier, checks the rate limit, and
 * returns both the normalised result and a ready-to-return 429 Response if limited.
 * The caller is responsible for passing result.pending to waitUntil in edge runtimes.
 */
export async function limitRequest(
  ratelimiter: Ratelimit,
  request: Request,
  options?: ClientIdentifierOptions,
): Promise<LimitRequestResult> {
  const identifier = getClientIdentifier(request, options);
  const result = await checkRateLimit(ratelimiter, identifier);
  return {
    result,
    response: result.success ? null : rateLimitResponse(result),
  };
}
