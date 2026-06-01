import { toHex, utf8ToBytes } from "./encoding";

/** Returns the SHA-256 digest of a UTF-8 string as a lowercase hex string. */
export async function sha256(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", utf8ToBytes(input));
  return toHex(new Uint8Array(digest));
}

/** Returns the SHA-512 digest of a UTF-8 string as a lowercase hex string. */
export async function sha512(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-512", utf8ToBytes(input));
  return toHex(new Uint8Array(digest));
}
