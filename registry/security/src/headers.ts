// HSTS: OSHP explicitly recommends omitting `preload` by default.
// hstspreload.org warns against including it without understanding the permanent consequences.
const HSTS_ONE_YEAR = 31_536_000;

// Permissions-Policy: deny the most commonly abused sensor and capture APIs.
// fullscreen and picture-in-picture are left open (*) to avoid breaking common UX.
const DEFAULT_PERMISSIONS_POLICY = [
  "accelerometer=()",
  "camera=()",
  "display-capture=()",
  "encrypted-media=()",
  "geolocation=()",
  "gyroscope=()",
  "magnetometer=()",
  "microphone=()",
  "midi=()",
  "payment=()",
  "publickey-credentials-get=()",
  "screen-wake-lock=()",
  "usb=()",
  "web-share=()",
  "xr-spatial-tracking=()",
].join(", ");

// Headers that leak implementation details and should be removed in production.
// Source: OWASP OSHP "Headers to Remove" list.
const FINGERPRINT_HEADERS = [
  "Server",
  "X-Powered-By",
  "X-AspNet-Version",
  "X-AspNetMvc-Version",
  "X-Generator",
] as const;

export interface HSTSOptions {
  /** Seconds the browser should remember HTTPS-only. Default: 31536000 (1 year). */
  maxAge?: number;
  /** Apply HSTS to all subdomains. Default: true. */
  includeSubDomains?: boolean;
  /**
   * Request inclusion in browser preload lists.
   * WARNING: Permanent and very difficult to undo. Requires 2-year max-age
   * and all subdomains on HTTPS. Do not set without understanding the consequences.
   */
  preload?: boolean;
}

export interface SecurityHeadersOptions {
  /**
   * Strict-Transport-Security configuration.
   * Set to false to omit (e.g., non-HTTPS environments, local dev).
   */
  hsts?: HSTSOptions | false;
  /**
   * X-Frame-Options value. Default: "DENY".
   * frame-ancestors in CSP supersedes this for modern browsers;
   * include both for compatibility with older browsers.
   * Set to false to omit.
   */
  frameOptions?: "DENY" | "SAMEORIGIN" | false;
  /**
   * Permissions-Policy header value.
   * Pass a custom string to override the default restrictive policy.
   * Set to false to omit.
   */
  permissionsPolicy?: string | false;
  /**
   * Cross-Origin-Embedder-Policy: require-corp.
   * Enables SharedArrayBuffer but requires all cross-origin resources to opt in
   * via CORS or CORP. Off by default — audit cross-origin dependencies first.
   */
  coep?: boolean;
  /** Additional headers merged into the response verbatim. */
  extra?: Record<string, string>;
}

function buildHSTS(opts: HSTSOptions): string {
  const maxAge = opts.maxAge ?? HSTS_ONE_YEAR;
  const parts = [`max-age=${maxAge}`];
  if (opts.includeSubDomains !== false) parts.push("includeSubDomains");
  if (opts.preload) parts.push("preload");
  return parts.join("; ");
}

/**
 * Returns the OWASP OSHP recommended security headers as a plain object.
 * Does not include Content-Security-Policy — generate that separately with buildCSP / strictCspWithNonce.
 */
export function getSecurityHeaders(
  options: SecurityHeadersOptions = {},
): Record<string, string> {
  const headers: Record<string, string> = {};

  if (options.hsts !== false) {
    headers["Strict-Transport-Security"] = buildHSTS(
      options.hsts && typeof options.hsts === "object" ? options.hsts : {},
    );
  }

  // Prevent MIME-type sniffing attacks.
  headers["X-Content-Type-Options"] = "nosniff";

  // Clickjacking protection — still needed for browsers without frame-ancestors CSP support.
  if (options.frameOptions !== false) {
    headers["X-Frame-Options"] = options.frameOptions ?? "DENY";
  }

  // Disable the legacy XSS Auditor. OSHP recommends setting this to 0:
  // the auditor causes information leakage and modern browsers have removed it.
  headers["X-XSS-Protection"] = "0";

  // Strip path/query from the Referer header on cross-origin requests.
  headers["Referrer-Policy"] = "strict-origin-when-cross-origin";

  // Isolates browsing context to same-origin. Mitigates window.opener attacks and XS-Leaks.
  headers["Cross-Origin-Opener-Policy"] = "same-origin";

  // Prevents other origins from loading this resource (Spectre mitigation).
  headers["Cross-Origin-Resource-Policy"] = "same-origin";

  // Restrict Adobe Flash / Acrobat cross-domain policy file access.
  headers["X-Permitted-Cross-Domain-Policies"] = "none";

  if (options.permissionsPolicy !== false) {
    headers["Permissions-Policy"] =
      options.permissionsPolicy ?? DEFAULT_PERMISSIONS_POLICY;
  }

  // COEP is opt-in: enabling it without auditing cross-origin dependencies breaks integrations.
  if (options.coep) {
    headers["Cross-Origin-Embedder-Policy"] = "require-corp";
  }

  if (options.extra) {
    for (const [name, value] of Object.entries(options.extra)) {
      headers[name] = value;
    }
  }

  return headers;
}

/**
 * Applies OWASP security headers to a Response, returning a new Response.
 * The original Response is not mutated. Framework-agnostic: works in edge middleware,
 * route handlers, or service workers.
 */
export function applySecurityHeaders(
  response: Response,
  options?: SecurityHeadersOptions,
): Response {
  const securityHeaders = getSecurityHeaders(options);
  const next = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
  for (const [name, value] of Object.entries(securityHeaders)) {
    next.headers.set(name, value);
  }
  return next;
}

/**
 * Removes server-fingerprinting headers from a Response, returning a new Response.
 * Strips: Server, X-Powered-By, X-AspNet-Version, X-AspNetMvc-Version, X-Generator.
 */
export function stripFingerprintHeaders(response: Response): Response {
  const next = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
  for (const name of FINGERPRINT_HEADERS) {
    next.headers.delete(name);
  }
  return next;
}
