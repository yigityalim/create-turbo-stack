import { describe, expect, it } from "vitest";
import { computeWorkspaceRefs } from "../../src/wiring/workspace-refs";
import { makePreset } from "../preset-factory";

describe("computeWorkspaceRefs — app consuming packages", () => {
  it("app consuming ['ui'] → refs include @scope/ui: workspace:*", () => {
    const p = makePreset({
      apps: [
        {
          name: "web",
          type: "nextjs",
          port: 3000,
          i18n: false,
          cms: "none",
          consumes: ["ui"],
        },
      ],
      packages: [{ name: "ui", type: "ui", producesCSS: true, exports: ["."] }],
    });
    const refs = computeWorkspaceRefs(p);
    expect(refs.web?.["@test/ui"]).toBe("workspace:*");
  });

  it("app with no consumes → refs object exists but consumed deps absent", () => {
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
    const refs = computeWorkspaceRefs(p);
    expect(refs.web).toBeDefined();
    expect(refs.web?.["@test/ui"]).toBeUndefined();
  });
});

describe("computeWorkspaceRefs — auto-consumed: envValidation", () => {
  it("envValidation: true → app refs include @scope/env", () => {
    const p = makePreset({
      integrations: { ...makePreset().integrations, envValidation: true },
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
    expect(computeWorkspaceRefs(p).web?.["@test/env"]).toBe("workspace:*");
  });

  it("envValidation: false → @scope/env absent", () => {
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
    expect(computeWorkspaceRefs(p).web?.["@test/env"]).toBeUndefined();
  });
});

describe("computeWorkspaceRefs — auto-consumed: api", () => {
  it("api !== none → app refs include @scope/api", () => {
    const p = makePreset({
      api: { strategy: "trpc", version: "v11" },
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
    expect(computeWorkspaceRefs(p).web?.["@test/api"]).toBe("workspace:*");
  });

  it("api: none → @scope/api absent", () => {
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
    expect(computeWorkspaceRefs(p).web?.["@test/api"]).toBeUndefined();
  });
});

describe("computeWorkspaceRefs — auto-consumed: auth", () => {
  it("auth !== none → app refs include @scope/auth", () => {
    const p = makePreset({
      auth: { provider: "clerk", rbac: false, entitlements: false },
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
    expect(computeWorkspaceRefs(p).web?.["@test/auth"]).toBe("workspace:*");
  });

  it("auth: none → @scope/auth absent", () => {
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
    expect(computeWorkspaceRefs(p).web?.["@test/auth"]).toBeUndefined();
  });
});

describe("computeWorkspaceRefs — package cross-refs", () => {
  it("auth + db both present → refs.auth includes @scope/db", () => {
    const p = makePreset({
      auth: { provider: "clerk", rbac: false, entitlements: false },
      database: { strategy: "drizzle", driver: "postgres" },
      apps: [],
    });
    expect(computeWorkspaceRefs(p).auth?.["@test/db"]).toBe("workspace:*");
  });

  it("auth only, no db → refs.auth does not include @scope/db", () => {
    const p = makePreset({
      auth: { provider: "clerk", rbac: false, entitlements: false },
      database: { strategy: "none" },
      apps: [],
    });
    expect(computeWorkspaceRefs(p).auth?.["@test/db"]).toBeUndefined();
  });

  it("api + db both present → refs.api includes @scope/db", () => {
    const p = makePreset({
      api: { strategy: "trpc", version: "v11" },
      database: { strategy: "drizzle", driver: "postgres" },
      apps: [],
    });
    expect(computeWorkspaceRefs(p).api?.["@test/db"]).toBe("workspace:*");
  });

  it("api only, no db → refs.api does not include @scope/db", () => {
    const p = makePreset({
      api: { strategy: "trpc", version: "v11" },
      database: { strategy: "none" },
      apps: [],
    });
    expect(computeWorkspaceRefs(p).api?.["@test/db"]).toBeUndefined();
  });
});

describe("computeWorkspaceRefs — multiple apps", () => {
  it("each app gets its own refs entry", () => {
    const p = makePreset({
      apps: [
        {
          name: "web",
          type: "nextjs",
          port: 3000,
          i18n: false,
          cms: "none",
          consumes: ["ui"],
        },
        {
          name: "mobile",
          type: "expo",
          port: 8081,
          i18n: false,
          cms: "none",
          consumes: [],
        },
      ],
      packages: [{ name: "ui", type: "ui", producesCSS: true, exports: ["."] }],
    });
    const refs = computeWorkspaceRefs(p);
    expect(refs.web?.["@test/ui"]).toBe("workspace:*");
    expect(refs.mobile?.["@test/ui"]).toBeUndefined();
  });
});

describe("computeWorkspaceRefs — bare preset", () => {
  it("no apps → only package cross-refs if applicable", () => {
    const refs = computeWorkspaceRefs(makePreset({ apps: [], packages: [] }));
    expect(Object.keys(refs).filter((k) => !["auth", "api"].includes(k))).toHaveLength(0);
  });
});
