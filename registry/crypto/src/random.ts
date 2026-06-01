import { toHex, toBase64url } from "./encoding";

/** Returns `length` cryptographically secure random bytes. */
export function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(length));
}

/** Returns `length` random bytes as a lowercase hex string. */
export function randomHex(length: number): string {
  return toHex(randomBytes(length));
}

/**
 * Returns a `length`-byte random token as a lowercase hex string.
 * Suitable for session IDs, API keys, and CSRF tokens.
 * Default length of 32 bytes produces 256 bits of entropy.
 */
export function randomToken(length = 32): string {
  return randomHex(length);
}

/**
 * Returns a URL-safe base64 (no padding) random ID.
 * Default of 16 bytes produces a 22-character string with 128 bits of entropy.
 * Suitable for short public identifiers in URLs and logs.
 */
export function randomId(length = 16): string {
  return toBase64url(randomBytes(length));
}

/** Returns a random UUID v4 using the native crypto.randomUUID() implementation. */
export function randomUUID(): string {
  return crypto.randomUUID();
}
