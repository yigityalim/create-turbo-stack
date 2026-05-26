/**
 * SHA-256 hash of a string, hex-encoded. Uses the Web Crypto API
 * (`crypto.subtle`), available in Node 20+, edge runtimes, and browsers.
 */
export async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toHex(new Uint8Array(digest));
}

/**
 * HMAC-SHA-256 of `message` with `secret`, hex-encoded. Use for signing
 * tokens, verifying webhooks, etc.
 */
export async function hmacSha256(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return toHex(new Uint8Array(signature));
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
