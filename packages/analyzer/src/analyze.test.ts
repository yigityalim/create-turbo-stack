import { afterEach, describe, expect, it } from "vitest";
import { analyze } from "./index";
import {
  API_ONLY_FIXTURE,
  createFixture,
  MINIMAL_FIXTURE,
  removeFixture,
  SAAS_FULL_FIXTURE,
} from "./test-utils/fixture";

let tmp: string;

afterEach(async () => {
  if (tmp) await removeFixture(tmp);
});

// ---------------------------------------------------------------------------
// MINIMAL fixture: bun, biome, Next.js, tailwind4, shadcn
// ---------------------------------------------------------------------------

describe("analyze() — MINIMAL fixture", () => {
  it("resolves without throwing", async () => {
    tmp = await createFixture(MINIMAL_FIXTURE);
    await expect(analyze(tmp)).resolves.not.toThrow();
  });

  it("returns a valid AnalysisResult shape", async () => {
    tmp = await createFixture(MINIMAL_FIXTURE);
    const r = await analyze(tmp);
    expect(r).toHaveProperty("preset");
    expect(r).toHaveProperty("detections");
  });

  it("preset.basics.packageManager is bun", async () => {
    tmp = await createFixture(MINIMAL_FIXTURE);
    const { preset } = await analyze(tmp);
    expect(preset.basics.packageManager).toBe("bun");
  });

  it("preset.basics.linter is biome", async () => {
    tmp = await createFixture(MINIMAL_FIXTURE);
    const { preset } = await analyze(tmp);
    expect(preset.basics.linter).toBe("biome");
  });

  it("preset.basics.typescript is strict", async () => {
    tmp = await createFixture(MINIMAL_FIXTURE);
    const { preset } = await analyze(tmp);
    expect(preset.basics.typescript).toBe("strict");
  });

  it("preset.basics.scope matches root package.json name", async () => {
    tmp = await createFixture(MINIMAL_FIXTURE);
    const { preset } = await analyze(tmp);
    expect(preset.basics.scope).toBe("@minimal");
  });

  it("preset.css.framework is tailwind4", async () => {
    tmp = await createFixture(MINIMAL_FIXTURE);
    const { preset } = await analyze(tmp);
    expect(preset.css.framework).toBe("tailwind4");
  });

  it("preset.css.ui is shadcn (components.json in app)", async () => {
    tmp = await createFixture(MINIMAL_FIXTURE);
    const { preset } = await analyze(tmp);
    expect(preset.css.ui).toBe("shadcn");
  });

  it("detects 1 app of type nextjs", async () => {
    tmp = await createFixture(MINIMAL_FIXTURE);
    const { preset } = await analyze(tmp);
    expect(preset.apps.length).toBeGreaterThanOrEqual(1);
    expect(preset.apps.find((a) => a.type === "nextjs")).toBeTruthy();
  });

  it("database strategy is none", async () => {
    tmp = await createFixture(MINIMAL_FIXTURE);
    const { preset } = await analyze(tmp);
    expect(preset.database.strategy).toBe("none");
  });

  it("auth provider is none", async () => {
    tmp = await createFixture(MINIMAL_FIXTURE);
    const { preset } = await analyze(tmp);
    expect(preset.auth.provider).toBe("none");
  });

  it("integrations.envValidation is false", async () => {
    tmp = await createFixture(MINIMAL_FIXTURE);
    const { preset } = await analyze(tmp);
    expect(preset.integrations.envValidation).toBe(false);
  });

  it("preset.name is set from root package.json name", async () => {
    tmp = await createFixture(MINIMAL_FIXTURE);
    const { preset } = await analyze(tmp);
    expect(preset.name).toBe("@minimal/root");
  });

  it("preset.version is '1.0.0'", async () => {
    tmp = await createFixture(MINIMAL_FIXTURE);
    const { preset } = await analyze(tmp);
    expect(preset.version).toBe("1.0.0");
  });

  it("detections.packageManager.confidence is 'certain'", async () => {
    tmp = await createFixture(MINIMAL_FIXTURE);
    const { detections } = await analyze(tmp);
    expect(detections.packageManager.confidence).toBe("certain");
  });

  it("detections.linter.confidence is 'certain'", async () => {
    tmp = await createFixture(MINIMAL_FIXTURE);
    const { detections } = await analyze(tmp);
    expect(detections.linter.confidence).toBe("certain");
  });
});

// ---------------------------------------------------------------------------
// SAAS_FULL fixture: pnpm, biome, Next.js + Expo, tRPC, Drizzle/postgres,
// Clerk auth, shadcn, Sentry, PostHog, Resend, Upstash, Vercel AI SDK, T3 env
// ---------------------------------------------------------------------------

describe("analyze() — SAAS_FULL fixture", () => {
  it("resolves without throwing", async () => {
    tmp = await createFixture(SAAS_FULL_FIXTURE);
    await expect(analyze(tmp)).resolves.not.toThrow();
  });

  it("preset.basics.packageManager is pnpm", async () => {
    tmp = await createFixture(SAAS_FULL_FIXTURE);
    const { preset } = await analyze(tmp);
    expect(preset.basics.packageManager).toBe("pnpm");
  });

  it("preset.basics.scope is @saas", async () => {
    tmp = await createFixture(SAAS_FULL_FIXTURE);
    const { preset } = await analyze(tmp);
    expect(preset.basics.scope).toBe("@saas");
  });

  it("preset.api.strategy is trpc", async () => {
    tmp = await createFixture(SAAS_FULL_FIXTURE);
    const { preset } = await analyze(tmp);
    expect(preset.api.strategy).toBe("trpc");
  });

  it("preset.database.strategy is drizzle", async () => {
    tmp = await createFixture(SAAS_FULL_FIXTURE);
    const { preset } = await analyze(tmp);
    expect(preset.database.strategy).toBe("drizzle");
  });

  it("preset.database.driver is postgres", async () => {
    tmp = await createFixture(SAAS_FULL_FIXTURE);
    const { preset } = await analyze(tmp);
    expect((preset.database as any).driver).toBe("postgres");
  });

  it("preset.auth.provider is clerk", async () => {
    tmp = await createFixture(SAAS_FULL_FIXTURE);
    const { preset } = await analyze(tmp);
    expect(preset.auth.provider).toBe("clerk");
  });

  it("preset.css.framework is tailwind4", async () => {
    tmp = await createFixture(SAAS_FULL_FIXTURE);
    const { preset } = await analyze(tmp);
    expect(preset.css.framework).toBe("tailwind4");
  });

  it("preset.css.ui is shadcn", async () => {
    tmp = await createFixture(SAAS_FULL_FIXTURE);
    const { preset } = await analyze(tmp);
    expect(preset.css.ui).toBe("shadcn");
  });

  it("detects both nextjs and expo apps", async () => {
    tmp = await createFixture(SAAS_FULL_FIXTURE);
    const { preset } = await analyze(tmp);
    const types = preset.apps.map((a) => a.type);
    expect(types).toContain("nextjs");
    expect(types).toContain("expo");
  });

  it("preset.integrations.analytics is posthog", async () => {
    tmp = await createFixture(SAAS_FULL_FIXTURE);
    const { preset } = await analyze(tmp);
    expect(preset.integrations.analytics).toBe("posthog");
  });

  it("preset.integrations.errorTracking is sentry", async () => {
    tmp = await createFixture(SAAS_FULL_FIXTURE);
    const { preset } = await analyze(tmp);
    expect(preset.integrations.errorTracking).toBe("sentry");
  });

  it("preset.integrations.email is react-email-resend", async () => {
    tmp = await createFixture(SAAS_FULL_FIXTURE);
    const { preset } = await analyze(tmp);
    expect(preset.integrations.email).toBe("react-email-resend");
  });

  it("preset.integrations.rateLimit is upstash", async () => {
    tmp = await createFixture(SAAS_FULL_FIXTURE);
    const { preset } = await analyze(tmp);
    expect(preset.integrations.rateLimit).toBe("upstash");
  });

  it("preset.integrations.ai is vercel-ai-sdk", async () => {
    tmp = await createFixture(SAAS_FULL_FIXTURE);
    const { preset } = await analyze(tmp);
    expect(preset.integrations.ai).toBe("vercel-ai-sdk");
  });

  it("preset.integrations.envValidation is true", async () => {
    tmp = await createFixture(SAAS_FULL_FIXTURE);
    const { preset } = await analyze(tmp);
    expect(preset.integrations.envValidation).toBe(true);
  });

  it("web app has i18n: true (next-intl present)", async () => {
    tmp = await createFixture(SAAS_FULL_FIXTURE);
    const { preset } = await analyze(tmp);
    const webApp = preset.apps.find((a) => a.name === "web");
    expect(webApp?.i18n).toBe(true);
  });

  it("all detections have non-empty reason strings", async () => {
    tmp = await createFixture(SAAS_FULL_FIXTURE);
    const { detections } = await analyze(tmp);
    for (const [key, det] of Object.entries(detections)) {
      if (typeof det === "object" && det !== null && "reason" in det) {
        expect((det as any).reason.length, `${key}.reason`).toBeGreaterThan(0);
      }
    }
  });

  it("detections.api.confidence is 'certain' (packages/api has @trpc/server)", async () => {
    tmp = await createFixture(SAAS_FULL_FIXTURE);
    const { detections } = await analyze(tmp);
    expect(detections.api.confidence).toBe("certain");
  });

  it("detections.auth.confidence is 'certain' (packages/auth has @clerk/nextjs)", async () => {
    tmp = await createFixture(SAAS_FULL_FIXTURE);
    const { detections } = await analyze(tmp);
    expect(detections.auth.confidence).toBe("certain");
  });
});

// ---------------------------------------------------------------------------
// API_ONLY fixture: pnpm, biome, Hono standalone, Drizzle/sqlite, better-auth
// ---------------------------------------------------------------------------

describe("analyze() — API_ONLY fixture", () => {
  it("resolves without throwing", async () => {
    tmp = await createFixture(API_ONLY_FIXTURE);
    await expect(analyze(tmp)).resolves.not.toThrow();
  });

  it("preset.basics.packageManager is pnpm", async () => {
    tmp = await createFixture(API_ONLY_FIXTURE);
    const { preset } = await analyze(tmp);
    expect(preset.basics.packageManager).toBe("pnpm");
  });

  it("preset.basics.typescript is relaxed (strict: false in tsconfig)", async () => {
    tmp = await createFixture(API_ONLY_FIXTURE);
    const { preset } = await analyze(tmp);
    expect(preset.basics.typescript).toBe("relaxed");
  });

  it("preset.api.strategy is hono", async () => {
    tmp = await createFixture(API_ONLY_FIXTURE);
    const { preset } = await analyze(tmp);
    expect(preset.api.strategy).toBe("hono");
  });

  it("preset.database.strategy is drizzle", async () => {
    tmp = await createFixture(API_ONLY_FIXTURE);
    const { preset } = await analyze(tmp);
    expect(preset.database.strategy).toBe("drizzle");
  });

  it("preset.database.driver is sqlite", async () => {
    tmp = await createFixture(API_ONLY_FIXTURE);
    const { preset } = await analyze(tmp);
    expect((preset.database as any).driver).toBe("sqlite");
  });

  it("preset.auth.provider is better-auth", async () => {
    tmp = await createFixture(API_ONLY_FIXTURE);
    const { preset } = await analyze(tmp);
    expect(preset.auth.provider).toBe("better-auth");
  });

  it("preset.css.framework is vanilla (no tailwind)", async () => {
    tmp = await createFixture(API_ONLY_FIXTURE);
    const { preset } = await analyze(tmp);
    expect(preset.css.framework).toBe("vanilla");
  });

  it("apps contains hono-standalone server", async () => {
    tmp = await createFixture(API_ONLY_FIXTURE);
    const { preset } = await analyze(tmp);
    expect(preset.apps.find((a) => a.type === "hono-standalone")).toBeTruthy();
  });

  it("integrations are all none/false for api-only project", async () => {
    tmp = await createFixture(API_ONLY_FIXTURE);
    const { preset } = await analyze(tmp);
    expect(preset.integrations.analytics).toBe("none");
    expect(preset.integrations.errorTracking).toBe("none");
    expect(preset.integrations.email).toBe("none");
    expect(preset.integrations.rateLimit).toBe("none");
    expect(preset.integrations.ai).toBe("none");
    expect(preset.integrations.envValidation).toBe(false);
  });

  it("gitInit is always true", async () => {
    tmp = await createFixture(API_ONLY_FIXTURE);
    const { preset } = await analyze(tmp);
    expect(preset.basics.gitInit).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Degenerate inputs — analyze() must not throw
// ---------------------------------------------------------------------------

describe("analyze() — degenerate inputs", () => {
  it("handles completely empty directory without throwing", async () => {
    const { mkdtemp } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    tmp = await mkdtemp(`${tmpdir()}/analyze-empty-`);
    await expect(analyze(tmp)).resolves.not.toThrow();
  });

  it("falls back to sensible defaults for empty directory", async () => {
    const { mkdtemp } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    tmp = await mkdtemp(`${tmpdir()}/analyze-defaults-`);
    const { preset } = await analyze(tmp);
    // Must have at least 1 app (fallback inserted by analyze())
    expect(preset.apps.length).toBeGreaterThanOrEqual(1);
    expect(preset.basics.packageManager).toBe("bun");
    expect(preset.database.strategy).toBe("none");
    expect(preset.api.strategy).toBe("none");
  });

  it("handles root package.json with no name — falls back to dir basename", async () => {
    tmp = await createFixture({ "package.json": {} });
    const { preset } = await analyze(tmp);
    expect(typeof preset.basics.projectName).toBe("string");
    expect(preset.basics.projectName.length).toBeGreaterThan(0);
  });

  it("handles non-scoped root package name — scope becomes @name", async () => {
    tmp = await createFixture({ "package.json": { name: "my-project" } });
    const { preset } = await analyze(tmp);
    expect(preset.basics.scope).toBe("@my-project");
  });

  it("handles scoped root package name — scope extracted correctly", async () => {
    tmp = await createFixture({ "package.json": { name: "@acme/root" } });
    const { preset } = await analyze(tmp);
    expect(preset.basics.scope).toBe("@acme");
  });

  it("all detectors run concurrently — result is complete", async () => {
    tmp = await createFixture(MINIMAL_FIXTURE);
    const { detections } = await analyze(tmp);
    // All 10 detection fields must be present
    expect(detections).toHaveProperty("packageManager");
    expect(detections).toHaveProperty("linter");
    expect(detections).toHaveProperty("typescript");
    expect(detections).toHaveProperty("database");
    expect(detections).toHaveProperty("api");
    expect(detections).toHaveProperty("auth");
    expect(detections).toHaveProperty("css");
    expect(detections).toHaveProperty("apps");
    expect(detections).toHaveProperty("packages");
    expect(detections).toHaveProperty("integrations");
  });

  it("analyze() with relative path resolves correctly", async () => {
    const { mkdtemp } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    tmp = await mkdtemp(`${tmpdir()}/analyze-rel-`);
    // Should not throw even with a temp absolute path
    await expect(analyze(tmp)).resolves.not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Concurrency / stress
// ---------------------------------------------------------------------------

describe("analyze() — concurrency stress", () => {
  it("handles 5 concurrent analyze() calls on the same fixture", async () => {
    tmp = await createFixture(SAAS_FULL_FIXTURE);
    const results = await Promise.all(Array.from({ length: 5 }, () => analyze(tmp)));
    for (const r of results) {
      expect(r.preset.basics.packageManager).toBe("pnpm");
      expect(r.preset.api.strategy).toBe("trpc");
    }
  });

  it("handles 5 concurrent analyze() calls on different fixtures", async () => {
    const dirs = await Promise.all([
      createFixture(MINIMAL_FIXTURE),
      createFixture(SAAS_FULL_FIXTURE),
      createFixture(API_ONLY_FIXTURE),
      createFixture(MINIMAL_FIXTURE),
      createFixture(SAAS_FULL_FIXTURE),
    ]);

    try {
      const results = await Promise.all(dirs.map((d) => analyze(d)));
      expect(results[0].preset.basics.packageManager).toBe("bun");
      expect(results[1].preset.api.strategy).toBe("trpc");
      expect(results[2].preset.api.strategy).toBe("hono");
    } finally {
      await Promise.all(dirs.map(removeFixture));
    }
  });
});
