import { describe, expect, it } from "vitest";
import { computeTsconfigChain } from "../../src/wiring/tsconfig-chain";
import { makePreset } from "../preset-factory";

function targetFor(preset: Parameters<typeof computeTsconfigChain>[0], path: string) {
  return computeTsconfigChain(preset).find((t) => t.path === path);
}

describe("computeTsconfigChain — packages", () => {
  it("ui package → extends react.json", () => {
    const p = makePreset({
      packages: [{ name: "ui", type: "ui", producesCSS: true, exports: ["."] }],
    });
    const t = targetFor(p, "packages/ui/tsconfig.json");
    expect(t?.extends).toContain("react.json");
  });

  it("react-library package → extends react.json", () => {
    const p = makePreset({
      packages: [
        {
          name: "components",
          type: "react-library",
          producesCSS: false,
          exports: ["."],
        },
      ],
    });
    const t = targetFor(p, "packages/components/tsconfig.json");
    expect(t?.extends).toContain("react.json");
  });

  it("library package → extends library.json", () => {
    const p = makePreset({
      packages: [{ name: "core", type: "library", producesCSS: false, exports: ["."] }],
    });
    const t = targetFor(p, "packages/core/tsconfig.json");
    expect(t?.extends).toContain("library.json");
  });

  it("utils package → extends library.json", () => {
    const p = makePreset({
      packages: [{ name: "utils", type: "utils", producesCSS: false, exports: ["."] }],
    });
    const t = targetFor(p, "packages/utils/tsconfig.json");
    expect(t?.extends).toContain("library.json");
  });

  it("config package → extends base.json", () => {
    const p = makePreset({
      packages: [{ name: "config", type: "config", producesCSS: false, exports: ["."] }],
    });
    const t = targetFor(p, "packages/config/tsconfig.json");
    expect(t?.extends).toContain("base.json");
  });

  it("package tsconfig has outDir + rootDir in compilerOptions", () => {
    const p = makePreset({
      packages: [{ name: "core", type: "library", producesCSS: false, exports: ["."] }],
    });
    const t = targetFor(p, "packages/core/tsconfig.json");
    expect(t?.compilerOptions.outDir).toBe("./dist");
    expect(t?.compilerOptions.rootDir).toBe("./src");
  });
});

describe("computeTsconfigChain — apps", () => {
  it("nextjs app → extends nextjs.json", () => {
    const p = makePreset({
      apps: [
        {
          name: "web",
          type: "nextjs",
          port: 3000,
          i18n: false,
          cms: "none",
          consumes: [],
        },
      ],
    });
    const t = targetFor(p, "apps/web/tsconfig.json");
    expect(t?.extends).toContain("nextjs.json");
  });

  it("nextjs app → include contains next-env.d.ts", () => {
    const p = makePreset({
      apps: [
        {
          name: "web",
          type: "nextjs",
          port: 3000,
          i18n: false,
          cms: "none",
          consumes: [],
        },
      ],
    });
    const t = targetFor(p, "apps/web/tsconfig.json");
    expect(t?.include).toContain("next-env.d.ts");
  });

  it("nextjs app → no outDir/rootDir in compilerOptions", () => {
    const p = makePreset({
      apps: [
        {
          name: "web",
          type: "nextjs",
          port: 3000,
          i18n: false,
          cms: "none",
          consumes: [],
        },
      ],
    });
    const t = targetFor(p, "apps/web/tsconfig.json");
    expect(t?.compilerOptions.outDir).toBeUndefined();
  });

  it("hono-standalone app → extends base.json + has outDir/rootDir", () => {
    const p = makePreset({
      apps: [
        {
          name: "server",
          type: "hono-standalone",
          port: 3001,
          i18n: false,
          cms: "none",
          consumes: [],
        },
      ],
    });
    const t = targetFor(p, "apps/server/tsconfig.json");
    expect(t?.extends).toContain("base.json");
    expect(t?.compilerOptions.outDir).toBe("./dist");
    expect(t?.compilerOptions.rootDir).toBe("./src");
  });

  it("expo app → extends react.json", () => {
    const p = makePreset({
      apps: [
        {
          name: "mobile",
          type: "expo",
          port: 8081,
          i18n: false,
          cms: "none",
          consumes: [],
        },
      ],
    });
    const t = targetFor(p, "apps/mobile/tsconfig.json");
    expect(t?.extends).toContain("react.json");
  });

  it("scope is embedded in extends path", () => {
    const p = makePreset({
      apps: [
        {
          name: "web",
          type: "nextjs",
          port: 3000,
          i18n: false,
          cms: "none",
          consumes: [],
        },
      ],
    });
    const t = targetFor(p, "apps/web/tsconfig.json");
    expect(t?.extends).toContain("@test/typescript-config");
  });
});

describe("computeTsconfigChain — multiple targets", () => {
  it("2 apps + 2 packages → 4 targets total", () => {
    const p = makePreset({
      apps: [
        {
          name: "web",
          type: "nextjs",
          port: 3000,
          i18n: false,
          cms: "none",
          consumes: [],
        },
        {
          name: "server",
          type: "hono-standalone",
          port: 3001,
          i18n: false,
          cms: "none",
          consumes: [],
        },
      ],
      packages: [
        { name: "ui", type: "ui", producesCSS: true, exports: ["."] },
        { name: "utils", type: "utils", producesCSS: false, exports: ["."] },
      ],
    });
    expect(computeTsconfigChain(p)).toHaveLength(4);
  });

  it("bare preset → empty array", () => {
    expect(computeTsconfigChain(makePreset({ apps: [], packages: [] }))).toHaveLength(0);
  });
});
