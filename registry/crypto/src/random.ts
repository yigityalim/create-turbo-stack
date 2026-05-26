/**
 * A cryptographically-secure random token, hex-encoded. Uses
 * `crypto.getRandomValues` (Web Crypto). Default 32 bytes → 64 hex chars.
 * Good for session ids, CSRF tokens, API keys.
 */
export function randomToken(bytes = 32): string {
  const buf = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** A random URL-safe base64 string (no padding). */
export function randomId(bytes = 16): string {
  const buf = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...buf))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
