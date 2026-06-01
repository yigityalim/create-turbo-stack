import type { MiddlewareHandler } from "hono";
import type { Ratelimit } from "@upstash/ratelimit";
import { limitRequest, rateLimitHeaders } from "./core";
import type { ClientIdentifierOptions } from "./core";

/**
 * Returns a Hono middleware that rate-limits incoming requests.
 *
 * Rate-limit headers are applied to both 429 and successful responses.
 *
 * If you run on Cloudflare Workers with analytics enabled, manually pass
 * result.pending to ctx.waitUntil — Hono middleware does not expose this
 * directly. For most setups the pending promise can be safely ignored.
 *
 * Usage:
 *   app.use("/api/*", honoRateLimit(ratelimiter));
 */
export function honoRateLimit(
  ratelimiter: Ratelimit,
  options?: ClientIdentifierOptions,
): MiddlewareHandler {
  return async (c, next) => {
    const { result, response } = await limitRequest(
      ratelimiter,
      c.req.raw,
      options,
    );
    const headers = rateLimitHeaders(result);

    if (response) {
      for (const [name, value] of Object.entries(headers)) {
        c.header(name, value);
      }
      return c.text("Too Many Requests", 429);
    }

    await next();

    for (const [name, value] of Object.entries(headers)) {
      c.res.headers.set(name, value);
    }
  };
}
