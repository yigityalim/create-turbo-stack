// Core exports only. Adapters live at their own paths to keep framework
// dependencies isolated and tree-shaking intact:
//   {{scope}}/rate-limit/next
//   {{scope}}/rate-limit/hono
//   {{scope}}/rate-limit/sveltekit

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
