import { track, inject } from "@vercel/analytics";
import type { BeforeSend, BeforeSendEvent } from "@vercel/analytics";
import type { EventData } from "./server";

export type { EventData, BeforeSend, BeforeSendEvent };

/**
 * Tracks a custom event from the browser.
 * No-ops automatically in development mode.
 * Never throws — analytics failures are silent.
 *
 * Custom events must be registered in your Vercel Analytics dashboard to appear in reports.
 */
export function trackClientEvent(name: string, data?: EventData): void {
  try {
    track(name, data);
  } catch {
    // Fail silent.
  }
}

/**
 * Injects Vercel Analytics into non-React frameworks (vanilla JS, SvelteKit via inject, etc.).
 * For SvelteKit, prefer @vercel/analytics/sveltekit's injectAnalytics instead.
 * For React, use the <Analytics /> component from {{scope}}/analytics/react.
 */
export { inject };
