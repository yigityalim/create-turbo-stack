// posthog-js is an optional peer dependency. Install it for client-side tracking:
//   npm install posthog-js
// The server-side functions in server.ts work without posthog-js.
import posthog from "posthog-js";
import { env } from "{{scope}}/env";

export interface InitOptions {
  /**
   * Proxy the PostHog API through your own domain to bypass ad-blockers.
   * Set to a route that forwards to the PostHog API host.
   * Example (Next.js): "/ingest" → proxies to https://eu.i.posthog.com
   */
  apiProxyPath?: string;
  /** Disable automatic pageview tracking. Default: false (tracking is on). */
  disablePageviews?: boolean;
}

/**
 * Initialises the PostHog browser SDK.
 * Call once in your root layout or app entry point.
 *
 * Uses NEXT_PUBLIC_POSTHOG_KEY and NEXT_PUBLIC_POSTHOG_HOST from env.
 * These must be in your t3-env client block (NEXT_PUBLIC_ prefix).
 */
export function initPosthog(options: InitOptions = {}): void {
  if (typeof window === "undefined") return;

  posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: options.apiProxyPath ?? env.NEXT_PUBLIC_POSTHOG_HOST,
    ui_host: env.NEXT_PUBLIC_POSTHOG_HOST,
    capture_pageview: options.disablePageviews ? false : true,
    capture_pageleave: true,
    person_profiles: "identified_only",
  });
}

/**
 * Tracks a custom event from the browser.
 * No-ops if PostHog has not been initialised.
 * Never throws.
 */
export function trackClientEvent(
  event: string,
  properties?: Record<string, unknown>,
): void {
  try {
    if (typeof window === "undefined") return;
    posthog.capture(event, properties);
  } catch {
    // Fail silent.
  }
}

/**
 * Identifies the current user in the browser session.
 * Links anonymous events to a known user profile.
 */
export function identifyUser(
  distinctId: string,
  properties?: Record<string, unknown>,
): void {
  try {
    if (typeof window === "undefined") return;
    posthog.identify(distinctId, properties);
  } catch {
    // Fail silent.
  }
}

/**
 * Resets the PostHog identity (on logout).
 * Creates a new anonymous session.
 */
export function resetIdentity(): void {
  try {
    if (typeof window === "undefined") return;
    posthog.reset();
  } catch {
    // Fail silent.
  }
}
