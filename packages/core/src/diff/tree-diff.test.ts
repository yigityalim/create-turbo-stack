import { describe, expect, it } from "vitest";
import { applyMutations, diffTree } from "./tree-diff";

// diffTree

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

  it("delete is empty when previousNodes not provided", () => {
    const existing = new Map([["a.ts", "x"]]);
    const desired = [{ path: "b.ts", content: "y", isDirectory: false }];

    const diff = diffTree(existing, desired);
    expect(diff.delete).toEqual([]);
  });

  it("marks files present in previousNodes but absent in desired as delete", () => {
    const existing = new Map([
      ["keep.ts", "k"],
      ["drop.ts", "d"],
    ]);
    const desired = [{ path: "keep.ts", content: "k", isDirectory: false }];
    const previous = [
      { path: "keep.ts", content: "k", isDirectory: false },
      { path: "drop.ts", content: "d", isDirectory: false },
    ];

    const diff = diffTree(existing, desired, { previousNodes: previous });
    expect(diff.delete).toEqual(["drop.ts"]);
    expect(diff.unchanged).toEqual(["keep.ts"]);
  });

  it("does not mark a file as delete if it survives in desired", () => {
    const existing = new Map([["x.ts", "v1"]]);
    const desired = [{ path: "x.ts", content: "v2", isDirectory: false }];
    const previous = [{ path: "x.ts", content: "v1", isDirectory: false }];

    const diff = diffTree(existing, desired, { previousNodes: previous });
    expect(diff.delete).toEqual([]);
    expect(diff.update).toHaveLength(1);
  });

  it("ignores directory entries when computing deletions", () => {
    const previous = [
      { path: "old", content: undefined, isDirectory: true },
      { path: "old/file.ts", content: "x", isDirectory: false },
    ];
    const diff = diffTree(new Map(), [], { previousNodes: previous });
    expect(diff.delete).toEqual(["old/file.ts"]);
  });

  // JSON deep merge — preserves user-authored keys

  it("preserves user-authored package.json scripts when applying update", () => {
    const existing = JSON.stringify(
      {
        name: "web",
        scripts: {
          dev: "next dev -p 3000",
          custom: "echo hi",
        },
      },
      null,
      2,
    );
    const desired = JSON.stringify(
      {
        name: "web",
        scripts: {
          dev: "next dev --turbopack -p 3000",
          build: "next build",
        },
      },
      null,
      2,
    );

    const diff = diffTree(new Map([["package.json", existing]]), [
      { path: "package.json", content: desired, isDirectory: false },
    ]);
    expect(diff.update).toHaveLength(1);

    const merged = applyMutations(existing, diff.update[0].mutations);
    const obj = JSON.parse(merged);
    expect(obj.scripts.dev).toBe("next dev --turbopack -p 3000"); // overwritten
    expect(obj.scripts.build).toBe("next build"); // added
    expect(obj.scripts.custom).toBe("echo hi"); // preserved
  });

  it("emits a leaf-level mutation rather than overwriting the parent object", () => {
    const existing = JSON.stringify({ a: { x: 1, y: 2 } });
    const desired = JSON.stringify({ a: { x: 99 } });

    const diff = diffTree(new Map([["c.json", existing]]), [
      { path: "c.json", content: desired, isDirectory: false },
    ]);
    expect(diff.update[0].mutations).toEqual([
      { type: "append-to-json", jsonPath: ["a", "x"], value: 99 },
    ]);

    const merged = JSON.parse(applyMutations(existing, diff.update[0].mutations));
    expect(merged).toEqual({ a: { x: 99, y: 2 } });
  });

  it("emits no mutations when desired matches existing exactly", () => {
    const same = JSON.stringify({ a: 1, b: { c: 2 } });
    const diff = diffTree(new Map([["x.json", same]]), [
      { path: "x.json", content: same, isDirectory: false },
    ]);
    expect(diff.update).toHaveLength(0);
    expect(diff.unchanged).toEqual(["x.json"]);
  });

  // Conflict detection — tells "we wrote this" from "user edited this"

  it("classifies update as clean when disk matches the previous scaffold output", () => {
    const existing = "v1";
    const previous = [{ path: "f.ts", content: "v1", isDirectory: false }];
    const desired = [{ path: "f.ts", content: "v2", isDirectory: false }];

    const diff = diffTree(new Map([["f.ts", existing]]), desired, { previousNodes: previous });
    expect(diff.update).toHaveLength(1);
    expect(diff.conflict).toHaveLength(0);
  });

  it("classifies update as conflict when disk has user edits since last scaffold", () => {
    const userEdited = "v1 + my change";
    const previous = [{ path: "f.ts", content: "v1", isDirectory: false }];
    const desired = [{ path: "f.ts", content: "v2", isDirectory: false }];

    const diff = diffTree(new Map([["f.ts", userEdited]]), desired, { previousNodes: previous });
    expect(diff.update).toHaveLength(0);
    expect(diff.conflict).toHaveLength(1);
    expect(diff.conflict[0].path).toBe("f.ts");
    expect(diff.conflict[0].userContent).toBe(userEdited);
  });

  it("classifies as conflict when path is on disk but absent from previousNodes", () => {
    // User-authored file in our scaffold path: we never wrote it before.
    const desired = [{ path: "f.ts", content: "ours", isDirectory: false }];
    const diff = diffTree(new Map([["f.ts", "user wrote this"]]), desired, {
      previousNodes: [],
    });
    expect(diff.update).toHaveLength(0);
    expect(diff.conflict).toHaveLength(1);
  });

  it("falls back to update (legacy) when previousNodes is not provided", () => {
    const diff = diffTree(new Map([["f.ts", "old"]]), [
      { path: "f.ts", content: "new", isDirectory: false },
    ]);
    expect(diff.update).toHaveLength(1);
    expect(diff.conflict).toHaveLength(0);
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

// applyMutations

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
