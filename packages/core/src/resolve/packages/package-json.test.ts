import type { App, FileTreeNode, Preset } from "@create-turbo-stack/schema";
import { describe, expect, it } from "vitest";
import { makePreset } from "../../preset-factory";
import { SUPPORTED_APP_TYPES } from "../app-files";
import { resolveFileTree } from "../file-tree";
import type { PackageJson } from "../manifest-types";

/**
 * Guards the typed-manifest contract: every package.json the engine emits
 * — root, workspace packages, and apps — must be valid JSON, name a
 * package, and (for the module packages) carry the canonical fields.
 * A wrong key or value would now be a compile error in the resolvers, but
 * these tests also catch a template/serialization regression at runtime.
 */

/** Comprehensive preset using only registered app types (no expo). */
function comprehensivePreset(): Preset {
  return makePreset({
    database: { strategy: "drizzle", driver: "postgres" },
    api: { strategy: "trpc", version: "v11" },
    auth: { provider: "clerk", rbac: false, entitlements: false },
    css: { framework: "tailwind4", ui: "shadcn", styling: "css-variables" },
    integrations: {
      analytics: "posthog",
      errorTracking: "sentry",
      email: "react-email-resend",
      rateLimit: "upstash",
      ai: "vercel-ai-sdk",
      envValidation: true,
    },
    apps: [{ name: "web", type: "nextjs", port: 3000, i18n: true, cms: "none", consumes: ["ui"] }],
    packages: [
      { name: "ui", type: "ui", producesCSS: true, exports: ["."] },
      { name: "utils", type: "utils", producesCSS: false, exports: ["."] },
    ],
  });
}

function packageJsonNodes(preset: Preset): FileTreeNode[] {
  return resolveFileTree(preset).nodes.filter(
    (n) => !n.isDirectory && n.path.endsWith("package.json"),
  );
}

function parse(node: FileTreeNode): PackageJson {
  return JSON.parse(node.content ?? "") as PackageJson;
}

describe("emitted package.json — validity", () => {
  const presets = { minimal: makePreset(), comprehensive: comprehensivePreset() };

  for (const [label, preset] of Object.entries(presets)) {
    describe(label, () => {
      const nodes = packageJsonNodes(preset);

      it("emits at least the root package.json", () => {
        expect(nodes.some((n) => n.path === "package.json")).toBe(true);
      });

      it("every package.json is valid JSON", () => {
        for (const n of nodes) {
          expect(() => parse(n), n.path).not.toThrow();
        }
      });

      it("every package.json has a non-empty name", () => {
        for (const n of nodes) {
          const name = parse(n).name;
          expect(typeof name, n.path).toBe("string");
          expect(name.length, n.path).toBeGreaterThan(0);
        }
      });

      it("workspace package + app package.json carry the canonical module fields", () => {
        const modulePkgs = nodes.filter(
          (n) =>
            (n.path.startsWith("packages/") &&
              n.path !== "packages/typescript-config/package.json") ||
            n.path.startsWith("apps/"),
        );
        // The comprehensive preset must actually exercise this set.
        if (label === "comprehensive") expect(modulePkgs.length).toBeGreaterThan(0);
        for (const n of modulePkgs) {
          const pkg = parse(n);
          expect(pkg.version, n.path).toBe("0.1.0");
          expect(pkg.private, n.path).toBe(true);
          expect(pkg.type, n.path).toBe("module");
        }
      });
    });
  }
});

describe("co-located source — env + drizzle", () => {
  const tree = resolveFileTree(comprehensivePreset());
  const find = (path: string) => tree.nodes.find((n) => n.path === path)?.content ?? "";

  it("env package renders createEnv from the provider var union", () => {
    const env = find("packages/env/src/index.ts");
    expect(env).toContain("createEnv(");
    // drizzle declares DATABASE_URL; it must land in the env schema.
    expect(env).toContain("DATABASE_URL");
    expect(env).toContain("runtimeEnv");
    // Builds without secrets must not throw at validation time.
    expect(env).toContain("skipValidation");
  });

  it("drizzle db client is rendered from the postgres branch of client.ts.eta", () => {
    const client = find("packages/db/src/client.ts");
    expect(client).toContain("drizzle-orm/postgres-js");
    expect(client).toContain("export const db");
    // No leading blank line from template whitespace control.
    expect(client.startsWith("\n")).toBe(false);
  });
});

describe("env wiring — validated vs process.env fallback", () => {
  const scope = "@test";
  const drizzle = (envValidation: boolean) =>
    makePreset({
      database: { strategy: "drizzle", driver: "postgres" },
      integrations: {
        analytics: "none",
        errorTracking: "none",
        email: "none",
        rateLimit: "none",
        ai: "none",
        envValidation,
      },
    });
  const fileOf = (preset: Preset, path: string) =>
    resolveFileTree(preset).nodes.find((n) => n.path === path);

  it("imports the validated env package when envValidation is on", () => {
    const client = fileOf(drizzle(true), "packages/db/src/client.ts")?.content ?? "";
    expect(client).toContain(`import { env } from "${scope}/env";`);
    expect(client).toContain("postgres(env.DATABASE_URL)");
    expect(client).not.toContain("process.env.DATABASE_URL");

    const pkg = JSON.parse(fileOf(drizzle(true), "packages/db/package.json")?.content ?? "");
    expect(pkg.dependencies?.[`${scope}/env`]).toBe("workspace:*");
  });

  it("falls back to process.env when envValidation is off", () => {
    const client = fileOf(drizzle(false), "packages/db/src/client.ts")?.content ?? "";
    expect(client).toContain("postgres(process.env.DATABASE_URL!)");
    expect(client).not.toContain(`${scope}/env`);

    // No env package is generated, and db must not depend on one.
    expect(fileOf(drizzle(false), "packages/env/src/index.ts")).toBeUndefined();
    const pkg = JSON.parse(fileOf(drizzle(false), "packages/db/package.json")?.content ?? "");
    expect(pkg.dependencies?.[`${scope}/env`]).toBeUndefined();
  });
});

describe("emitted package.json — every registered app type", () => {
  for (const type of SUPPORTED_APP_TYPES) {
    it(`${type} app emits a valid package.json with module fields`, () => {
      const app: App = { name: "app", type, port: 3000, i18n: false, cms: "none", consumes: [] };
      const preset = makePreset({ apps: [app] });
      const node = resolveFileTree(preset).nodes.find((n) => n.path === "apps/app/package.json");
      expect(node, `${type} produced no package.json`).toBeTruthy();
      const pkg = JSON.parse(node?.content ?? "") as PackageJson;
      expect(pkg.name).toBe("app");
      expect(pkg.type).toBe("module");
      expect(pkg.version).toBe("0.1.0");
    });
  }
});
