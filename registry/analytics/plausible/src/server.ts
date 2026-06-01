import { env } from "{{scope}}/env";

export interface TrackEventOptions {
  /** Event name. Use "pageview" for page views, or any custom event name. */
  name: string;
  /** Full URL of the page where the event occurred. */
  url: string;
  /**
   * Domain as configured in your Plausible dashboard.
   * Defaults to PLAUSIBLE_DOMAIN from env.
   */
  domain?: string;
  /**
   * Raw User-Agent string of the visitor's browser.
   * Required: Plausible uses this to identify the visitor and populate the
   * Devices report. Forward directly from the incoming request.
   */
  userAgent: string;
  /**
   * Real IP address of the visitor.
   * Required: sent as X-Forwarded-For and used for unique visitor counting.
   * Must be the actual visitor IP, NOT a CDN, load-balancer, or server IP.
   * If a non-visitor IP is forwarded, Plausible's bot filter drops the event
   * silently (returns 202 but sets x-plausible-dropped: 1 in the response).
   */
  clientIp: string;
  referrer?: string;
  /** Custom event properties. Visible as breakdown dimensions in Plausible. */
  props?: Record<string, string | number | boolean>;
  /** Revenue tracking: amount + ISO 4217 currency code. */
  revenue?: { amount: number; currency: string };
}

export interface TrackEventResult {
  ok: boolean;
  /**
   * true when Plausible accepted the HTTP request (202) but dropped the event.
   * Inspect x-plausible-dropped in the API response.
   * Most common cause: X-Forwarded-For contains a server/CDN IP instead of the
   * actual visitor IP. Use X-Debug-Request: true to confirm what IP Plausible sees.
   */
  dropped?: boolean;
}

/**
 * Sends a server-side event to the Plausible Events API.
 *
 * Always returns a result — never throws. Analytics failures are silent so
 * they never interrupt the main request flow.
 *
 * Self-hosting: set PLAUSIBLE_API_HOST in env to your Plausible instance URL.
 */
export async function trackEvent(
  options: TrackEventOptions,
): Promise<TrackEventResult> {
  const apiHost = env.PLAUSIBLE_API_HOST;
  const domain = options.domain ?? env.PLAUSIBLE_DOMAIN;

  const payload: Record<string, unknown> = {
    name: options.name,
    url: options.url,
    domain,
  };

  if (options.referrer !== undefined) payload["referrer"] = options.referrer;
  if (options.props !== undefined) payload["props"] = options.props;
  if (options.revenue !== undefined) payload["revenue"] = options.revenue;

  try {
    const response = await fetch(`${apiHost}/api/event`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": options.userAgent,
        "X-Forwarded-For": options.clientIp,
      },
      body: JSON.stringify(payload),
    });

    const dropped = response.headers.get("x-plausible-dropped") === "1";
    return { ok: response.status === 202, dropped: dropped ? true : undefined };
  } catch {
    // Analytics errors must never propagate to the caller.
    return { ok: false };
  }
}
