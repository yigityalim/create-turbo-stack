# security

OWASP-aligned HTTP security headers, a nonce-based Content Security Policy builder, and an origin/CSRF guard. Every function relies only on the Fetch API (`Request`, `Response`, `Headers`, `URL`) and the `crypto` package for nonce generation — no runtime npm dependencies. Runs unmodified in Node 20+, Vercel/Cloudflare Edge Functions, and browser service workers.

**Why nonce + strict-dynamic instead of a static CSP allowlist?** Static allowlists are fragile: a compromised CDN or a single injected inline script bypasses the policy entirely. A per-request nonce cryptographically binds each permitted script to the server response that generated it. `strict-dynamic` propagates trust to scripts loaded by nonce-trusted code, so module-based apps do not need to enumerate every source. `unsafe-inline` and `unsafe-eval` are absent from the default policy; they must be added explicitly if required.

**What this package does not cover:** rate limiting (separate slot), auth and session management, input sanitization, and full CORS preflight handling.

```ts
import { applySecurityHeaders, stripFingerprintHeaders } from "{{scope}}/security/headers";
import { generateNonce, strictCspWithNonce, CSP_HEADER } from "{{scope}}/security/csp";
import { assertTrustedOrigin } from "{{scope}}/security/origin";

// Edge middleware / route handler
export async function handler(request: Request): Promise<Response> {
  const guard = assertTrustedOrigin(request);
  if (guard) return guard;

  const nonce = generateNonce();
  const csp = strictCspWithNonce(nonce, { "img-src": ["'self'", "https://cdn.example.com"] });

  let response = new Response("Hello", { status: 200 });
  response = stripFingerprintHeaders(response);
  response = applySecurityHeaders(response, { hsts: { maxAge: 63_072_000 } });
  response.headers.set(CSP_HEADER, csp);
  return response;
}
```
