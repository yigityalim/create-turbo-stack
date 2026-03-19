import { afterEach, describe, expect, it } from "vitest";
import { createFixture, removeFixture } from "../test-utils/fixture";
import { detectAuth } from "./auth";

let tmp: string;

afterEach(async () => {
  if (tmp) await removeFixture(tmp);
});

describe("detectAuth", () => {
  // ---------------------------------------------------------------------------
  // packages/auth — certain
  // ---------------------------------------------------------------------------

  it("detects clerk via @clerk/nextjs in packages/auth", async () => {
    tmp = await createFixture({
      "packages/auth/package.json": {
        dependencies: { "@clerk/nextjs": "^5.0.0" },
      },
    });
    const r = await detectAuth(tmp);
    expect(r.value.provider).toBe("clerk");
    expect(r.confidence).toBe("certain");
  });

  it("detects better-auth via better-auth in packages/auth", async () => {
    tmp = await createFixture({
      "packages/auth/package.json": {
        dependencies: { "better-auth": "^1.0.0" },
      },
    });
    const r = await detectAuth(tmp);
    expect(r.value.provider).toBe("better-auth");
    expect(r.confidence).toBe("certain");
  });

  it("detects next-auth via next-auth in packages/auth", async () => {
    tmp = await createFixture({
      "packages/auth/package.json": { dependencies: { "next-auth": "^4.0.0" } },
    });
    const r = await detectAuth(tmp);
    expect(r.value.provider).toBe("next-auth");
    expect(r.confidence).toBe("certain");
  });

  it("detects lucia via lucia in packages/auth", async () => {
    tmp = await createFixture({
      "packages/auth/package.json": { dependencies: { lucia: "^3.0.0" } },
    });
    const r = await detectAuth(tmp);
    expect(r.value.provider).toBe("lucia");
    expect(r.confidence).toBe("certain");
  });

  // ---------------------------------------------------------------------------
  // Supabase auth via packages/db — high
  // ---------------------------------------------------------------------------

  it("detects supabase-auth via @supabase/ssr in packages/db", async () => {
    tmp = await createFixture({
      "packages/db/package.json": {
        dependencies: { "@supabase/ssr": "^0.5.0" },
      },
    });
    const r = await detectAuth(tmp);
    expect(r.value.provider).toBe("supabase-auth");
    expect(r.confidence).toBe("high");
  });

  it("supabase-auth only detected from packages/db — NOT packages/auth", async () => {
    // If packages/auth is absent and packages/db has @supabase/ssr
    tmp = await createFixture({
      "packages/db/package.json": {
        dependencies: {
          "@supabase/ssr": "^0.5.0",
          "@supabase/supabase-js": "^2.0.0",
        },
      },
    });
    const r = await detectAuth(tmp);
    expect(r.value.provider).toBe("supabase-auth");
  });

  // ---------------------------------------------------------------------------
  // Root package.json fallbacks — high
  // ---------------------------------------------------------------------------

  it("detects clerk from root package.json — high confidence", async () => {
    tmp = await createFixture({
      "package.json": { dependencies: { "@clerk/nextjs": "^5.0.0" } },
    });
    const r = await detectAuth(tmp);
    expect(r.value.provider).toBe("clerk");
    expect(r.confidence).toBe("high");
  });

  it("detects next-auth from root package.json — high confidence", async () => {
    tmp = await createFixture({
      "package.json": { dependencies: { "next-auth": "^4.0.0" } },
    });
    const r = await detectAuth(tmp);
    expect(r.value.provider).toBe("next-auth");
    expect(r.confidence).toBe("high");
  });

  // ---------------------------------------------------------------------------
  // Priority: packages/auth over root
  // ---------------------------------------------------------------------------

  it("prefers packages/auth over root package.json", async () => {
    tmp = await createFixture({
      "packages/auth/package.json": { dependencies: { lucia: "^3.0.0" } },
      "package.json": { dependencies: { "@clerk/nextjs": "^5.0.0" } },
    });
    const r = await detectAuth(tmp);
    expect(r.value.provider).toBe("lucia");
    expect(r.confidence).toBe("certain");
  });

  // ---------------------------------------------------------------------------
  // Default values on Auth object
  // ---------------------------------------------------------------------------

  it("always sets rbac: false by default", async () => {
    tmp = await createFixture({
      "packages/auth/package.json": {
        dependencies: { "@clerk/nextjs": "^5.0.0" },
      },
    });
    const r = await detectAuth(tmp);
    expect(r.value.rbac).toBe(false);
  });

  it("always sets entitlements: false by default", async () => {
    tmp = await createFixture({
      "packages/auth/package.json": { dependencies: { lucia: "^3.0.0" } },
    });
    const r = await detectAuth(tmp);
    expect(r.value.entitlements).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // None
  // ---------------------------------------------------------------------------

  it("returns none/medium when no auth provider detected", async () => {
    tmp = await createFixture({ "package.json": { name: "bare" } });
    const r = await detectAuth(tmp);
    expect(r.value.provider).toBe("none");
    expect(r.confidence).toBe("medium");
  });

  it("returns none when packages/auth has no recognized deps", async () => {
    tmp = await createFixture({
      "packages/auth/package.json": {
        dependencies: { "some-random-pkg": "^1.0.0" },
      },
    });
    const r = await detectAuth(tmp);
    expect(r.value.provider).toBe("none");
  });

  it("returns none when packages/auth exists with empty package.json", async () => {
    tmp = await createFixture({ "packages/auth/package.json": "" });
    const r = await detectAuth(tmp);
    expect(r.value.provider).toBe("none");
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  it("handles malformed packages/auth/package.json gracefully", async () => {
    const fs = await import("node:fs/promises");
    const os = await import("node:os");
    tmp = await fs.mkdtemp(`${os.tmpdir()}/auth-malform-`);
    await fs.mkdir(`${tmp}/packages/auth`, { recursive: true });
    await fs.writeFile(`${tmp}/packages/auth/package.json`, "INVALID");
    const r = await detectAuth(tmp);
    expect(r.value.provider).toBe("none");
  });

  it("does not detect auth from apps/ packages — only dedicated packages/auth or root", async () => {
    tmp = await createFixture({
      "apps/web/package.json": { dependencies: { "@clerk/nextjs": "^5.0.0" } },
    });
    const r = await detectAuth(tmp);
    // No root or packages/auth → none
    expect(r.value.provider).toBe("none");
  });
});
