// Methods that mutate server state and require origin verification.
// GET, HEAD, OPTIONS are excluded — they are safe and should not require CSRF protection.
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Returns true if the request's origin is trusted.
 *
 * For non-mutating methods (GET, HEAD, OPTIONS) this always returns true —
 * CSRF attacks require state-changing requests.
 *
 * For mutating methods:
 * - A missing Origin header is rejected. Modern browsers always send Origin on
 *   cross-site fetches; its absence on a mutating request is suspicious.
 * - Same-origin requests (Origin matches request URL's origin) are accepted.
 * - Origins in the explicit allowlist are accepted.
 * - Everything else is rejected.
 *
 * @param request - The incoming Fetch API Request.
 * @param allowedOrigins - Optional list of trusted cross-origins (e.g. ["https://app.example.com"]).
 */
export function isTrustedOrigin(
  request: Request,
  allowedOrigins?: string[],
): boolean {
  if (!MUTATING_METHODS.has(request.method.toUpperCase())) return true;

  const origin = request.headers.get("Origin");
  if (!origin) return false;

  const url = new URL(request.url);
  const requestOrigin = `${url.protocol}//${url.host}`;

  if (origin === requestOrigin) return true;
  if (allowedOrigins && allowedOrigins.includes(origin)) return true;

  return false;
}

/**
 * Returns a 403 Response if the request's origin is not trusted, null otherwise.
 * Designed for early-return guards at the top of route handlers or middleware:
 *
 * ```ts
 * const guard = assertTrustedOrigin(request);
 * if (guard) return guard;
 * ```
 *
 * @param request - The incoming Fetch API Request.
 * @param allowedOrigins - Optional list of trusted cross-origins.
 */
export function assertTrustedOrigin(
  request: Request,
  allowedOrigins?: string[],
): Response | null {
  if (isTrustedOrigin(request, allowedOrigins)) return null;
  return new Response("Forbidden", { status: 403 });
}
