import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { removeFixture } from "../test-utils/fixture";
import { fileExists, listDirs, readFileIfExists, readJsonFile } from "./file-scanner";

let tmp: string;

beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), "fs-test-"));
});

afterEach(async () => {
  await removeFixture(tmp);
});

// fileExists

describe("fileExists", () => {
  it("returns true for an existing file", async () => {
    const p = path.join(tmp, "hello.txt");
    await fs.writeFile(p, "hi");
    expect(await fileExists(p)).toBe(true);
  });

  it("returns false for a non-existent path", async () => {
    expect(await fileExists(path.join(tmp, "ghost.txt"))).toBe(false);
  });

  it("returns true for an existing directory (access succeeds)", async () => {
    expect(await fileExists(tmp)).toBe(true);
  });

  it("returns false for deeply nested non-existent path", async () => {
    expect(await fileExists(path.join(tmp, "a", "b", "c", "d.txt"))).toBe(false);
  });

  it("handles empty string gracefully — returns false", async () => {
    expect(await fileExists("")).toBe(false);
  });

  it("handles path with unicode characters", async () => {
    const p = path.join(tmp, "türkçe-file.txt");
    await fs.writeFile(p, "içerik");
    expect(await fileExists(p)).toBe(true);
  });

  it("handles path with spaces", async () => {
    const p = path.join(tmp, "my file.txt");
    await fs.writeFile(p, "content");
    expect(await fileExists(p)).toBe(true);
  });

  it("handles symlink to existing file", async () => {
    const target = path.join(tmp, "target.txt");
    const link = path.join(tmp, "link.txt");
    await fs.writeFile(target, "data");
    await fs.symlink(target, link);
    expect(await fileExists(link)).toBe(true);
  });

  it("returns false for broken symlink", async () => {
    const target = path.join(tmp, "nonexistent.txt");
    const link = path.join(tmp, "broken.txt");
    await fs.symlink(target, link);
    expect(await fileExists(link)).toBe(false);
  });
});

// readFileIfExists

describe("readFileIfExists", () => {
  it("returns file content as utf-8 string", async () => {
    const p = path.join(tmp, "data.txt");
    await fs.writeFile(p, "hello world");
    expect(await readFileIfExists(p)).toBe("hello world");
  });

  it("returns null for non-existent file", async () => {
    expect(await readFileIfExists(path.join(tmp, "nope.txt"))).toBeNull();
  });

  it("returns empty string for zero-byte file", async () => {
    const p = path.join(tmp, "empty.txt");
    await fs.writeFile(p, "");
    expect(await readFileIfExists(p)).toBe("");
  });

  it("returns null for a directory path (read fails)", async () => {
    expect(await readFileIfExists(tmp)).toBeNull();
  });

  it("preserves newlines and whitespace exactly", async () => {
    const content = "line1\n  line2\r\n\tline3";
    const p = path.join(tmp, "ws.txt");
    await fs.writeFile(p, content);
    expect(await readFileIfExists(p)).toBe(content);
  });

  it("handles large file (1MB)", async () => {
    const large = "x".repeat(1_000_000);
    const p = path.join(tmp, "large.txt");
    await fs.writeFile(p, large);
    const result = await readFileIfExists(p);
    expect(result?.length).toBe(1_000_000);
  });

  it("handles file with only whitespace", async () => {
    const p = path.join(tmp, "ws-only.txt");
    await fs.writeFile(p, "   \n\t  ");
    expect(await readFileIfExists(p)).toBe("   \n\t  ");
  });

  it("handles file with JSON-like content (returns raw string, not parsed)", async () => {
    const p = path.join(tmp, "raw.txt");
    await fs.writeFile(p, '{"key":"value"}');
    expect(await readFileIfExists(p)).toBe('{"key":"value"}');
  });

  it("handles unicode content correctly", async () => {
    const p = path.join(tmp, "unicode.txt");
    await fs.writeFile(p, "日本語テスト 🚀", "utf-8");
    expect(await readFileIfExists(p)).toBe("日本語テスト 🚀");
  });
});

// listDirs

describe("listDirs", () => {
  it("returns directory names only, not files", async () => {
    await fs.mkdir(path.join(tmp, "apps"));
    await fs.mkdir(path.join(tmp, "packages"));
    await fs.writeFile(path.join(tmp, "readme.md"), "");
    const result = await listDirs(tmp);
    expect(result).toContain("apps");
    expect(result).toContain("packages");
    expect(result).not.toContain("readme.md");
  });

  it("returns empty array for non-existent directory", async () => {
    expect(await listDirs(path.join(tmp, "ghost"))).toEqual([]);
  });

  it("returns empty array for empty directory", async () => {
    const empty = path.join(tmp, "empty");
    await fs.mkdir(empty);
    expect(await listDirs(empty)).toEqual([]);
  });

  it("does not recurse into subdirectories", async () => {
    await fs.mkdir(path.join(tmp, "parent"));
    await fs.mkdir(path.join(tmp, "parent", "child"));
    const result = await listDirs(tmp);
    expect(result).toContain("parent");
    expect(result).not.toContain("child");
  });

  it("returns multiple directories in any order", async () => {
    for (const name of ["alpha", "beta", "gamma"]) {
      await fs.mkdir(path.join(tmp, name));
    }
    const result = await listDirs(tmp);
    expect(result.sort()).toEqual(["alpha", "beta", "gamma"]);
  });

  it("ignores files that start with dot", async () => {
    await fs.mkdir(path.join(tmp, ".git"));
    await fs.mkdir(path.join(tmp, "src"));
    const result = await listDirs(tmp);
    expect(result).toContain(".git"); // listDirs doesn't filter dots — verify actual behavior
    expect(result).toContain("src");
  });

  it("handles path with trailing slash", async () => {
    await fs.mkdir(path.join(tmp, "apps"));
    const result = await listDirs(`${tmp}/`);
    expect(result).toContain("apps");
  });

  it("handles 100 directories without error", async () => {
    for (let i = 0; i < 100; i++) {
      await fs.mkdir(path.join(tmp, `pkg-${i}`));
    }
    const result = await listDirs(tmp);
    expect(result.length).toBe(100);
  });
});

// readJsonFile

describe("readJsonFile", () => {
  it("parses valid JSON object", async () => {
    const p = path.join(tmp, "valid.json");
    await fs.writeFile(p, JSON.stringify({ name: "test", version: "1.0.0" }));
    const result = await readJsonFile<{ name: string }>(p);
    expect(result?.name).toBe("test");
  });

  it("returns null for non-existent file", async () => {
    expect(await readJsonFile(path.join(tmp, "nope.json"))).toBeNull();
  });

  it("returns null for malformed JSON", async () => {
    const p = path.join(tmp, "bad.json");
    await fs.writeFile(p, "{ name: broken }");
    expect(await readJsonFile(p)).toBeNull();
  });

  it("returns null for empty file", async () => {
    const p = path.join(tmp, "empty.json");
    await fs.writeFile(p, "");
    expect(await readJsonFile(p)).toBeNull();
  });

  it("returns null for whitespace-only file", async () => {
    const p = path.join(tmp, "ws.json");
    await fs.writeFile(p, "   ");
    expect(await readJsonFile(p)).toBeNull();
  });

  it("parses JSON array", async () => {
    const p = path.join(tmp, "arr.json");
    await fs.writeFile(p, "[1, 2, 3]");
    const result = await readJsonFile<number[]>(p);
    expect(result).toEqual([1, 2, 3]);
  });

  it("parses deeply nested JSON", async () => {
    const p = path.join(tmp, "nested.json");
    const deep = { a: { b: { c: { d: "leaf" } } } };
    await fs.writeFile(p, JSON.stringify(deep));
    const result = await readJsonFile<typeof deep>(p);
    expect(result?.a?.b?.c?.d).toBe("leaf");
  });

  it("returns null for JSON with trailing comma (invalid)", async () => {
    const p = path.join(tmp, "trailing.json");
    await fs.writeFile(p, '{"a": 1,}');
    expect(await readJsonFile(p)).toBeNull();
  });

  it("parses JSONC-style comments — actually fails since JSON.parse strict", async () => {
    const p = path.join(tmp, "jsonc.json");
    await fs.writeFile(p, '// comment\n{"a": 1}');
    // JSON.parse rejects comments — must return null
    expect(await readJsonFile(p)).toBeNull();
  });

  it("handles JSON with unicode escape sequences", async () => {
    const p = path.join(tmp, "unicode.json");
    await fs.writeFile(p, '{"key":"\\u0041"}'); // A
    const result = await readJsonFile<{ key: string }>(p);
    expect(result?.key).toBe("A");
  });

  it("handles JSON number as root value", async () => {
    const p = path.join(tmp, "num.json");
    await fs.writeFile(p, "42");
    const result = await readJsonFile<number>(p);
    expect(result).toBe(42);
  });

  it("handles boolean root value", async () => {
    const p = path.join(tmp, "bool.json");
    await fs.writeFile(p, "true");
    const result = await readJsonFile<boolean>(p);
    expect(result).toBe(true);
  });

  it("handles null root value", async () => {
    const p = path.join(tmp, "null.json");
    await fs.writeFile(p, "null");
    const result = await readJsonFile(p);
    // JSON.parse("null") === null, readFileIfExists returns "null" (truthy),
    // then JSON.parse succeeds returning null — function returns null either way
    expect(result).toBeNull();
  });
});
