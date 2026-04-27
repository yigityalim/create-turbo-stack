import type { Package } from "@create-turbo-stack/schema";
import { describe, expect, it } from "vitest";
import { resolvePackageFiles } from "../../src/resolve/package-files";
import { makePreset } from "../preset-factory";

function paths(preset: Parameters<typeof resolvePackageFiles>[0], pkg: Package) {
  return resolvePackageFiles(preset, pkg).map((n) => n.path);
}

// typescript-config package

describe("resolvePackageFiles — typescript-config", () => {
  const TS_PKG: Package = {
    name: "typescript-config",
    type: "config",
    producesCSS: false,
    exports: ["."],
  };
  const p = makePreset();

  it("all paths start with packages/typescript-config/", () => {
    for (const path of paths(p, TS_PKG)) {
      expect(path).toMatch(/^packages\/typescript-config\//);
    }
  });

  it("includes base.json", () => {
    expect(paths(p, TS_PKG)).toContain("packages/typescript-config/base.json");
  });

  it("includes react.json", () => {
    expect(paths(p, TS_PKG)).toContain("packages/typescript-config/react.json");
  });

  it("includes nextjs.json", () => {
    expect(paths(p, TS_PKG)).toContain("packages/typescript-config/nextjs.json");
  });

  it("includes library.json", () => {
    expect(paths(p, TS_PKG)).toContain("packages/typescript-config/library.json");
  });

  it("includes package.json", () => {
    expect(paths(p, TS_PKG)).toContain("packages/typescript-config/package.json");
  });

  it("all JSON files have valid JSON content", () => {
    const nodes = resolvePackageFiles(p, TS_PKG).filter(
      (n) => n.path.endsWith(".json") && !n.isDirectory,
    );
    for (const n of nodes) {
      expect(() => JSON.parse(n.content!), `${n.path}`).not.toThrow();
    }
  });
});

describe("resolvePackageFiles — ui package", () => {
  const UI_PKG: Package = {
    name: "ui",
    type: "ui",
    producesCSS: true,
    exports: ["."],
  };
  const p = makePreset({ packages: [UI_PKG] });

  it("all paths start with packages/ui/", () => {
    for (const path of paths(p, UI_PKG)) {
      expect(path).toMatch(/^packages\/ui\//);
    }
  });

  it("includes package.json", () => {
    expect(paths(p, UI_PKG)).toContain("packages/ui/package.json");
  });

  it("includes src/index.ts", () => {
    expect(paths(p, UI_PKG)).toContain("packages/ui/src/index.ts");
  });
});

describe("resolvePackageFiles — library package", () => {
  const LIB_PKG: Package = {
    name: "utils",
    type: "utils",
    producesCSS: false,
    exports: ["."],
  };
  const p = makePreset({ packages: [LIB_PKG] });

  it("includes package.json", () => {
    expect(paths(p, LIB_PKG)).toContain("packages/utils/package.json");
  });

  it("includes src/index.ts", () => {
    expect(paths(p, LIB_PKG)).toContain("packages/utils/src/index.ts");
  });

  it("no node has empty content", () => {
    for (const n of resolvePackageFiles(p, LIB_PKG).filter((n) => !n.isDirectory)) {
      expect(n.content?.length ?? 0, `${n.path}`).toBeGreaterThan(0);
    }
  });
});

// db package — drizzle

describe("resolvePackageFiles — db (drizzle)", () => {
  const DB_PKG: Package = {
    name: "db",
    type: "library",
    producesCSS: false,
    exports: ["."],
  };
  const p = makePreset({
    database: { strategy: "drizzle", driver: "postgres" },
  });

  it("all paths start with packages/db/", () => {
    for (const path of paths(p, DB_PKG)) {
      expect(path).toMatch(/^packages\/db\//);
    }
  });

  it("includes package.json", () => {
    expect(paths(p, DB_PKG)).toContain("packages/db/package.json");
  });
});

// db package — prisma

describe("resolvePackageFiles — db (prisma)", () => {
  const DB_PKG: Package = {
    name: "db",
    type: "library",
    producesCSS: false,
    exports: ["."],
  };
  const p = makePreset({ database: { strategy: "prisma" } });

  it("all paths start with packages/db/", () => {
    for (const path of paths(p, DB_PKG)) {
      expect(path).toMatch(/^packages\/db\//);
    }
  });
});

// api package — trpc

describe("resolvePackageFiles — api (trpc)", () => {
  const API_PKG: Package = {
    name: "api",
    type: "library",
    producesCSS: false,
    exports: [".", "./server", "./client"],
  };
  const p = makePreset({ api: { strategy: "trpc", version: "v11" } });

  it("all paths start with packages/api/", () => {
    for (const path of paths(p, API_PKG)) {
      expect(path).toMatch(/^packages\/api\//);
    }
  });
});

// auth package — clerk

describe("resolvePackageFiles — auth (clerk)", () => {
  const AUTH_PKG: Package = {
    name: "auth",
    type: "library",
    producesCSS: false,
    exports: [".", "./server", "./client", "./middleware"],
  };
  const p = makePreset({
    auth: { provider: "clerk", rbac: false, entitlements: false },
  });

  it("all paths start with packages/auth/", () => {
    for (const path of paths(p, AUTH_PKG)) {
      expect(path).toMatch(/^packages\/auth\//);
    }
  });
});
