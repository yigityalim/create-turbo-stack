import { env } from "{{scope}}/env";
import { PostHog } from "posthog-node";

// Serverless-safe configuration:
// - flushAt: 1  — flush after every event (no batching)
// - flushInterval: 0 — no time-based delay before flush
// These settings alone are not enough. See the note on captureImmediate below.
const posthog = new PostHog(env.POSTHOG_API_KEY, {
  host: env.POSTHOG_HOST,
  flushAt: 1,
  flushInterval: 0,
});

export { posthog };

export interface TrackEventOptions {
  /**
   * Unique identifier for the user. Required by PostHog.
   * For unauthenticated users, generate and persist a session ID:
   *   import { randomUUID } from "crypto";
   *   const anonId = cookies.get("phx_id") ?? randomUUID();
   */
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
}

export interface TrackEventResult {
  /**
   * Promise that resolves when the HTTP request to PostHog completes.
   *
   * In serverless environments (Next.js App Router, Vercel Functions, Cloudflare Workers),
   * the runtime may terminate before the request finishes. Pass this to:
   *   - Next.js 15.1+: after(() => pending)
   *   - Vercel older / Cloudflare: ctx.waitUntil(pending)
   *
   * Without this, events can be silently lost when the function shuts down.
   */
  pending: Promise<void>;
}

export interface IdentifyOptions {
  distinctId: string;
  properties?: Record<string, unknown>;
}

/**
 * Captures an event server-side using captureImmediate.
 *
 * Uses captureImmediate (not capture) to ensure the HTTP request to PostHog
 * starts before the function continues. Even with flushAt:1/flushInterval:0,
 * plain capture() is still async and can be dropped by serverless runtimes.
 *
 * Always pass result.pending to after()/waitUntil() in serverless contexts.
 * Never throws — analytics failures are silent.
 */
export async function trackEvent(options: TrackEventOptions): Promise<TrackEventResult> {
  try {
    const pending = posthog.captureImmediate({
      distinctId: options.distinctId,
      event: options.event,
      properties: options.properties,
    });
    return { pending };
  } catch {
    return { pending: Promise.resolve() };
  }
}

/**
 * Sets or updates a user's Person profile in PostHog.
 * Uses identifyImmediate for serverless safety.
 * Never throws.
 */
export async function identify(options: IdentifyOptions): Promise<void> {
  try {
    await posthog.identifyImmediate({
      distinctId: options.distinctId,
      properties: options.properties,
    });
  } catch {
    // Fail silent.
  }
}

/**
 * Evaluates a feature flag server-side.
 * Returns undefined on error or if the flag does not exist.
 */
export async function isFeatureEnabled(
  flag: string,
  distinctId: string,
): Promise<boolean | undefined> {
  try {
    return (await posthog.isFeatureEnabled(flag, distinctId)) ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * Returns a feature flag's value (boolean or string variant).
 * Returns undefined on error or if the flag does not exist.
 */
export async function getFeatureFlag(
  flag: string,
  distinctId: string,
): Promise<string | boolean | undefined> {
  try {
    return (await posthog.getFeatureFlag(flag, distinctId)) ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * Shuts down the PostHog client and flushes all pending events.
 *
 * Call this at the end of serverless functions to guarantee delivery.
 * Combine with after() or waitUntil() so it runs after the response is sent.
 *
 * Example (Next.js 15.1+):
 *   after(() => shutdownAnalytics());
 *
 * Example (Vercel waitUntil):
 *   context.waitUntil(shutdownAnalytics());
 */
export async function shutdownAnalytics(timeoutMs?: number): Promise<void> {
  try {
    await posthog._shutdown(timeoutMs);
  } catch {
    // Fail silent — never block the response for analytics cleanup.
  }
}
