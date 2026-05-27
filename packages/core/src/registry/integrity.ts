import type { PackageRegistryItem } from "@create-turbo-stack/schema";

/**
 * Supply-chain integrity for registry packages. Platform-agnostic: uses Web
 * Crypto (`crypto.subtle`), available in Node 18+ and the browser, so the
 * build script, the CLI, and the web builder all share one implementation.
 *
 * Two layers:
 *   - **checksum** — SHA-256 over the security-relevant parts of an item (the
 *     code that runs + the dependency graph that installs). Detects tampering
 *     or corruption between build and install. Always present on built items.
 *   - **signature** — Ed25519 over the checksum. Optional; only meaningful when
 *     the consumer holds the publisher's public key out-of-band (configured per
 *     registry in `.turbo-stack.json`'s `config.registries`). Protects against a
 *     compromised registry host, which a self-embedded checksum alone cannot.
 *
 * The canonical form is the integrity *contract*: producer and consumer MUST
 * serialize identically, so it is defined here once and reused everywhere.
 */

const enc = new TextEncoder();

function sorted(values: string[]): string[] {
  return [...values].sort();
}

/**
 * Deterministic serialization of an item's security-relevant fields. Cosmetic
 * metadata (title, description, docs, categories, author, meta) is excluded so
 * it can change without invalidating the checksum; everything that affects what
 * runs or what gets installed is included.
 */
export function canonicalizeItem(item: PackageRegistryItem): string {
  const files = item.files
    .map((f) => ({ path: f.path, target: f.target ?? "", content: f.content ?? "" }))
    .sort((a, b) => a.path.localeCompare(b.path));
  const envVars = Object.fromEntries(
    Object.entries(item.envVars).sort(([a], [b]) => a.localeCompare(b)),
  );
  return JSON.stringify({
    name: item.name,
    type: item.type,
    build: item.build,
    environment: item.environment ?? null,
    lib: item.lib ?? null,
    exports: sorted(item.exports),
    dependencies: sorted(item.dependencies),
    devDependencies: sorted(item.devDependencies),
    registryDependencies: sorted(item.registryDependencies),
    envVars,
    files,
  });
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function b64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const bytes = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function bytesToB64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/** `sha256-<hex>` over the canonical item. */
export async function computeChecksum(item: PackageRegistryItem): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(canonicalizeItem(item)));
  return `sha256-${toHex(digest)}`;
}

const ED25519 = { name: "Ed25519" } as const;

/** Sign a checksum with a base64 PKCS8 Ed25519 private key → base64 signature. */
export async function signChecksum(checksum: string, privateKeyB64: string): Promise<string> {
  const key = await crypto.subtle.importKey("pkcs8", b64ToBytes(privateKeyB64), ED25519, false, [
    "sign",
  ]);
  const sig = await crypto.subtle.sign(ED25519, key, enc.encode(checksum));
  return bytesToB64(new Uint8Array(sig));
}

/** Verify a base64 signature over a checksum with a base64 SPKI public key. */
export async function verifySignature(
  checksum: string,
  signatureB64: string,
  publicKeyB64: string,
): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey("spki", b64ToBytes(publicKeyB64), ED25519, false, [
      "verify",
    ]);
    return await crypto.subtle.verify(ED25519, key, b64ToBytes(signatureB64), enc.encode(checksum));
  } catch {
    return false;
  }
}
