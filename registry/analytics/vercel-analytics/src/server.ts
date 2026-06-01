import { track } from "@vercel/analytics/server";

/**
 * Allowed values for custom event properties.
 * Nested objects are intentionally excluded — Vercel rejects them at runtime.
 * Max 255 characters per value.
 */
export type EventData = Record<string, string | number | boolean | null>;

export interface ServerTrackOptions {
  /**
   * Incoming request headers. Pass these for accurate attribution
   * (geolocation, referrer) in Route Handlers and Server Actions.
   */
  headers?: Record<string, string | string[] | undefined> | Headers;
}

/**
 * Tracks a custom event from a Route Handler, Server Action, or API Route.
 * Requires Vercel Web Analytics Pro or Enterprise plan.
 *
 * Never throws — analytics failures are silent.
 */
export async function trackEvent(
  name: string,
  data?: EventData,
  options?: ServerTrackOptions,
): Promise<void> {
  try {
    await track(name, data, options);
  } catch {
    // Analytics must never interrupt the main request flow.
  }
}
