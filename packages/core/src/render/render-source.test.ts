import { describe, expect, it, vi } from "vitest";
import { renderSingleFile, renderSourceFiles } from "../../src/render/render-source";

vi.mock("@create-turbo-stack/templates", () => ({
  getTemplates: (category: string) => {
    if (category === "root") {
      return {
        "README.md.eta": "# <%= it.projectName %>",
        "src/index.ts.eta": "export const name = '<%= it.name %>';",
      };
    }
    if (category === "app/nextjs") {
      return {
        "src/app/layout.tsx.eta": "export default function Layout() { return null; }",
        "src/app/page.tsx.eta":
          "export default function Page() { return <main><%= it.app?.name %></main>; }",
      };
    }
    if (category === "empty") {
      return {};
    }
    return {};
  },
}));

// renderSourceFiles

describe("renderSourceFiles", () => {
  it("returns FileTreeNode[] for valid category", () => {
    const nodes = renderSourceFiles("root", ".", {
      projectName: "my-app",
      name: "my-app",
    });
    expect(Array.isArray(nodes)).toBe(true);
    expect(nodes.length).toBeGreaterThan(0);
  });

  it("strips .eta extension from output paths", () => {
    const nodes = renderSourceFiles("root", ".", {
      projectName: "x",
      name: "x",
    });
    for (const n of nodes) {
      expect(n.path).not.toMatch(/\.eta$/);
    }
  });

  it("prepends basePath to all paths", () => {
    const nodes = renderSourceFiles("root", "packages/config", {
      projectName: "x",
      name: "x",
    });
    for (const n of nodes) {
      expect(n.path).toMatch(/^packages\/config\//);
    }
  });

  it("context variables are rendered in output", () => {
    const nodes = renderSourceFiles("root", ".", {
      projectName: "awesome-project",
      name: "awesome-project",
    });
    const readme = nodes.find((n) => n.path === "./README.md");
    expect(readme?.content).toContain("awesome-project");
  });

  it("all nodes have isDirectory: false", () => {
    const nodes = renderSourceFiles("root", ".", {
      projectName: "x",
      name: "x",
    });
    for (const n of nodes) {
      expect(n.isDirectory).toBe(false);
    }
  });

  it("empty category → empty array", () => {
    const nodes = renderSourceFiles("empty", "packages/foo", {});
    expect(nodes).toHaveLength(0);
  });

  it("unknown category → empty array (getTemplates returns {})", () => {
    const nodes = renderSourceFiles("nonexistent/category", "apps/test", {});
    expect(nodes).toHaveLength(0);
  });
});

// renderSingleFile

describe("renderSingleFile", () => {
  it("returns rendered content for existing template", () => {
    const result = renderSingleFile("root", "README.md.eta", {
      projectName: "hello",
    });
    expect(result).toBe("# hello");
  });

  it("returns undefined for missing template", () => {
    const result = renderSingleFile("root", "nonexistent.ts.eta", {});
    expect(result).toBeUndefined();
  });

  it("returns undefined for missing category", () => {
    const result = renderSingleFile("ghost-category", "index.ts.eta", {});
    expect(result).toBeUndefined();
  });

  it("context is passed through to template", () => {
    const result = renderSingleFile("root", "src/index.ts.eta", {
      name: "my-lib",
    });
    expect(result).toContain("my-lib");
  });
});
