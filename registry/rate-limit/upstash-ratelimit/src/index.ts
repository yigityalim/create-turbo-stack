// Framework-agnostic rate limiting over Web-standard Request/Response.
// Wire `limitRequest` / `rateLimitResponse` into your framework's middleware.

export { Ratelimit } from "./core";
export type {
  RateLimiterOptions,
  ClientIdentifierOptions,
  RateLimitResult,
  LimitRequestResult,
} from "./core";
export {
  createRateLimiter,
  getClientIdentifier,
  checkRateLimit,
  rateLimitHeaders,
  rateLimitResponse,
  limitRequest,
} from "./core";
