import { afterEach, describe, expect, it } from "vitest";
import { createFixture, removeFixture } from "../test-utils/fixture";
import { detectPackageManager } from "./package-manager";

let tmp: string;

afterEach(async () => {
  if (tmp) await removeFixture(tmp);
});

describe("detectPackageManager", () => {
  // ---------------------------------------------------------------------------
  // Certain detections via lockfile
  // ---------------------------------------------------------------------------

  it("detects bun via bun.lock (text lockfile)", async () => {
    tmp = await createFixture({ "bun.lock": "" });
    const r = await detectPackageManager(tmp);
    expect(r.value).toBe("bun");
    expect(r.confidence).toBe("certain");
    expect(r.reason).toMatch(/bun\.lock/);
  });

  it("detects bun via bun.lockb (binary lockfile)", async () => {
    tmp = await createFixture({ "bun.lockb": "" });
    const r = await detectPackageManager(tmp);
    expect(r.value).toBe("bun");
    expect(r.confidence).toBe("certain");
    expect(r.reason).toMatch(/bun\.lockb/);
  });

  it("detects pnpm via pnpm-lock.yaml", async () => {
    tmp = await createFixture({ "pnpm-lock.yaml": "lockfileVersion: '9.0'" });
    const r = await detectPackageManager(tmp);
    expect(r.value).toBe("pnpm");
    expect(r.confidence).toBe("certain");
  });

  it("detects yarn via yarn.lock", async () => {
    tmp = await createFixture({ "yarn.lock": "# yarn lockfile v1" });
    const r = await detectPackageManager(tmp);
    expect(r.value).toBe("yarn");
    expect(r.confidence).toBe("certain");
  });

  it("detects npm via package-lock.json", async () => {
    tmp = await createFixture({
      "package-lock.json": JSON.stringify({ lockfileVersion: 3 }),
    });
    const r = await detectPackageManager(tmp);
    expect(r.value).toBe("npm");
    expect(r.confidence).toBe("certain");
  });

  // ---------------------------------------------------------------------------
  // Priority: bun.lock wins over other lockfiles present simultaneously
  // ---------------------------------------------------------------------------

  it("prefers bun.lock over pnpm-lock.yaml when both present", async () => {
    tmp = await createFixture({ "bun.lock": "", "pnpm-lock.yaml": "" });
    const r = await detectPackageManager(tmp);
    expect(r.value).toBe("bun");
  });

  it("prefers bun.lock over yarn.lock when both present", async () => {
    tmp = await createFixture({ "bun.lock": "", "yarn.lock": "" });
    const r = await detectPackageManager(tmp);
    expect(r.value).toBe("bun");
  });

  it("prefers bun.lockb over pnpm-lock.yaml when bun.lock absent", async () => {
    tmp = await createFixture({ "bun.lockb": "", "pnpm-lock.yaml": "" });
    const r = await detectPackageManager(tmp);
    expect(r.value).toBe("bun");
  });

  it("prefers pnpm-lock.yaml over yarn.lock", async () => {
    tmp = await createFixture({ "pnpm-lock.yaml": "", "yarn.lock": "" });
    const r = await detectPackageManager(tmp);
    expect(r.value).toBe("pnpm");
  });

  it("prefers yarn.lock over package-lock.json", async () => {
    tmp = await createFixture({ "yarn.lock": "", "package-lock.json": "{}" });
    const r = await detectPackageManager(tmp);
    expect(r.value).toBe("yarn");
  });

  // ---------------------------------------------------------------------------
  // Default / fallback
  // ---------------------------------------------------------------------------

  it("defaults to bun with low confidence when no lockfile found", async () => {
    tmp = await createFixture({ "package.json": { name: "test" } });
    const r = await detectPackageManager(tmp);
    expect(r.value).toBe("bun");
    expect(r.confidence).toBe("low");
  });

  it("defaults to bun for completely empty directory", async () => {
    const { mkdtemp } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    tmp = await mkdtemp(`${tmpdir()}/empty-`);
    const r = await detectPackageManager(tmp);
    expect(r.value).toBe("bun");
    expect(r.confidence).toBe("low");
  });

  it("returns low confidence reason in reason field", async () => {
    tmp = await createFixture({ "readme.md": "" });
    const r = await detectPackageManager(tmp);
    expect(r.reason.length).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  it("does not pick up lockfiles inside subdirectories", async () => {
    tmp = await createFixture({ "apps/web/bun.lock": "" });
    const r = await detectPackageManager(tmp);
    // Root has no lockfile → default
    expect(r.confidence).toBe("low");
  });

  it("handles non-existent root path gracefully → default bun", async () => {
    const r = await detectPackageManager("/tmp/this-path-should-not-exist-xyzxyz");
    expect(r.value).toBe("bun");
    expect(r.confidence).toBe("low");
  });

  it("bun.lock content is irrelevant — detection is presence-based", async () => {
    tmp = await createFixture({ "bun.lock": "this is not a real lockfile" });
    const r = await detectPackageManager(tmp);
    expect(r.value).toBe("bun");
    expect(r.confidence).toBe("certain");
  });
});
