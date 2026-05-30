import type { PackageRegistryItem } from "@create-turbo-stack/schema";
import { describe, expect, it } from "vitest";
import { materializeRegistryItem } from "./materialize.js";

const ctx = {
  scope: "@saas",
  pkgName: "env",
  pm: "bun" as const,
  pkgRoot: "packages/env",
};

function makeItem(overrides: Partial<PackageRegistryItem> = {}): PackageRegistryItem {
  return {
    name: "env-t3",
    type: "registry:package",
    slot: "env",
    variant: "t3-env",
    description: "Type-safe env via t3-env.",
    dependencies: ["@t3-oss/env-nextjs", "zod"],
    devDependencies: [],
    registryDependencies: [],
    envVars: {},
    exports: ["."],
    build: "none",
    categories: ["foundation"],
    files: [
      {
        path: "src/index.ts",
        type: "registry:source",
        content: `// {{pkg-import}}\nexport const SCOPE = "{{scope}}";\n`,
      },
    ],
    ...overrides,
  };
}

describe("materializeRegistryItem — happy path", () => {
  it("substitutes placeholders and computes default write path", () => {
    const item = makeItem();
    const { nodes, diagnostics } = materializeRegistryItem(item, ctx);

    expect(diagnostics).toEqual([]);
    expect(nodes).toHaveLength(1);
    const [node] = nodes;
    expect(node.path).toBe("packages/env/src/index.ts");
    expect(node.content).toBe(`// @saas/env\nexport const SCOPE = "@saas";\n`);
    expect(node.isDirectory).toBe(false);
    expect(node.templateKey).toBe("registry:env-t3:src/index.ts");
  });

  it("respects an explicit target outside the package root", () => {
    const item = makeItem({
      files: [
        {
          path: "env.example",
          type: "registry:file",
          target: ".env.example",
          content: "SCOPE={{scope}}\n",
        },
      ],
    });
    const { nodes } = materializeRegistryItem(item, ctx);
    expect(nodes[0].path).toBe(".env.example");
    expect(nodes[0].content).toBe("SCOPE=@saas\n");
  });

  it("substitutes placeholders inside the target itself", () => {
    const item = makeItem({
      files: [
        {
          path: "config.json",
          type: "registry:file",
          target: "apps/{{pkg-name}}/config.json",
          content: "{}\n",
        },
      ],
    });
    const { nodes } = materializeRegistryItem(item, {
      ...ctx,
      pkgName: "web",
      pkgRoot: "apps/web",
    });
    expect(nodes[0].path).toBe("apps/web/config.json");
  });

  it("honours a relocated pkgRoot (e.g. tooling/env)", () => {
    const item = makeItem();
    const { nodes } = materializeRegistryItem(item, {
      ...ctx,
      pkgRoot: "tooling/env",
    });
    expect(nodes[0].path).toBe("tooling/env/src/index.ts");
  });
});

describe("materializeRegistryItem — strict vs soft", () => {
  it("throws on missing content by default (strict)", () => {
    const item = makeItem({
      files: [{ path: "src/index.ts", type: "registry:source", content: undefined }],
    });
    expect(() => materializeRegistryItem(item, ctx)).toThrow(/no inlined content/);
  });

  it("returns a diagnostic on missing content when strict is false", () => {
    const item = makeItem({
      files: [{ path: "src/index.ts", type: "registry:source", content: undefined }],
    });
    const { nodes, diagnostics } = materializeRegistryItem(item, ctx, {
      strict: false,
    });
    expect(nodes).toEqual([]);
    expect(diagnostics).toEqual([{ path: "packages/env/src/index.ts", reason: "missing-content" }]);
  });
});

describe("materializeRegistryItem — empty files", () => {
  it("returns no nodes when the item declares no files", () => {
    const item = makeItem({ files: [] });
    const { nodes, diagnostics } = materializeRegistryItem(item, ctx);
    expect(nodes).toEqual([]);
    expect(diagnostics).toEqual([]);
  });
});
