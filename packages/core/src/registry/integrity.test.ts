import type { PackageRegistryItem } from "@create-turbo-stack/schema";
import { describe, expect, it } from "vitest";
import { canonicalizeItem, computeChecksum, signChecksum, verifySignature } from "./integrity";

function item(overrides: Partial<PackageRegistryItem> = {}): PackageRegistryItem {
  return {
    name: "demo",
    type: "registry:package",
    description: "x",
    dependencies: [],
    devDependencies: [],
    registryDependencies: [],
    envVars: {},
    exports: ["."],
    build: "none",
    categories: [],
    files: [{ path: "src/index.ts", content: "export const x = 1;\n", type: "registry:source" }],
    ...overrides,
  };
}

describe("canonicalizeItem", () => {
  it("ignores cosmetic fields", () => {
    const a = canonicalizeItem(
      item({ title: "A", description: "one", docs: "x", categories: ["a"] }),
    );
    const b = canonicalizeItem(
      item({ title: "B", description: "two", docs: "y", categories: ["b"] }),
    );
    expect(a).toBe(b);
  });

  it("reacts to file content", () => {
    const a = canonicalizeItem(item());
    const b = canonicalizeItem(
      item({
        files: [
          { path: "src/index.ts", content: "export const x = 2;\n", type: "registry:source" },
        ],
      }),
    );
    expect(a).not.toBe(b);
  });

  it("reacts to the dependency graph", () => {
    const a = canonicalizeItem(item());
    const b = canonicalizeItem(item({ dependencies: ["evil@1.0.0"] }));
    expect(a).not.toBe(b);
  });

  it("is order-independent for deps and stable for files", () => {
    const a = canonicalizeItem(item({ dependencies: ["a@1", "b@1"], exports: [".", "./x"] }));
    const b = canonicalizeItem(item({ dependencies: ["b@1", "a@1"], exports: ["./x", "."] }));
    expect(a).toBe(b);
  });
});

describe("computeChecksum", () => {
  it("is deterministic and sha256-prefixed", async () => {
    const a = await computeChecksum(item());
    const b = await computeChecksum(item());
    expect(a).toBe(b);
    expect(a).toMatch(/^sha256-[0-9a-f]{64}$/);
  });
});

describe("signChecksum / verifySignature", () => {
  it("round-trips and rejects a wrong key", async () => {
    const k1 = (await crypto.subtle.generateKey({ name: "Ed25519" }, true, [
      "sign",
      "verify",
    ])) as CryptoKeyPair;
    const k2 = (await crypto.subtle.generateKey({ name: "Ed25519" }, true, [
      "sign",
      "verify",
    ])) as CryptoKeyPair;
    const b64 = (buf: ArrayBuffer) => {
      let bin = "";
      for (const byte of new Uint8Array(buf)) bin += String.fromCharCode(byte);
      return btoa(bin);
    };
    const priv = b64(await crypto.subtle.exportKey("pkcs8", k1.privateKey));
    const pub1 = b64(await crypto.subtle.exportKey("spki", k1.publicKey));
    const pub2 = b64(await crypto.subtle.exportKey("spki", k2.publicKey));

    const checksum = await computeChecksum(item());
    const sig = await signChecksum(checksum, priv);

    expect(await verifySignature(checksum, sig, pub1)).toBe(true);
    expect(await verifySignature(checksum, sig, pub2)).toBe(false);
    expect(await verifySignature(`${checksum}tampered`, sig, pub1)).toBe(false);
  });
});
