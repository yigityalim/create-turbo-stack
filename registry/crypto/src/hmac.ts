import { toHex, fromHex, utf8ToBytes } from "./encoding";

const ALGORITHM = { name: "HMAC", hash: "SHA-256" } as const;

async function importKey(
  secret: string,
  usages: KeyUsage[],
): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    utf8ToBytes(secret),
    ALGORITHM,
    false,
    usages,
  );
}

/** Returns the HMAC-SHA256 signature of message under secret as a lowercase hex string. */
export async function hmacSha256(
  secret: string,
  message: string,
): Promise<string> {
  const key = await importKey(secret, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, utf8ToBytes(message));
  return toHex(new Uint8Array(signature));
}

/**
 * Verifies an HMAC-SHA256 signature in constant time.
 * Delegates to subtle.verify so the runtime — not userland code — provides the constant-time comparison.
 */
export async function hmacVerify(
  secret: string,
  message: string,
  signatureHex: string,
): Promise<boolean> {
  const key = await importKey(secret, ["verify"]);
  return crypto.subtle.verify(
    "HMAC",
    key,
    fromHex(signatureHex),
    utf8ToBytes(message),
  );
}
