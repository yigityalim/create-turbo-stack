import type { App } from "@create-turbo-stack/schema";
import { describe, expect, it } from "vitest";
import { resolveAppFiles } from "../../src/resolve/app-files";
import { makePreset } from "../preset-factory";

function paths(preset: Parameters<typeof resolveAppFiles>[0], app: App) {
  return resolveAppFiles(preset, app).map((n) => n.path);
}

const NEXTJS_APP: App = {
  name: "web",
  type: "nextjs",
  port: 3000,
  i18n: false,
  cms: "none",
  consumes: [],
};

const HONO_APP: App = {
  name: "server",
  type: "hono-standalone",
  port: 3001,
  i18n: false,
  cms: "none",
  consumes: [],
};

// Next.js app

describe("resolveAppFiles — nextjs", () => {
  it("all paths start with apps/web/", () => {
    const p = makePreset({ apps: [NEXTJS_APP] });
    for (const path of paths(p, NEXTJS_APP)) {
      expect(path).toMatch(/^apps\/web\//);
    }
  });

  it("includes package.json", () => {
    const p = makePreset({ apps: [NEXTJS_APP] });
    expect(paths(p, NEXTJS_APP)).toContain("apps/web/package.json");
  });

  it("includes tsconfig.json", () => {
    const p = makePreset({ apps: [NEXTJS_APP] });
    expect(paths(p, NEXTJS_APP)).toContain("apps/web/tsconfig.json");
  });

  it("package.json content is valid JSON", () => {
    const p = makePreset({ apps: [NEXTJS_APP] });
    const node = resolveAppFiles(p, NEXTJS_APP).find((n) => n.path === "apps/web/package.json");
    expect(() => JSON.parse(node!.content!)).not.toThrow();
  });

  it("package.json has correct app name", () => {
    const p = makePreset({ apps: [NEXTJS_APP] });
    const node = resolveAppFiles(p, NEXTJS_APP).find((n) => n.path === "apps/web/package.json");
    const pkg = JSON.parse(node!.content!);
    expect(pkg.name).toBe("web");
  });

  it("package.json dev script uses the app's port", () => {
    const p = makePreset({ apps: [NEXTJS_APP] });
    const node = resolveAppFiles(p, NEXTJS_APP).find((n) => n.path === "apps/web/package.json");
    const pkg = JSON.parse(node!.content!);
    expect(pkg.scripts.dev).toContain("3000");
  });

  it("tsconfig extends scope/typescript-config/nextjs.json", () => {
    const p = makePreset({ apps: [NEXTJS_APP] });
    const node = resolveAppFiles(p, NEXTJS_APP).find((n) => n.path === "apps/web/tsconfig.json");
    const cfg = JSON.parse(node!.content!);
    expect(cfg.extends).toContain("nextjs.json");
  });

  it("tsconfig include contains next-env.d.ts", () => {
    const p = makePreset({ apps: [NEXTJS_APP] });
    const node = resolveAppFiles(p, NEXTJS_APP).find((n) => n.path === "apps/web/tsconfig.json");
    const cfg = JSON.parse(node!.content!);
    expect(cfg.include).toContain("next-env.d.ts");
  });

  it("no node has empty content", () => {
    const p = makePreset({ apps: [NEXTJS_APP] });
    const nodes = resolveAppFiles(p, NEXTJS_APP).filter((n) => !n.isDirectory);
    for (const n of nodes) {
      expect(n.content?.length ?? 0, `${n.path} content is empty`).toBeGreaterThan(0);
    }
  });

  it("i18n: true → next-intl in dependencies", () => {
    const app: App = { ...NEXTJS_APP, i18n: true };
    const p = makePreset({ apps: [app] });
    const node = resolveAppFiles(p, app).find((n) => n.path === "apps/web/package.json");
    const pkg = JSON.parse(node!.content!);
    expect(pkg.dependencies).toHaveProperty("next-intl");
  });

  it("i18n: false → next-intl absent", () => {
    const p = makePreset({ apps: [NEXTJS_APP] });
    const node = resolveAppFiles(p, NEXTJS_APP).find((n) => n.path === "apps/web/package.json");
    const pkg = JSON.parse(node!.content!);
    expect(pkg.dependencies?.["next-intl"]).toBeUndefined();
  });
});

// Hono standalone app

describe("resolveAppFiles — hono-standalone", () => {
  it("all paths start with apps/server/", () => {
    const p = makePreset({ apps: [HONO_APP] });
    for (const path of paths(p, HONO_APP)) {
      expect(path).toMatch(/^apps\/server\//);
    }
  });

  it("includes package.json", () => {
    const p = makePreset({ apps: [HONO_APP] });
    expect(paths(p, HONO_APP)).toContain("apps/server/package.json");
  });

  it("includes tsconfig.json", () => {
    const p = makePreset({ apps: [HONO_APP] });
    expect(paths(p, HONO_APP)).toContain("apps/server/tsconfig.json");
  });

  it("package.json has hono in dependencies", () => {
    const p = makePreset({ apps: [HONO_APP] });
    const node = resolveAppFiles(p, HONO_APP).find((n) => n.path === "apps/server/package.json");
    const pkg = JSON.parse(node!.content!);
    expect(pkg.dependencies).toHaveProperty("hono");
  });

  it("tsconfig extends library.json", () => {
    const p = makePreset({ apps: [HONO_APP] });
    const node = resolveAppFiles(p, HONO_APP).find((n) => n.path === "apps/server/tsconfig.json");
    const cfg = JSON.parse(node!.content!);
    expect(cfg.extends).toContain("library.json");
  });

  it("tsconfig has outDir and rootDir", () => {
    const p = makePreset({ apps: [HONO_APP] });
    const node = resolveAppFiles(p, HONO_APP).find((n) => n.path === "apps/server/tsconfig.json");
    const cfg = JSON.parse(node!.content!);
    expect(cfg.compilerOptions.outDir).toBeDefined();
    expect(cfg.compilerOptions.rootDir).toBeDefined();
  });
});

// Unknown app type

describe("resolveAppFiles — unimplemented type", () => {
  it.each([
    "expo",
    "vite-vue",
    "tauri",
  ] as const)("throws UnsupportedAppTypeError for %s", (appType) => {
    const app: App = {
      name: "docs",
      type: appType as App["type"],
      port: 4321,
      i18n: false,
      cms: "none",
      consumes: [],
    };
    const p = makePreset({ apps: [app] });
    expect(() => resolveAppFiles(p, app)).toThrow(/has no scaffold implementation yet/);
  });
});
