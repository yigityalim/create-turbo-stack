import { NextResponse } from "next/server";
import type { NextRequest, NextFetchEvent } from "next/server";
import type { Ratelimit } from "@upstash/ratelimit";
import { limitRequest, rateLimitHeaders } from "./core";
import type { ClientIdentifierOptions } from "./core";

/**
 * Returns a Next.js middleware handler that rate-limits incoming requests.
 *
 * Passes result.pending to event.waitUntil so analytics and multi-region
 * synchronisation complete before the edge runtime terminates.
 *
 * Usage in middleware.ts:
 *   export const middleware = nextRateLimit(ratelimiter);
 *   export const config = { matcher: ["/api/:path*"] };
 */
export function nextRateLimit(
  ratelimiter: Ratelimit,
  options?: ClientIdentifierOptions,
): (request: NextRequest, event: NextFetchEvent) => Promise<Response> {
  return async (
    request: NextRequest,
    event: NextFetchEvent,
  ): Promise<Response> => {
    const { result, response } = await limitRequest(
      ratelimiter,
      request,
      options,
    );

    // Always register pending — analytics must complete before runtime shuts down.
    event.waitUntil(result.pending);

    if (response) return response;

    const next = NextResponse.next();
    for (const [name, value] of Object.entries(rateLimitHeaders(result))) {
      next.headers.set(name, value);
    }
    return next;
  };
}
