// Server-side (Node.js — posthog-node)
export { posthog } from "./server";
export type {
  TrackEventOptions,
  TrackEventResult,
  IdentifyOptions,
} from "./server";
export {
  trackEvent,
  identify,
  isFeatureEnabled,
  getFeatureFlag,
  shutdownAnalytics,
} from "./server";

// Client-side (browser — posthog-js optional peer) is at a separate path
// to avoid bundling posthog-js into server builds:
//   import { initPosthog, trackClientEvent } from "{{scope}}/analytics/client"
