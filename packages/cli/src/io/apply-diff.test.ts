import { describe, expect, it } from "vitest";
import { resolveOnConflict } from "./apply-diff";

type ConflictPolicy = "prompt" | "keep" | "overwrite" | "abort";

function projectConfig(conflictPolicy?: ConflictPolicy) {
  return conflictPolicy !== undefined ? { config: { conflictPolicy } } : undefined;
}

function userConfig(conflictPolicy?: ConflictPolicy) {
  return conflictPolicy !== undefined ? { conflictPolicy } : undefined;
}

// ─── resolveOnConflict ────────────────────────────────────────────────────────

describe("resolveOnConflict — no config", () => {
  it("returns undefined when both configs are absent", () => {
    expect(resolveOnConflict(undefined, undefined)).toBeUndefined();
  });

  it("returns undefined when project config has no conflictPolicy", () => {
    expect(resolveOnConflict({ config: {} }, undefined)).toBeUndefined();
  });

  it("returns undefined when user config has no conflictPolicy", () => {
    expect(resolveOnConflict(undefined, {})).toBeUndefined();
  });
});

describe("resolveOnConflict — 'keep' maps to 'skip'", () => {
  it("project config 'keep' → 'skip'", () => {
    expect(resolveOnConflict(projectConfig("keep"), undefined)).toBe("skip");
  });

  it("user config 'keep' → 'skip'", () => {
    expect(resolveOnConflict(undefined, userConfig("keep"))).toBe("skip");
  });
});

describe("resolveOnConflict — passthrough policies", () => {
  it("project config 'prompt' → 'prompt'", () => {
    expect(resolveOnConflict(projectConfig("prompt"), undefined)).toBe("prompt");
  });

  it("project config 'overwrite' → 'overwrite'", () => {
    expect(resolveOnConflict(projectConfig("overwrite"), undefined)).toBe("overwrite");
  });

  it("project config 'abort' → 'abort'", () => {
    expect(resolveOnConflict(projectConfig("abort"), undefined)).toBe("abort");
  });

  it("user config 'overwrite' → 'overwrite'", () => {
    expect(resolveOnConflict(undefined, userConfig("overwrite"))).toBe("overwrite");
  });

  it("user config 'abort' → 'abort'", () => {
    expect(resolveOnConflict(undefined, userConfig("abort"))).toBe("abort");
  });
});

describe("resolveOnConflict — project config takes precedence over user config", () => {
  it("project 'overwrite' wins over user 'keep'", () => {
    expect(resolveOnConflict(projectConfig("overwrite"), userConfig("keep"))).toBe("overwrite");
  });

  it("project 'abort' wins over user 'overwrite'", () => {
    expect(resolveOnConflict(projectConfig("abort"), userConfig("overwrite"))).toBe("abort");
  });

  it("project 'keep' → 'skip' even when user has 'abort'", () => {
    expect(resolveOnConflict(projectConfig("keep"), userConfig("abort"))).toBe("skip");
  });

  it("falls back to user config when project has no conflictPolicy", () => {
    expect(resolveOnConflict({ config: {} }, userConfig("overwrite"))).toBe("overwrite");
  });

  it("null project config → falls back to user config", () => {
    expect(resolveOnConflict(null, userConfig("abort"))).toBe("abort");
  });
});
