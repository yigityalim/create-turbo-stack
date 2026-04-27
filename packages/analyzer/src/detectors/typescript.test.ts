import { afterEach, describe, expect, it } from "vitest";
import { createFixture, removeFixture } from "../test-utils/fixture";
import { detectTypescript } from "./typescript";

let tmp: string;

afterEach(async () => {
  if (tmp) await removeFixture(tmp);
});

describe("detectTypescript", () => {
  // strict: true — certain

  it("detects strict mode when strict: true", async () => {
    tmp = await createFixture({
      "tsconfig.json": { compilerOptions: { strict: true } },
    });
    const r = await detectTypescript(tmp);
    expect(r.value).toBe("strict");
    expect(r.confidence).toBe("certain");
  });

  it("detects strict with other options alongside", async () => {
    tmp = await createFixture({
      "tsconfig.json": {
        compilerOptions: {
          strict: true,
          target: "ES2022",
          noUncheckedIndexedAccess: true,
        },
      },
    });
    const r = await detectTypescript(tmp);
    expect(r.value).toBe("strict");
    expect(r.confidence).toBe("certain");
  });

  // strict: false — certain/relaxed

  it("detects relaxed when strict: false", async () => {
    tmp = await createFixture({
      "tsconfig.json": { compilerOptions: { strict: false } },
    });
    const r = await detectTypescript(tmp);
    expect(r.value).toBe("relaxed");
    expect(r.confidence).toBe("certain");
  });

  // strictNullChecks fallback — high

  it("infers strict from strictNullChecks: true when strict absent", async () => {
    tmp = await createFixture({
      "tsconfig.json": { compilerOptions: { strictNullChecks: true } },
    });
    const r = await detectTypescript(tmp);
    expect(r.value).toBe("strict");
    expect(r.confidence).toBe("high");
  });

  it("does not infer strict from strictNullChecks: false", async () => {
    tmp = await createFixture({
      "tsconfig.json": { compilerOptions: { strictNullChecks: false } },
    });
    const r = await detectTypescript(tmp);
    // strictNullChecks false with no strict → relaxed/medium
    expect(r.value).toBe("relaxed");
    expect(r.confidence).toBe("medium");
  });

  // No strict setting — medium

  it("returns relaxed/medium when tsconfig has no compilerOptions", async () => {
    tmp = await createFixture({ "tsconfig.json": { include: ["src"] } });
    const r = await detectTypescript(tmp);
    expect(r.value).toBe("relaxed");
    expect(r.confidence).toBe("medium");
  });

  it("returns relaxed/medium when compilerOptions exists but no strict-related flags", async () => {
    tmp = await createFixture({
      "tsconfig.json": {
        compilerOptions: { target: "ES2022", module: "ESNext" },
      },
    });
    const r = await detectTypescript(tmp);
    expect(r.value).toBe("relaxed");
    expect(r.confidence).toBe("medium");
  });

  // No tsconfig — low

  it("defaults to strict/low when no tsconfig.json found", async () => {
    const { mkdtemp } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    tmp = await mkdtemp(`${tmpdir()}/ts-no-config-`);
    const r = await detectTypescript(tmp);
    expect(r.value).toBe("strict");
    expect(r.confidence).toBe("low");
  });

  it("defaults to strict/low when tsconfig.json is empty", async () => {
    tmp = await createFixture({ "tsconfig.json": "" });
    const r = await detectTypescript(tmp);
    expect(r.value).toBe("strict");
    expect(r.confidence).toBe("low");
  });

  it("defaults to strict/low when tsconfig.json is malformed JSON", async () => {
    const fs = await import("node:fs/promises");
    const os = await import("node:os");
    tmp = await fs.mkdtemp(`${os.tmpdir()}/ts-malform-`);
    await fs.writeFile(`${tmp}/tsconfig.json`, "NOT JSON");
    const r = await detectTypescript(tmp);
    expect(r.value).toBe("strict");
    expect(r.confidence).toBe("low");
  });

  // Edge cases

  it("ignores tsconfig in subdirectory — reads only root tsconfig.json", async () => {
    tmp = await createFixture({
      "apps/web/tsconfig.json": { compilerOptions: { strict: true } },
    });
    const r = await detectTypescript(tmp);
    // No root tsconfig → low
    expect(r.confidence).toBe("low");
  });

  it("handles tsconfig with null compilerOptions", async () => {
    tmp = await createFixture({ "tsconfig.json": { compilerOptions: null } });
    const r = await detectTypescript(tmp);
    expect(r.value).toBe("relaxed");
    expect(r.confidence).toBe("medium");
  });

  it("strict: 1 (truthy but not boolean true) → not detected as certain strict", async () => {
    tmp = await createFixture({
      "tsconfig.json": { compilerOptions: { strict: 1 } },
    });
    const r = await detectTypescript(tmp);
    // strict === true is checked, 1 !== true → falls through
    expect(r.confidence).not.toBe("certain");
  });
});
