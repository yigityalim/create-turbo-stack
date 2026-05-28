import { describe, expect, it } from "vitest";
import { makePreset } from "../../preset-factory";
import { resolveFileTree } from "../file-tree";
import type { PackageJson } from "../manifest-types";

/**
 * `packageOverrides` is the user's additive layer on top of resolver output.
 * These tests pin the merge contract so refactors don't silently change it.
 */

function pkgJson(nodes: ReturnType<typeof resolveFileTree>["nodes"], path: string): PackageJson {
  const node = nodes.find((n) => n.path === path);
  if (!node?.content) throw new Error(`Missing ${path}`);
  return JSON.parse(node.content) as PackageJson;
}

function file(nodes: ReturnType<typeof resolveFileTree>["nodes"], path: string) {
  return nodes.find((n) => n.path === path);
}

describe("packageOverrides — dependencies + devDependencies", () => {
  it("merges extra deps into an auto-package's package.json", () => {
    const preset = makePreset({
      database: { strategy: "drizzle", driver: "postgres" },
      packageOverrides: {
        db: { dependencies: { "drizzle-seed": "^0.1.0" } },
      },
    });
    const { nodes } = resolveFileTree(preset);
    const pkg = pkgJson(nodes, "packages/db/package.json");
    expect(pkg.dependencies?.["drizzle-seed"]).toBe("^0.1.0");
    // Provider-emitted deps survive.
    expect(pkg.dependencies?.["drizzle-orm"]).toBe("catalog:");
  });

  it("merges extra devDependencies", () => {
    const preset = makePreset({
      database: { strategy: "drizzle", driver: "postgres" },
      packageOverrides: {
        db: { devDependencies: { vitest: "catalog:" } },
      },
    });
    const { nodes } = resolveFileTree(preset);
    const pkg = pkgJson(nodes, "packages/db/package.json");
    expect(pkg.devDependencies?.vitest).toBe("catalog:");
    // Original devDeps preserved.
    expect(pkg.devDependencies?.typescript).toBe("catalog:");
  });

  it("override wins on key collision (last-write semantics)", () => {
    const preset = makePreset({
      database: { strategy: "drizzle", driver: "postgres" },
      packageOverrides: {
        db: { dependencies: { "drizzle-orm": "^0.30.0" } },
      },
    });
    const { nodes } = resolveFileTree(preset);
    const pkg = pkgJson(nodes, "packages/db/package.json");
    expect(pkg.dependencies?.["drizzle-orm"]).toBe("^0.30.0");
  });
});

describe("packageOverrides — scripts", () => {
  it("merges scripts into the package.json", () => {
    const preset = makePreset({
      database: { strategy: "drizzle", driver: "postgres" },
      packageOverrides: {
        db: { scripts: { seed: "tsx ./scripts/seed.ts", "db:reset": "drizzle-kit drop" } },
      },
    });
    const { nodes } = resolveFileTree(preset);
    const pkg = pkgJson(nodes, "packages/db/package.json");
    expect(pkg.scripts?.seed).toBe("tsx ./scripts/seed.ts");
    expect(pkg.scripts?.["db:reset"]).toBe("drizzle-kit drop");
    // Resolver's `lint` + `type-check` still there.
    expect(pkg.scripts?.["type-check"]).toBe("tsc --noEmit");
  });
});

describe("packageOverrides — extraFiles", () => {
  it("writes extra files at the package root", () => {
    const preset = makePreset({
      integrations: { ...makePreset().integrations, cache: "upstash" },
      packageOverrides: {
        cache: {
          extraFiles: [{ path: "README.md", content: "# Cache\n\nProvider-neutral cache.\n" }],
        },
      },
    });
    const { nodes } = resolveFileTree(preset);
    const readme = file(nodes, "packages/cache/README.md");
    expect(readme).toBeDefined();
    expect(readme?.content).toContain("# Cache");
  });

  it("writes extra files at nested paths", () => {
    const preset = makePreset({
      integrations: { ...makePreset().integrations, cache: "upstash" },
      packageOverrides: {
        cache: {
          extraFiles: [{ path: "docs/usage.md", content: "## Usage\n" }],
        },
      },
    });
    const { nodes } = resolveFileTree(preset);
    expect(file(nodes, "packages/cache/docs/usage.md")).toBeDefined();
  });

  it("refuses to overwrite a resolver-generated file", () => {
    const preset = makePreset({
      integrations: { ...makePreset().integrations, cache: "upstash" },
      packageOverrides: {
        cache: {
          extraFiles: [{ path: "package.json", content: "{}" }],
        },
      },
    });
    expect(() => resolveFileTree(preset)).toThrow(/cannot overwrite/);
  });
});

describe("packageOverrides — exports", () => {
  it("merges extra exports into both the Package and package.json", () => {
    const preset = makePreset({
      integrations: { ...makePreset().integrations, cache: "upstash" },
      packageOverrides: {
        cache: { exports: ["./pubsub"] },
      },
    });
    const { nodes } = resolveFileTree(preset);
    const pkg = pkgJson(nodes, "packages/cache/package.json");
    expect(Object.keys(pkg.exports as Record<string, unknown>)).toContain(".");
    expect(Object.keys(pkg.exports as Record<string, unknown>)).toContain("./pubsub");
  });

  it("dedupes when the user-added export already exists", () => {
    const preset = makePreset({
      auth: { provider: "clerk", rbac: false, entitlements: false },
      packageOverrides: {
        auth: { exports: ["./server"] /* already provided by auth */ },
      },
    });
    const { nodes } = resolveFileTree(preset);
    const pkg = pkgJson(nodes, "packages/auth/package.json");
    const keys = Object.keys(pkg.exports as Record<string, unknown>);
    expect(keys.filter((k) => k === "./server")).toHaveLength(1);
  });
});

describe("packageOverrides — user-declared packages", () => {
  it("applies to non-auto packages too (e.g. ui)", () => {
    const preset = makePreset({
      packages: [{ name: "ui", type: "react-library", producesCSS: true, exports: ["."] }],
      packageOverrides: {
        ui: {
          scripts: { storybook: "storybook dev" },
          extraFiles: [{ path: ".storybook/main.ts", content: "export default {}\n" }],
        },
      },
    });
    const { nodes } = resolveFileTree(preset);
    const pkg = pkgJson(nodes, "packages/ui/package.json");
    expect(pkg.scripts?.storybook).toBe("storybook dev");
    expect(file(nodes, "packages/ui/.storybook/main.ts")).toBeDefined();
  });
});
