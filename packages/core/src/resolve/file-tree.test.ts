import type { Preset } from "@create-turbo-stack/schema";
import { describe, expect, it } from "vitest";
import minimalJson from "../../../../presets/minimal.json";
import saasJson from "../../../../presets/saas-starter.json";
import { resolveFileTree } from "./file-tree";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

/** Find a node by exact path. */
function findNode(nodes: ReturnType<typeof resolveFileTree>["nodes"], path: string) {
  return nodes.find((n) => n.path === path);
}

/** Parse content of a JSON node. Throws if missing or unparseable. */
function parseJson<T = unknown>(
  nodes: ReturnType<typeof resolveFileTree>["nodes"],
  path: string,
): T {
  const node = findNode(nodes, path);
  if (!node?.content) throw new Error(`Node not found or has no content: ${path}`);
  return JSON.parse(node.content) as T;
}

// ---------------------------------------------------------------------------
// minimal preset — file existence
// ---------------------------------------------------------------------------

describe("resolveFileTree — minimal preset", () => {
  it("produces expected root config files", () => {
    const { nodes } = resolveFileTree(clone(minimalJson) as Preset);
    const paths = nodes.map((n) => n.path);

    expect(paths).toContain("package.json");
    expect(paths).toContain("turbo.json");
    expect(paths).toContain(".gitignore");
    expect(paths).toContain(".npmrc");
    expect(paths).toContain("biome.json"); // minimal uses biome linter
  });

  it("produces typescript-config package files", () => {
    const { nodes } = resolveFileTree(clone(minimalJson) as Preset);
    const paths = nodes.map((n) => n.path);

    // typescript-config is always auto-generated
    expect(paths.some((p) => p.startsWith("packages/typescript-config/"))).toBe(true);
  });

  it("produces ui package files", () => {
    const { nodes } = resolveFileTree(clone(minimalJson) as Preset);
    const paths = nodes.map((n) => n.path);

    expect(paths.some((p) => p.startsWith("packages/ui/"))).toBe(true);
  });

  it("produces web app files", () => {
    const { nodes } = resolveFileTree(clone(minimalJson) as Preset);
    const paths = nodes.map((n) => n.path);

    expect(paths.some((p) => p.startsWith("apps/web/"))).toBe(true);
  });

  // -------------------------------------------------------------------------
  // package.json catalog
  // -------------------------------------------------------------------------

  it("root package.json contains a catalog with typescript", () => {
    const { nodes } = resolveFileTree(clone(minimalJson) as Preset);
    const pkg = parseJson<Record<string, unknown>>(nodes, "package.json");

    expect(pkg).toHaveProperty("catalog");
    const catalog = pkg.catalog as Record<string, string>;
    expect(catalog).toHaveProperty("typescript");
    expect(catalog.typescript).toMatch(/^\^5/);
  });

  it("root package.json catalog includes tailwindcss for tailwind4 preset", () => {
    const { nodes } = resolveFileTree(clone(minimalJson) as Preset);
    const pkg = parseJson<{ catalog: Record<string, string> }>(nodes, "package.json");

    expect(pkg.catalog).toHaveProperty("tailwindcss");
    expect(pkg.catalog.tailwindcss).toMatch(/^\^4/);
  });

  it("root package.json sets workspaces to apps/* and packages/*", () => {
    const { nodes } = resolveFileTree(clone(minimalJson) as Preset);
    const pkg = parseJson<{ workspaces: string[] }>(nodes, "package.json");

    expect(pkg.workspaces).toContain("apps/*");
    expect(pkg.workspaces).toContain("packages/*");
  });

  // -------------------------------------------------------------------------
  // globals.css @source directives
  // -------------------------------------------------------------------------

  it("web app globals.css contains @source directive for own src", () => {
    const { nodes } = resolveFileTree(clone(minimalJson) as Preset);

    // globals.css may live at different sub-paths depending on template;
    // find whichever node under apps/web/ contains @source
    const cssNode = nodes.find(
      (n) => n.path.startsWith("apps/web/") && n.content?.includes("@source"),
    );

    expect(cssNode).toBeDefined();
    expect(cssNode!.content).toContain("@source");
    expect(cssNode!.content).toContain("../../src");
  });

  it("web app globals.css contains @source for consumed ui package", () => {
    const { nodes } = resolveFileTree(clone(minimalJson) as Preset);

    const cssNode = nodes.find(
      (n) => n.path.startsWith("apps/web/") && n.content?.includes("@source"),
    );

    expect(cssNode).toBeDefined();
    expect(cssNode!.content).toContain("../../../../packages/ui/src");
  });
});

// ---------------------------------------------------------------------------
// saas-starter preset — auto-generated packages
// ---------------------------------------------------------------------------

describe("resolveFileTree — saas-starter preset", () => {
  it("auto-generates db package (supabase strategy)", () => {
    const { nodes } = resolveFileTree(clone(saasJson) as Preset);
    const paths = nodes.map((n) => n.path);

    expect(paths.some((p) => p.startsWith("packages/db/"))).toBe(true);
  });

  it("auto-generates api package (trpc strategy)", () => {
    const { nodes } = resolveFileTree(clone(saasJson) as Preset);
    const paths = nodes.map((n) => n.path);

    expect(paths.some((p) => p.startsWith("packages/api/"))).toBe(true);
  });

  it("auto-generates auth package (supabase-auth provider)", () => {
    const { nodes } = resolveFileTree(clone(saasJson) as Preset);
    const paths = nodes.map((n) => n.path);

    expect(paths.some((p) => p.startsWith("packages/auth/"))).toBe(true);
  });

  it("auto-generates env package (envValidation: true)", () => {
    const { nodes } = resolveFileTree(clone(saasJson) as Preset);
    const paths = nodes.map((n) => n.path);

    expect(paths.some((p) => p.startsWith("packages/env/"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Preview mode (includeContent: false)
// ---------------------------------------------------------------------------

describe("resolveFileTree — preview mode", () => {
  it("all nodes have undefined content when includeContent is false", () => {
    const { nodes } = resolveFileTree(clone(minimalJson) as Preset, {
      includeContent: false,
    });

    const withContent = nodes.filter((n) => n.content !== undefined);
    expect(withContent).toHaveLength(0);
  });

  it("still produces the correct file paths in preview mode", () => {
    const { nodes } = resolveFileTree(clone(minimalJson) as Preset, {
      includeContent: false,
    });
    const paths = nodes.map((n) => n.path);

    expect(paths).toContain("package.json");
    expect(paths.some((p) => p.startsWith("apps/web/"))).toBe(true);
  });

  it("projectName is preserved in preview mode", () => {
    const tree = resolveFileTree(clone(minimalJson) as Preset, {
      includeContent: false,
    });

    expect(tree.projectName).toBe("my-project");
  });
});
