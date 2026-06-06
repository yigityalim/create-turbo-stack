import { describe, expect, it } from "vitest";
import { parseNodeMajor, whichCommand } from "./doctor";

// ─── parseNodeMajor ───────────────────────────────────────────────────────────

describe("parseNodeMajor", () => {
  it("parses '20.11.0' → 20", () => {
    expect(parseNodeMajor("20.11.0")).toBe(20);
  });

  it("parses '18.19.1' → 18", () => {
    expect(parseNodeMajor("18.19.1")).toBe(18);
  });

  it("parses '22.0.0' → 22", () => {
    expect(parseNodeMajor("22.0.0")).toBe(22);
  });

  it("parses a single-segment string → that number", () => {
    expect(parseNodeMajor("21")).toBe(21);
  });

  it("returns 0 for an empty string", () => {
    expect(parseNodeMajor("")).toBe(0);
  });

  it("returns 0 for a non-numeric string", () => {
    expect(parseNodeMajor("abc.1.0")).toBe(0);
  });
});

// ─── node version minimum check (pure predicate) ─────────────────────────────

describe("node version minimum (major >= 20)", () => {
  const isOk = (versionStr: string) => parseNodeMajor(versionStr) >= 20;

  it("passes for Node 20", () => {
    expect(isOk("20.0.0")).toBe(true);
  });

  it("passes for Node 22", () => {
    expect(isOk("22.0.0")).toBe(true);
  });

  it("fails for Node 18", () => {
    expect(isOk("18.20.0")).toBe(false);
  });

  it("fails for Node 19", () => {
    expect(isOk("19.9.0")).toBe(false);
  });

  it("passes for the current process Node version", () => {
    expect(isOk(process.versions.node)).toBe(true);
  });
});

// ─── whichCommand ─────────────────────────────────────────────────────────────

describe("whichCommand", () => {
  it("returns a non-empty string for 'node'", () => {
    expect(whichCommand("node")).toBeTruthy();
    expect(typeof whichCommand("node")).toBe("string");
  });

  it("includes the binary name in the command", () => {
    expect(whichCommand("bun")).toContain("bun");
    expect(whichCommand("pnpm")).toContain("pnpm");
  });

  it("on this platform, produces the expected prefix", () => {
    const cmd = whichCommand("node");
    if (process.platform === "win32") {
      expect(cmd).toBe("where node");
    } else {
      expect(cmd).toBe("command -v node");
    }
  });
});
