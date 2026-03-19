import { describe, expect, it } from "vitest";
import { computeTurboConfig } from "../../src/wiring/turbo-tasks";
import { makePreset } from "../preset-factory";

describe("computeTurboConfig — base tasks", () => {
  it("minimal preset has build, dev, lint, type-check tasks", () => {
    const cfg = computeTurboConfig(makePreset());
    expect(cfg.tasks).toHaveProperty("build");
    expect(cfg.tasks).toHaveProperty("dev");
    expect(cfg.tasks).toHaveProperty("lint");
    expect(cfg.tasks).toHaveProperty("type-check");
  });

  it("build depends on ^build", () => {
    const cfg = computeTurboConfig(makePreset());
    expect(cfg.tasks.build.dependsOn).toContain("^build");
  });

  it("dev is persistent and not cached", () => {
    const cfg = computeTurboConfig(makePreset());
    expect(cfg.tasks.dev.cache).toBe(false);
    expect(cfg.tasks.dev.persistent).toBe(true);
  });

  it("$schema is set", () => {
    expect(computeTurboConfig(makePreset()).$schema).toContain("turborepo");
  });

  it("ui is 'tui'", () => {
    expect(computeTurboConfig(makePreset()).ui).toBe("tui");
  });

  it("globalDependencies includes .env.*local", () => {
    expect(computeTurboConfig(makePreset()).globalDependencies).toContain(".env.*local");
  });
});

describe("computeTurboConfig — build outputs", () => {
  it("nextjs app → .next/** in outputs", () => {
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
    expect(computeTurboConfig(p).tasks.build.outputs).toContain(".next/**");
  });

  it("nextjs app → !.next/cache/** in outputs", () => {
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
    expect(computeTurboConfig(p).tasks.build.outputs).toContain("!.next/cache/**");
  });

  it("hono-standalone app → dist/** in outputs", () => {
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
    expect(computeTurboConfig(p).tasks.build.outputs).toContain("dist/**");
  });

  it("no apps → outputs is empty array", () => {
    expect(computeTurboConfig(makePreset({ apps: [] })).tasks.build.outputs).toHaveLength(0);
  });
});

describe("computeTurboConfig — database tasks", () => {
  it("drizzle → db:generate, db:migrate, db:push tasks", () => {
    const p = makePreset({
      database: { strategy: "drizzle", driver: "postgres" },
    });
    const tasks = computeTurboConfig(p).tasks;
    expect(tasks).toHaveProperty("db:generate");
    expect(tasks).toHaveProperty("db:migrate");
    expect(tasks).toHaveProperty("db:push");
  });

  it("drizzle db tasks have cache: false", () => {
    const p = makePreset({
      database: { strategy: "drizzle", driver: "postgres" },
    });
    const tasks = computeTurboConfig(p).tasks;
    expect(tasks["db:generate"].cache).toBe(false);
    expect(tasks["db:migrate"].cache).toBe(false);
    expect(tasks["db:push"].cache).toBe(false);
  });

  it("prisma → db:generate + db:migrate but NOT db:push", () => {
    const p = makePreset({ database: { strategy: "prisma" } });
    const tasks = computeTurboConfig(p).tasks;
    expect(tasks).toHaveProperty("db:generate");
    expect(tasks).toHaveProperty("db:migrate");
    expect(tasks).not.toHaveProperty("db:push");
  });

  it("database: none → no db tasks", () => {
    const tasks = computeTurboConfig(makePreset()).tasks;
    expect(tasks).not.toHaveProperty("db:generate");
    expect(tasks).not.toHaveProperty("db:migrate");
  });
});

describe("computeTurboConfig — globalEnv passthrough", () => {
  it("passed globalEnv appears in config.globalEnv", () => {
    const cfg = computeTurboConfig(makePreset(), ["DATABASE_URL", "CLERK_SECRET_KEY"]);
    expect(cfg.globalEnv).toContain("DATABASE_URL");
    expect(cfg.globalEnv).toContain("CLERK_SECRET_KEY");
  });

  it("empty globalEnv → config.globalEnv is empty", () => {
    expect(computeTurboConfig(makePreset(), []).globalEnv).toHaveLength(0);
  });

  it("default globalEnv (no arg) → empty", () => {
    expect(computeTurboConfig(makePreset()).globalEnv).toHaveLength(0);
  });
});
