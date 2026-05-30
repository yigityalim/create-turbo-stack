/**
 * Security response headers applied to every route. Wire these into your
 * Next.js `next.config.ts` via `securityHeadersConfig()`, or set them in a
 * middleware / edge function for other frameworks.
 */
export const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
] as const;

/**
 * Content-Security-Policy. This is a sensible strict default — tighten
 * `connect-src` / `img-src` / `script-src` to match the origins your app
 * actually talks to.
 */
export function contentSecurityPolicy(): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

/**
 * Next.js `headers()` entry: applies the security headers (plus CSP) to
 * every path.
 *
 * ```ts
 * // next.config.ts
 * import { securityHeadersConfig } from "{{scope}}/security";
 * export default { async headers() { return securityHeadersConfig(); } };
 * ```
 */
export function securityHeadersConfig() {
  return [
    {
      source: "/:path*",
      headers: [
        ...securityHeaders,
        { key: "Content-Security-Policy", value: contentSecurityPolicy() },
      ],
    },
  ];
}
