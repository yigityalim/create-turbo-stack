import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFixture, removeFixture } from "../test-utils/fixture";
import { getWorkspaceDeps, hasAnyDep, hasDep, readPackageJson } from "./dep-scanner";

let tmp: string;

beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), "dep-test-"));
});

afterEach(async () => {
  await removeFixture(tmp);
});

// readPackageJson

describe("readPackageJson", () => {
  it("reads a valid package.json", async () => {
    await createFixture({
      "package.json": { name: "@scope/pkg", version: "1.0.0" },
    }).then(async (dir) => {
      const result = await readPackageJson(dir);
      expect(result?.name).toBe("@scope/pkg");
      await removeFixture(dir);
    });
  });

  it("returns null when no package.json exists", async () => {
    expect(await readPackageJson(tmp)).toBeNull();
  });

  it("returns null when package.json is malformed", async () => {
    await fs.writeFile(path.join(tmp, "package.json"), "NOT JSON");
    expect(await readPackageJson(tmp)).toBeNull();
  });

  it("returns null when package.json is empty", async () => {
    await fs.writeFile(path.join(tmp, "package.json"), "");
    expect(await readPackageJson(tmp)).toBeNull();
  });

  it("returns object even with minimal fields", async () => {
    await fs.writeFile(path.join(tmp, "package.json"), "{}");
    const result = await readPackageJson(tmp);
    expect(result).toEqual({});
  });

  it("returns null for non-existent directory", async () => {
    expect(await readPackageJson(path.join(tmp, "nonexistent"))).toBeNull();
  });

  it("parses all expected fields", async () => {
    await fs.writeFile(
      path.join(tmp, "package.json"),
      JSON.stringify({
        name: "@test/pkg",
        dependencies: { react: "^19.0.0" },
        devDependencies: { typescript: "^5.0.0" },
        scripts: { build: "tsc" },
        workspaces: ["apps/*"],
      }),
    );
    const result = await readPackageJson(tmp);
    expect(result?.name).toBe("@test/pkg");
    expect(result?.dependencies?.react).toBe("^19.0.0");
    expect(result?.devDependencies?.typescript).toBe("^5.0.0");
    expect(result?.scripts?.build).toBe("tsc");
    expect(result?.workspaces).toContain("apps/*");
  });
});

// hasDep

describe("hasDep", () => {
  it("returns true for dep in dependencies", () => {
    expect(hasDep({ dependencies: { react: "^19.0.0" } }, "react")).toBe(true);
  });

  it("returns true for dep in devDependencies", () => {
    expect(hasDep({ devDependencies: { vitest: "^4.0.0" } }, "vitest")).toBe(true);
  });

  it("returns true when dep exists in both", () => {
    expect(
      hasDep(
        {
          dependencies: { typescript: "^5.0.0" },
          devDependencies: { typescript: "^5.0.0" },
        },
        "typescript",
      ),
    ).toBe(true);
  });

  it("returns false when dep is absent from both", () => {
    expect(hasDep({ dependencies: { react: "^19" }, devDependencies: {} }, "next")).toBe(false);
  });

  it("returns false when both sections are undefined", () => {
    expect(hasDep({}, "anything")).toBe(false);
  });

  it("returns false when only dependencies is undefined", () => {
    expect(hasDep({ devDependencies: { eslint: "^9" } }, "react")).toBe(false);
  });

  it("returns false when only devDependencies is undefined", () => {
    expect(hasDep({ dependencies: { react: "^19" } }, "eslint")).toBe(false);
  });

  it("is case-sensitive: 'React' !== 'react'", () => {
    expect(hasDep({ dependencies: { React: "^19" } }, "react")).toBe(false);
  });

  it("returns true for scoped packages", () => {
    expect(hasDep({ dependencies: { "@trpc/server": "^11.0.0" } }, "@trpc/server")).toBe(true);
  });

  it("returns false for partial name match — @trpc/server vs @trpc", () => {
    expect(hasDep({ dependencies: { "@trpc/server": "^11.0.0" } }, "@trpc")).toBe(false);
  });

  it("handles empty string dep name", () => {
    expect(hasDep({ dependencies: { "": "1.0.0" } }, "")).toBe(true);
  });

  it("handles dep with version 'workspace:*'", () => {
    expect(hasDep({ dependencies: { "@my/pkg": "workspace:*" } }, "@my/pkg")).toBe(true);
  });

  it("returns false for dep with empty dependencies object", () => {
    expect(hasDep({ dependencies: {} }, "react")).toBe(false);
  });
});

// hasAnyDep

describe("hasAnyDep", () => {
  it("returns the first matching dep name", () => {
    const pkg = { dependencies: { eslint: "^9.0.0", prettier: "^3.0.0" } };
    expect(hasAnyDep(pkg, ["biome", "eslint", "prettier"])).toBe("eslint");
  });

  it("returns null when none match", () => {
    const pkg = { dependencies: { react: "^19.0.0" } };
    expect(hasAnyDep(pkg, ["next", "vite", "nuxt"])).toBeNull();
  });

  it("returns null for empty names array", () => {
    const pkg = { dependencies: { react: "^19.0.0" } };
    expect(hasAnyDep(pkg, [])).toBeNull();
  });

  it("returns null for empty pkg", () => {
    expect(hasAnyDep({}, ["react", "vue"])).toBeNull();
  });

  it("returns first match even if later entries also match", () => {
    const pkg = {
      dependencies: { posthog: "1.0.0", "@vercel/analytics": "1.0.0" },
    };
    // posthog is index 0 in the passed array
    expect(hasAnyDep(pkg, ["posthog", "@vercel/analytics"])).toBe("posthog");
  });

  it("handles single-item array", () => {
    const pkg = { devDependencies: { vitest: "^4.0.0" } };
    expect(hasAnyDep(pkg, ["vitest"])).toBe("vitest");
  });

  it("handles duplicate names in the array — returns first occurrence", () => {
    const pkg = { dependencies: { react: "^19.0.0" } };
    expect(hasAnyDep(pkg, ["react", "react"])).toBe("react");
  });

  it("works across both dep sections", () => {
    const pkg = {
      dependencies: { next: "15.0.0" },
      devDependencies: { typescript: "^5.0.0" },
    };
    expect(hasAnyDep(pkg, ["typescript"])).toBe("typescript");
  });
});

// getWorkspaceDeps

describe("getWorkspaceDeps", () => {
  it("returns workspace deps matching the scope", () => {
    const pkg = {
      dependencies: {
        "@my/ui": "workspace:*",
        "@my/utils": "workspace:^",
        "some-external": "^1.0.0",
      },
    };
    const result = getWorkspaceDeps(pkg, "@my");
    expect(result).toContain("ui");
    expect(result).toContain("utils");
    expect(result).not.toContain("some-external");
  });

  it("returns empty array when no workspace deps exist", () => {
    const pkg = { dependencies: { react: "^19.0.0" } };
    expect(getWorkspaceDeps(pkg, "@scope")).toEqual([]);
  });

  it("returns empty array for empty pkg", () => {
    expect(getWorkspaceDeps({}, "@scope")).toEqual([]);
  });

  it("excludes deps with mismatched scope", () => {
    const pkg = {
      dependencies: {
        "@other/ui": "workspace:*",
        "@my/utils": "workspace:*",
      },
    };
    expect(getWorkspaceDeps(pkg, "@my")).toEqual(["utils"]);
  });

  it("includes workspace:^ and workspace:~1.0.0 versions", () => {
    const pkg = {
      dependencies: {
        "@scope/a": "workspace:^",
        "@scope/b": "workspace:~1.0.0",
        "@scope/c": "^1.0.0", // NOT workspace — excluded
      },
    };
    const result = getWorkspaceDeps(pkg, "@scope");
    expect(result).toContain("a");
    expect(result).toContain("b");
    expect(result).not.toContain("c");
  });

  it("merges dependencies and devDependencies", () => {
    const pkg = {
      dependencies: { "@scope/a": "workspace:*" },
      devDependencies: { "@scope/b": "workspace:*" },
    };
    const result = getWorkspaceDeps(pkg, "@scope");
    expect(result).toContain("a");
    expect(result).toContain("b");
  });

  it("strips scope prefix from returned names", () => {
    const pkg = { dependencies: { "@my/awesome-package": "workspace:*" } };
    expect(getWorkspaceDeps(pkg, "@my")).toEqual(["awesome-package"]);
  });

  it("handles scope that appears in package name but not as prefix", () => {
    // @other/my-thing should NOT match scope "@my"
    const pkg = { dependencies: { "@other/my-thing": "workspace:*" } };
    expect(getWorkspaceDeps(pkg, "@my")).toEqual([]);
  });

  it("returns empty array when scope has no packages", () => {
    const pkg = { dependencies: { "@other/pkg": "workspace:*" } };
    expect(getWorkspaceDeps(pkg, "@mine")).toEqual([]);
  });

  it("handles scope without @-prefix", () => {
    // Hypothetically scoped without @
    const pkg = { dependencies: { "myscope/pkg": "workspace:*" } };
    const result = getWorkspaceDeps(pkg, "myscope");
    expect(result).toContain("pkg");
  });

  it("handles many workspace deps efficiently", () => {
    const deps: Record<string, string> = {};
    for (let i = 0; i < 50; i++) {
      deps[`@scope/pkg-${i}`] = "workspace:*";
    }
    const pkg = { dependencies: deps };
    expect(getWorkspaceDeps(pkg, "@scope").length).toBe(50);
  });
});
