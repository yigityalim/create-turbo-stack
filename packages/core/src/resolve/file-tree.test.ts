import type { PackageRegistryItem } from "@create-turbo-stack/schema";
import { describe, expect, it } from "vitest";
import { makeFullPreset, makePreset, UTILS_PKG, WEB_APP } from "../preset-factory";
import { BUILTIN_REGISTRY_ITEMS } from "../registry/builtin-items";
import { resolveFileTree } from "./file-tree";

// Minimal app-type item — provides slot+variant so the app adapter fires.
// package.json + tsconfig come from the app-type plugin, not the item itself.
function appItem(variant: string, extra?: Partial<PackageRegistryItem>): PackageRegistryItem {
  return {
    name: `app-${variant}`,
    type: "registry:package",
    description: `${variant} app scaffold`,
    slot: "app",
    variant,
    dependencies: [],
    devDependencies: [],
    registryDependencies: [],
    envVars: {},
    exports: ["."],
    build: "none",
    categories: [],
    files: [],
    ...extra,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const paths = (tree: ReturnType<typeof resolveFileTree>) => tree.nodes.map((n) => n.path);

const has = (tree: ReturnType<typeof resolveFileTree>, path: string) =>
  tree.nodes.some((n) => n.path === path);

const content = (tree: ReturnType<typeof resolveFileTree>, path: string) =>
  tree.nodes.find((n) => n.path === path)?.content ?? "";

const json = (tree: ReturnType<typeof resolveFileTree>, path: string) =>
  JSON.parse(content(tree, path));

// ─── Return shape ─────────────────────────────────────────────────────────────

describe("resolveFileTree — return shape", () => {
  it("returns projectName from preset", () => {
    const preset = makePreset();
    const tree = resolveFileTree(preset);
    expect(tree.projectName).toBe(preset.basics.projectName);
  });

  it("returns a nodes array", () => {
    const tree = resolveFileTree(makePreset());
    expect(Array.isArray(tree.nodes)).toBe(true);
  });

  it("each node has path and content", () => {
    const tree = resolveFileTree(makePreset());
    for (const node of tree.nodes) {
      expect(typeof node.path).toBe("string");
      expect(node.path.length).toBeGreaterThan(0);
    }
  });
});

// ─── Root files ───────────────────────────────────────────────────────────────

describe("resolveFileTree — root files", () => {
  const tree = resolveFileTree(makePreset({ apps: [WEB_APP] }));

  it("emits package.json at root", () => {
    expect(has(tree, "package.json")).toBe(true);
  });

  it("root package.json has name matching projectName", () => {
    const pkg = json(tree, "package.json");
    expect(pkg.name).toBe("test-project");
  });

  it("emits turbo.json", () => {
    expect(has(tree, "turbo.json")).toBe(true);
  });

  it("emits biome.json when linter is biome", () => {
    expect(has(tree, "biome.json")).toBe(true);
  });

  it("emits .gitignore", () => {
    expect(has(tree, ".gitignore")).toBe(true);
  });

  it("emits .env.example", () => {
    expect(has(tree, ".env.example")).toBe(true);
  });
});

// ─── App files ────────────────────────────────────────────────────────────────

describe("resolveFileTree — Next.js app files (with registry item)", () => {
  // Apps only emit files when a matching registry item is present.
  // package.json + tsconfig come from the app-type plugin; the item supplies extras.
  const preset = makePreset({ apps: [WEB_APP] });
  const tree = resolveFileTree(preset, { includeContent: true, items: [appItem("nextjs")] });

  it("emits package.json for the app", () => {
    expect(has(tree, "apps/web/package.json")).toBe(true);
  });

  it("emits tsconfig.json for the app", () => {
    expect(has(tree, "apps/web/tsconfig.json")).toBe(true);
  });

  it("app package.json name is the app name (not scoped)", () => {
    const pkg = json(tree, "apps/web/package.json");
    // App plugins use app.name directly, not @scope/app.name
    expect(pkg.name).toBe("web");
  });

  it("emits no app files when no registry item is provided", () => {
    const treeNoItems = resolveFileTree(preset);
    const appPaths = paths(treeNoItems).filter((p) => p.startsWith("apps/"));
    expect(appPaths).toHaveLength(0);
  });
});

// ─── Package files ────────────────────────────────────────────────────────────

describe("resolveFileTree — user package files", () => {
  const preset = makePreset({ apps: [WEB_APP], packages: [UTILS_PKG] });
  const tree = resolveFileTree(preset);

  it("emits package.json for the user package", () => {
    expect(has(tree, "packages/utils/package.json")).toBe(true);
  });

  it("emits tsconfig.json for the user package", () => {
    expect(has(tree, "packages/utils/tsconfig.json")).toBe(true);
  });

  it("user package.json has the scoped name", () => {
    const pkg = json(tree, "packages/utils/package.json");
    expect(pkg.name).toBe("@test/utils");
  });
});

// ─── Preview mode ─────────────────────────────────────────────────────────────

describe("resolveFileTree — preview mode (includeContent: false)", () => {
  it("nodes have no content in preview mode", () => {
    const tree = resolveFileTree(makePreset({ apps: [WEB_APP] }), {
      includeContent: false,
    });
    for (const node of tree.nodes) {
      expect(node.content).toBeUndefined();
    }
  });

  it("still returns all paths in preview mode", () => {
    const full = resolveFileTree(makePreset({ apps: [WEB_APP] }));
    const preview = resolveFileTree(makePreset({ apps: [WEB_APP] }), {
      includeContent: false,
    });
    expect(preview.nodes.map((n) => n.path).sort()).toEqual(full.nodes.map((n) => n.path).sort());
  });
});

// ─── No apps ──────────────────────────────────────────────────────────────────

describe("resolveFileTree — no apps", () => {
  it("still emits root files without apps", () => {
    const tree = resolveFileTree(makePreset());
    expect(has(tree, "package.json")).toBe(true);
    expect(has(tree, "turbo.json")).toBe(true);
  });

  it("emits no app-specific files", () => {
    const tree = resolveFileTree(makePreset());
    const appPaths = paths(tree).filter((p) => p.startsWith("apps/"));
    expect(appPaths).toHaveLength(0);
  });
});

// ─── Auto packages ────────────────────────────────────────────────────────────

describe("resolveFileTree — auto packages", () => {
  it("emits typescript-config package when builtin item is present", () => {
    const tree = resolveFileTree(makePreset({ apps: [WEB_APP] }), {
      includeContent: true,
      items: BUILTIN_REGISTRY_ITEMS,
    });
    // typescript-config is a builtin item — its files should appear
    const tsConfigPaths = paths(tree).filter((p) => p.startsWith("packages/typescript-config/"));
    expect(tsConfigPaths.length).toBeGreaterThan(0);
  });
});

// ─── Linter variants ──────────────────────────────────────────────────────────

describe("resolveFileTree — linter variants", () => {
  it("emits eslint.config.mjs when linter is eslint-prettier", () => {
    const preset = makePreset({
      apps: [WEB_APP],
      basics: {
        projectName: "test-project",
        packageManager: "bun",
        scope: "@test",
        typescript: "strict",
        linter: "eslint-prettier",
        gitInit: false,
      },
    });
    const tree = resolveFileTree(preset);
    expect(has(tree, "eslint.config.mjs")).toBe(true);
    expect(has(tree, "biome.json")).toBe(false);
  });
});

// ─── Full preset ──────────────────────────────────────────────────────────────

describe("resolveFileTree — full preset", () => {
  // makeFullPreset has both UI_PKG (producesCSS:true) and css.ui="shadcn".
  // The auto-package owns the "ui" slot; the user-declared UI_PKG is skipped.
  // resolveFileTree deduplicates: auto-package names take precedence.
  const fullItems = [
    appItem("nextjs"),
    {
      ...appItem("shadcn-starter"),
      slot: "ui" as const,
      variant: "shadcn-starter",
      name: "ui-shadcn-starter",
    },
  ];
  const tree = resolveFileTree(makeFullPreset(), { includeContent: true, items: fullItems });

  it("produces more files than the minimal preset", () => {
    const minimal = resolveFileTree(makePreset({ apps: [WEB_APP] }));
    expect(tree.nodes.length).toBeGreaterThan(minimal.nodes.length);
  });

  it("emits files for the nextjs app", () => {
    expect(paths(tree).some((p) => p.startsWith("apps/web/"))).toBe(true);
  });

  it("emits no files for expo app (not yet implemented)", () => {
    expect(paths(tree).some((p) => p.startsWith("apps/mobile/"))).toBe(false);
  });

  it("emits files for both packages (ui via auto-package, utils via user package)", () => {
    expect(paths(tree).some((p) => p.startsWith("packages/ui/"))).toBe(true);
    expect(paths(tree).some((p) => p.startsWith("packages/utils/"))).toBe(true);
  });

  it("no path appears twice — auto-package dedup prevents ui collision", () => {
    const allPaths = paths(tree);
    const unique = new Set(allPaths);
    expect(allPaths.length).toBe(unique.size);
  });
});
