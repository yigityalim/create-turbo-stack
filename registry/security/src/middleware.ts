/**
 * Lightweight CSRF guard: reject cross-origin state-changing requests.
 * Same-origin (and any explicitly allowed origins) pass; everything else is
 * blocked on POST / PUT / PATCH / DELETE. Works with the Web `Request` /
 * `Response` API (Next.js middleware, route handlers, edge functions).
 */
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function isTrustedOrigin(request: Request, allowedOrigins: string[] = []): boolean {
  if (!MUTATING_METHODS.has(request.method)) return true;

  const origin = request.headers.get("origin");
  if (!origin) return false;

  const host = request.headers.get("host");
  const allowList = [
    host ? `https://${host}` : null,
    host ? `http://${host}` : null,
    ...allowedOrigins,
  ].filter((o): o is string => Boolean(o));

  return allowList.includes(origin);
}

/**
 * Returns a 403 `Response` for untrusted cross-origin mutations, or `null`
 * when the request is allowed — call it at the top of a handler/middleware:
 *
 * ```ts
 * const blocked = assertTrustedOrigin(request);
 * if (blocked) return blocked;
 * ```
 */
export function assertTrustedOrigin(
  request: Request,
  allowedOrigins: string[] = [],
): Response | null {
  if (isTrustedOrigin(request, allowedOrigins)) return null;
  return new Response("Forbidden: untrusted origin", { status: 403 });
}
