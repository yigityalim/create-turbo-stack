import { afterEach, describe, expect, it } from "vitest";
import { createFixture, removeFixture } from "../test-utils/fixture";
import { detectApi } from "./api";

let tmp: string;

afterEach(async () => {
  if (tmp) await removeFixture(tmp);
});

describe("detectApi", () => {
  // tRPC — certain

  it("detects tRPC via @trpc/server in packages/api", async () => {
    tmp = await createFixture({
      "packages/api/package.json": {
        dependencies: { "@trpc/server": "^11.0.0" },
      },
    });
    const r = await detectApi(tmp);
    expect(r.value.strategy).toBe("trpc");
    expect(r.confidence).toBe("certain");
    expect(r.reason).toMatch(/packages\/api/);
  });

  it("detects tRPC when @trpc/server is in devDependencies", async () => {
    tmp = await createFixture({
      "packages/api/package.json": {
        devDependencies: { "@trpc/server": "^11.0.0" },
      },
    });
    const r = await detectApi(tmp);
    expect(r.value.strategy).toBe("trpc");
  });

  // Hono in packages/api — certain

  it("detects hono via hono in packages/api", async () => {
    tmp = await createFixture({
      "packages/api/package.json": { dependencies: { hono: "^4.0.0" } },
    });
    const r = await detectApi(tmp);
    expect(r.value.strategy).toBe("hono");
    expect(r.confidence).toBe("certain");
  });

  // tRPC takes priority over hono in packages/api

  it("prefers tRPC over hono when both in packages/api", async () => {
    tmp = await createFixture({
      "packages/api/package.json": {
        dependencies: { "@trpc/server": "^11.0.0", hono: "^4.0.0" },
      },
    });
    const r = await detectApi(tmp);
    expect(r.value.strategy).toBe("trpc");
  });

  // REST via Next.js — medium

  it("detects rest-nextjs when Next.js app exists and packages/api is absent", async () => {
    tmp = await createFixture({
      "apps/web/package.json": { dependencies: { next: "15.0.0" } },
    });
    const r = await detectApi(tmp);
    expect(r.value.strategy).toBe("rest-nextjs");
    expect(r.confidence).toBe("medium");
  });

  it("does NOT mark as rest-nextjs if packages/api already identified (even without next dep)", async () => {
    // packages/api exists but has no recognized dep → still beats apps fallback
    // Actually the code: if pkg exists (any pkg.json in packages/api), only checks hasDep.
    // If no recognized dep → falls through to check apps
    tmp = await createFixture({
      "packages/api/package.json": { name: "custom-api" }, // no recognized dep
      "apps/web/package.json": { dependencies: { next: "15.0.0" } },
    });
    const r = await detectApi(tmp);
    // Code logic: pkg exists but no trpc/hono → falls through to apps loop
    // apps has next but pkg != null → returns none per the condition `if (!pkg)`
    expect(r.value.strategy).toBe("none");
  });

  it("detects rest-nextjs with multiple Next.js apps", async () => {
    tmp = await createFixture({
      "apps/web/package.json": { dependencies: { next: "15.0.0" } },
      "apps/docs/package.json": { dependencies: { next: "14.0.0" } },
    });
    const r = await detectApi(tmp);
    expect(r.value.strategy).toBe("rest-nextjs");
  });

  // None

  it("returns none/medium when no API layer detected", async () => {
    tmp = await createFixture({ "package.json": { name: "bare" } });
    const r = await detectApi(tmp);
    expect(r.value.strategy).toBe("none");
    expect(r.confidence).toBe("medium");
  });

  it("returns none when apps dir is empty", async () => {
    const fs = await import("node:fs/promises");
    const os = await import("node:os");
    tmp = await fs.mkdtemp(`${os.tmpdir()}/api-empty-`);
    await fs.mkdir(`${tmp}/apps`, { recursive: true });
    const r = await detectApi(tmp);
    expect(r.value.strategy).toBe("none");
  });

  it("returns none when app has expo (not next)", async () => {
    tmp = await createFixture({
      "apps/mobile/package.json": { dependencies: { expo: "~52.0.0" } },
    });
    const r = await detectApi(tmp);
    expect(r.value.strategy).toBe("none");
  });

  // Edge cases

  it("packages/api with empty package.json → falls through to none", async () => {
    tmp = await createFixture({ "packages/api/package.json": "" });
    const r = await detectApi(tmp);
    expect(r.value.strategy).toBe("none");
  });

  it("packages/api with malformed package.json → treated as absent", async () => {
    const fs = await import("node:fs/promises");
    const os = await import("node:os");
    tmp = await fs.mkdtemp(`${os.tmpdir()}/api-malform-`);
    await fs.mkdir(`${tmp}/packages/api`, { recursive: true });
    await fs.writeFile(`${tmp}/packages/api/package.json`, "NOT JSON");
    const r = await detectApi(tmp);
    expect(r.value.strategy).toBe("none");
  });
});
