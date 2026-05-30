import { randomToken, sha256 } from "{{scope}}/crypto";

/** A new opaque, secure session id (256 bits of entropy, hex). */
export function createSessionId(): string {
  return randomToken(32);
}

/**
 * Hash a session id for storage — store the hash, compare against it, so a
 * leaked database never exposes usable session tokens.
 */
export function hashSessionId(id: string): Promise<string> {
  return sha256(id);
}
