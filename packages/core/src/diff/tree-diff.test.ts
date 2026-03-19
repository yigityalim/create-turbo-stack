import { describe, expect, it } from "vitest";
import { applyMutations, diffTree } from "./tree-diff";

// ---------------------------------------------------------------------------
// diffTree
// ---------------------------------------------------------------------------

describe("diffTree", () => {
  it("marks new files as create", () => {
    const existing = new Map<string, string>();
    const desired = [{ path: "src/index.ts", content: "export {};", isDirectory: false }];

    const diff = diffTree(existing, desired);
    expect(diff.create).toHaveLength(1);
    expect(diff.create[0].path).toBe("src/index.ts");
    expect(diff.update).toHaveLength(0);
    expect(diff.unchanged).toHaveLength(0);
  });

  it("marks identical files as unchanged", () => {
    const existing = new Map([["src/index.ts", "export {};"]]);
    const desired = [{ path: "src/index.ts", content: "export {};", isDirectory: false }];

    const diff = diffTree(existing, desired);
    expect(diff.create).toHaveLength(0);
    expect(diff.update).toHaveLength(0);
    expect(diff.unchanged).toEqual(["src/index.ts"]);
  });

  it("marks changed files as update", () => {
    const existing = new Map([["src/index.ts", "export {};"]]);
    const desired = [{ path: "src/index.ts", content: "export const x = 1;", isDirectory: false }];

    const diff = diffTree(existing, desired);
    expect(diff.create).toHaveLength(0);
    expect(diff.update).toHaveLength(1);
    expect(diff.update[0].path).toBe("src/index.ts");
    expect(diff.unchanged).toHaveLength(0);
  });

  it("skips directory nodes", () => {
    const existing = new Map<string, string>();
    const desired = [{ path: "src", content: undefined, isDirectory: true }];

    const diff = diffTree(existing, desired);
    expect(diff.create).toHaveLength(0);
    expect(diff.update).toHaveLength(0);
    expect(diff.unchanged).toHaveLength(0);
  });

  it("handles mixed create, update, unchanged", () => {
    const existing = new Map([
      ["a.ts", "old"],
      ["b.ts", "same"],
    ]);
    const desired = [
      { path: "a.ts", content: "new", isDirectory: false },
      { path: "b.ts", content: "same", isDirectory: false },
      { path: "c.ts", content: "brand new", isDirectory: false },
    ];

    const diff = diffTree(existing, desired);
    expect(diff.create).toHaveLength(1);
    expect(diff.create[0].path).toBe("c.ts");
    expect(diff.update).toHaveLength(1);
    expect(diff.update[0].path).toBe("a.ts");
    expect(diff.unchanged).toEqual(["b.ts"]);
  });

  it("produces JSON mutations for .json files", () => {
    const existing = new Map([
      ["package.json", JSON.stringify({ name: "test", dependencies: {} }, null, 2)],
    ]);
    const desired = [
      {
        path: "package.json",
        content: JSON.stringify({ name: "test", dependencies: { foo: "1.0.0" } }, null, 2),
        isDirectory: false,
      },
    ];

    const diff = diffTree(existing, desired);
    expect(diff.update).toHaveLength(1);
    const mutations = diff.update[0].mutations;
    expect(mutations.some((m) => m.type === "append-to-json")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// applyMutations
// ---------------------------------------------------------------------------

describe("applyMutations", () => {
  it("applies overwrite mutation", () => {
    const result = applyMutations("old content", [{ type: "overwrite", content: "new content" }]);
    expect(result).toBe("new content");
  });

  it("applies insert-line mutation with string match", () => {
    const result = applyMutations("line1\nline2\nline3", [
      { type: "insert-line", after: "line2", content: "inserted" },
    ]);
    expect(result).toBe("line1\nline2\ninserted\nline3");
  });

  it("applies append-to-json mutation", () => {
    const input = JSON.stringify({ name: "test" }, null, 2);
    const result = applyMutations(input, [
      { type: "append-to-json", jsonPath: ["version"], value: "1.0.0" },
    ]);
    const parsed = JSON.parse(result);
    expect(parsed.version).toBe("1.0.0");
  });

  it("applies insert-css-source after existing @source", () => {
    const css = '@import "tailwindcss";\n@source "../../src";\n\n.foo {}';
    const result = applyMutations(css, [
      { type: "insert-css-source", directive: '@source "../../../../packages/ui/src";' },
    ]);
    expect(result).toContain('@source "../../src";');
    expect(result).toContain('@source "../../../../packages/ui/src";');
    // New source should be after existing source
    const srcIdx = result.indexOf('@source "../../src";');
    const uiIdx = result.indexOf('@source "../../../../packages/ui/src";');
    expect(uiIdx).toBeGreaterThan(srcIdx);
  });

  it("applies insert-css-source after @import when no @source exists", () => {
    const css = '@import "tailwindcss";\n\n.foo {}';
    const result = applyMutations(css, [
      { type: "insert-css-source", directive: '@source "../../src";' },
    ]);
    expect(result).toContain('@source "../../src";');
  });

  it("applies multiple mutations in order", () => {
    const input = JSON.stringify({ name: "test" }, null, 2);
    const result = applyMutations(input, [
      { type: "append-to-json", jsonPath: ["version"], value: "1.0.0" },
      { type: "append-to-json", jsonPath: ["description"], value: "A test package" },
    ]);
    const parsed = JSON.parse(result);
    expect(parsed.version).toBe("1.0.0");
    expect(parsed.description).toBe("A test package");
  });
});
