import type { PackageRegistryItem } from "@create-turbo-stack/schema";
import { describe, expect, it } from "vitest";
import { makePreset, WEB_APP } from "../preset-factory.js";
import { indexItemsBySlotVariant, resolveRegistryItems } from "./resolve.js";

const ctx = {
  scope: "@saas",
  pm: "bun" as const,
  // Tests pin pkgRoot to "packages/<pkgName>" — the resolver's relocation
  // logic is exercised separately via packageDirOf in the integration tests.
  resolvePkgRoot: (req: { slot: string; pkgName: string }) =>
    req.slot === "app" ? `apps/${req.pkgName}` : `packages/${req.pkgName}`,
};

function preset() {
  return makePreset({
    apps: [WEB_APP],
    integrations: {
      analytics: "none",
      errorTracking: "none",
      email: "none",
      rateLimit: "none",
      ai: "none",
      cache: "none",
      envValidation: "t3-env",
    },
  });
}

function envItem(): PackageRegistryItem {
  return {
    name: "env-t3",
    type: "registry:package",
    slot: "env",
    variant: "t3-env",
    description: "t3-env",
    dependencies: ["@t3-oss/env-nextjs", "zod"],
    devDependencies: [],
    registryDependencies: [],
    envVars: {},
    exports: ["."],
    build: "none",
    categories: [],
    files: [
      {
        path: "src/index.ts",
        type: "registry:source",
        content: `// {{pkg-import}}\nexport {};\n`,
      },
    ],
  };
}

describe("resolveRegistryItems — serve + unmet", () => {
  it("serves an env item when present, leaves typescript-config + app unmet", () => {
    const { nodes, unmet } = resolveRegistryItems(preset(), [envItem()], ctx);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].path).toBe("packages/env/src/index.ts");
    expect(nodes[0].content).toContain("// @saas/env");
    expect(unmet.map((r) => r.slot)).toEqual(["typescript-config", "app"]);
  });

  it("returns empty unmet when every request finds an item", () => {
    const tsConfig: PackageRegistryItem = {
      ...envItem(),
      name: "typescript-config-default",
      slot: "typescript-config",
      variant: "default",
      files: [
        {
          path: "base.json",
          type: "registry:source",
          content: `{}\n`,
        },
      ],
    };
    const appNext: PackageRegistryItem = {
      ...envItem(),
      name: "app-nextjs",
      slot: "app",
      variant: "nextjs",
      files: [
        {
          path: "app/page.tsx",
          type: "registry:source",
          content: `export default function Page() { return null; }\n`,
        },
      ],
    };
    const { unmet } = resolveRegistryItems(preset(), [tsConfig, envItem(), appNext], ctx);
    expect(unmet).toEqual([]);
  });

  it("preserves the request order in the output nodes", () => {
    // typescript-config first, env second — that's what selectRegistryItems
    // emits. Resolve should output nodes in the same order so downstream
    // writers see deps before consumers.
    const tsConfig: PackageRegistryItem = {
      ...envItem(),
      name: "typescript-config-default",
      slot: "typescript-config",
      variant: "default",
      files: [
        {
          path: "base.json",
          type: "registry:source",
          content: "{}\n",
        },
      ],
    };
    const { nodes } = resolveRegistryItems(preset(), [envItem(), tsConfig], ctx);
    expect(nodes[0].path).toBe("packages/typescript-config/base.json");
    expect(nodes[1].path).toBe("packages/env/src/index.ts");
  });
});

describe("indexItemsBySlotVariant", () => {
  it("builds a slot:variant → item map", () => {
    const map = indexItemsBySlotVariant([envItem()]);
    expect(map.get("env:t3-env")?.name).toBe("env-t3");
    expect(map.size).toBe(1);
  });

  it("ignores items without slot or variant (add-ons)", () => {
    const addon: PackageRegistryItem = {
      ...envItem(),
      slot: undefined,
      variant: undefined,
    };
    const map = indexItemsBySlotVariant([addon]);
    expect(map.size).toBe(0);
  });

  it("first item wins on duplicate slot:variant", () => {
    const a = envItem();
    const b: PackageRegistryItem = { ...envItem(), name: "duplicate" };
    const map = indexItemsBySlotVariant([a, b]);
    expect(map.get("env:t3-env")?.name).toBe("env-t3");
  });
});
