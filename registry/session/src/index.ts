import { randomToken, sha256 } from "{{scope}}/crypto";

/**
 * Generates a new opaque session ID.
 * Returns a 64-character lowercase hex string (256-bit entropy via CSPRNG).
 *
 * This value is a secret. Do not store it in plaintext — pass it to hashSessionId
 * and store the hash. Send the raw ID to the client (cookie, header, response body).
 */
export function createSessionId(): string {
  return randomToken(32);
}

/**
 * Returns the SHA-256 hash of a session ID as a lowercase hex string.
 * Store this in your database, never the raw ID.
 * If the database is compromised, stolen hashes cannot be used as tokens.
 */
export async function hashSessionId(id: string): Promise<string> {
  return sha256(id);
}

/**
 * Verifies an incoming session ID against a stored hash.
 * Re-hashes the incoming ID unconditionally before comparing — avoids
 * short-circuit evaluation on the raw secret. Returns true on match.
 *
 * Usage: retrieve the stored hash from your database, then call this.
 * Do not compare raw IDs.
 */
export async function verifySessionId(
  incomingId: string,
  storedHash: string,
): Promise<boolean> {
  const hash = await hashSessionId(incomingId);
  return hash === storedHash;
}
