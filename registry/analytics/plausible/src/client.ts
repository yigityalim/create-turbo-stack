import { env } from "{{scope}}/env";

// Plausible's injected window.plausible function signature.
// Defined locally to avoid importing DOM lib — globalThis cast is used for access.
type PlausibleEventOptions = {
  props?: Record<string, string | number | boolean>;
  revenue?: { amount: number; currency: string };
  callback?: () => void;
};

type PlausibleFn = (name: string, options?: PlausibleEventOptions) => void;

// Safely resolve window.plausible without referencing the `window` global.
// In browser context, globalThis === window. In Node/Workers, this returns undefined.
// This avoids adding lib: DOM which would break the universal environment guarantee.
function resolvePlausible(): PlausibleFn | undefined {
  const g = globalThis as Record<string, unknown>;
  const fn = g["plausible"];
  return typeof fn === "function" ? (fn as PlausibleFn) : undefined;
}

export interface PlausibleScriptProps {
  defer: boolean;
  "data-domain": string;
  src: string;
  /** Set when using a proxy path to bypass ad-blockers. */
  "data-api"?: string;
}

export interface ScriptPropsOptions {
  /**
   * Your site domain as configured in Plausible. Defaults to PLAUSIBLE_DOMAIN.
   */
  domain?: string;
  /**
   * Plausible instance URL. Defaults to PLAUSIBLE_API_HOST (https://plausible.io).
   * Set to your self-hosted instance for privacy compliance.
   */
  apiHost?: string;
  /**
   * Proxy path for the Events API. Prevents ad-blockers from blocking analytics.
   * Set to your own proxy route (e.g. "/api/stats/event").
   * When set, adds data-api attribute to the script tag.
   */
  proxyApiPath?: string;
}

/**
 * Returns props for a <script> element that loads Plausible's tracking script.
 * Pass the result directly to your framework's script component:
 *   Next.js: <Script {...plausibleScriptProps()} />
 *   Plain HTML: <script {...} />
 *
 * Custom events defined in Plausible require a "goal" to be created in the dashboard.
 */
export function plausibleScriptProps(
  options: ScriptPropsOptions = {},
): PlausibleScriptProps {
  const host = options.apiHost ?? env.PLAUSIBLE_API_HOST;
  const domain = options.domain ?? env.PLAUSIBLE_DOMAIN;

  const props: PlausibleScriptProps = {
    defer: true,
    "data-domain": domain,
    src: `${host}/js/script.js`,
  };

  if (options.proxyApiPath) {
    // Proxy the Events API through your own domain to bypass ad-blockers.
    // Your proxy route should forward to ${host}/api/event.
    props["data-api"] = options.proxyApiPath;
  }

  return props;
}

/**
 * Fires a custom event via window.plausible.
 *
 * Safe to call server-side or before the Plausible script loads — returns without
 * error in those cases. Custom events must be registered as goals in Plausible.
 */
export function trackClientEvent(
  name: string,
  props?: Record<string, string | number | boolean>,
  callback?: () => void,
): void {
  const plausible = resolvePlausible();
  if (plausible === undefined) return;
  plausible(name, { props, callback });
}
