import type { Preset } from "@create-turbo-stack/schema";
import { IntegrationsSchema } from "@create-turbo-stack/schema";
import { describe, expect, it } from "vitest";
import { applySwitch, categoryMeta } from "./switch";

function basePreset(overrides: Partial<Preset> = {}): Preset {
  return {
    schemaVersion: "1.0",
    name: "test",
    version: "0.1.0",
    description: "",
    basics: {
      projectName: "my-app",
      scope: "@my-app",
      packageManager: "bun",
      typescript: "strict",
      linter: "biome",
      gitInit: false,
    },
    database: { strategy: "none" },
    api: { strategy: "none" },
    auth: { provider: "none", rbac: false, entitlements: false },
    css: { framework: "tailwind4", ui: "none", styling: "css-variables" },
    integrations: IntegrationsSchema.parse({ envValidation: "none" }),
    apps: [
      { name: "web", type: "nextjs", port: 3000, i18n: false, location: "apps", consumes: [] },
    ],
    packages: [],
    ...overrides,
  };
}

// ─── categoryMeta ─────────────────────────────────────────────────────────────

describe("categoryMeta — known categories", () => {
  it("'db' maps to database enum", () => {
    const meta = categoryMeta("db");
    expect(meta).not.toBeNull();
    expect(meta?.enum).toContain("drizzle");
    expect(meta?.enum).toContain("none");
  });

  it("'database' is an alias for 'db'", () => {
    const db = categoryMeta("db");
    const database = categoryMeta("database");
    expect(db?.enum).toEqual(database?.enum);
    expect(db?.policy).toEqual(database?.policy);
  });

  it("'auth' maps to auth provider enum", () => {
    const meta = categoryMeta("auth");
    expect(meta?.enum).toContain("clerk");
    expect(meta?.enum).toContain("none");
  });

  it("'api' maps to api strategy enum", () => {
    const meta = categoryMeta("api");
    expect(meta?.enum).toContain("trpc");
    expect(meta?.enum).toContain("none");
  });

  it("'analytics' maps to analytics enum", () => {
    const meta = categoryMeta("analytics");
    expect(meta?.enum).toContain("posthog");
    expect(meta?.enum).toContain("none");
  });

  it("'errorTracking' maps to error tracking enum", () => {
    const meta = categoryMeta("errorTracking");
    expect(meta?.enum).toContain("sentry");
  });

  it("'email' maps to email enum", () => {
    const meta = categoryMeta("email");
    expect(meta?.enum).toContain("resend");
  });

  it("'rateLimit' maps to rate limit enum", () => {
    const meta = categoryMeta("rateLimit");
    expect(meta?.enum).toContain("upstash");
  });

  it("'ai' maps to AI enum", () => {
    const meta = categoryMeta("ai");
    expect(meta?.enum).toContain("vercel-ai-sdk");
  });
});

describe("categoryMeta — unknown categories", () => {
  it("returns null for an unknown category", () => {
    expect(categoryMeta("unknown")).toBeNull();
    expect(categoryMeta("")).toBeNull();
    expect(categoryMeta("css")).toBeNull();
  });
});

// ─── applySwitch ──────────────────────────────────────────────────────────────

describe("applySwitch — database", () => {
  it("'db' switches database.strategy", () => {
    const preset = basePreset();
    const result = applySwitch(preset, "db", "supabase");
    expect(result?.database.strategy).toBe("supabase");
  });

  it("'database' alias works the same as 'db'", () => {
    const preset = basePreset();
    const result = applySwitch(preset, "database", "supabase");
    expect(result?.database.strategy).toBe("supabase");
  });

  it("drizzle gets default driver 'postgres'", () => {
    const preset = basePreset();
    const result = applySwitch(preset, "db", "drizzle") as Preset & {
      database: { driver: string };
    };
    expect(result?.database.strategy).toBe("drizzle");
    expect((result?.database as { driver?: string }).driver).toBe("postgres");
  });

  it("none clears the database strategy", () => {
    const preset = basePreset({ database: { strategy: "drizzle", driver: "postgres" } });
    const result = applySwitch(preset, "db", "none");
    expect(result?.database.strategy).toBe("none");
  });

  it("does not mutate the original preset", () => {
    const preset = basePreset();
    applySwitch(preset, "db", "supabase");
    expect(preset.database.strategy).toBe("none");
  });
});

describe("applySwitch — auth", () => {
  it("switches auth.provider", () => {
    const result = applySwitch(basePreset(), "auth", "clerk");
    expect(result?.auth.provider).toBe("clerk");
  });

  it("preserves rbac and entitlements when switching auth", () => {
    const preset = basePreset({ auth: { provider: "none", rbac: true, entitlements: true } });
    const result = applySwitch(preset, "auth", "better-auth");
    expect(result?.auth.rbac).toBe(true);
    expect(result?.auth.entitlements).toBe(true);
  });
});

describe("applySwitch — api", () => {
  it("switches api.strategy", () => {
    const result = applySwitch(basePreset(), "api", "trpc");
    expect(result?.api.strategy).toBe("trpc");
  });
});

describe("applySwitch — integrations", () => {
  it("switches analytics", () => {
    const result = applySwitch(basePreset(), "analytics", "posthog");
    expect(result?.integrations.analytics).toBe("posthog");
  });

  it("switches errorTracking", () => {
    const result = applySwitch(basePreset(), "errorTracking", "sentry");
    expect(result?.integrations.errorTracking).toBe("sentry");
  });

  it("switches email", () => {
    const result = applySwitch(basePreset(), "email", "resend");
    expect(result?.integrations.email).toBe("resend");
  });

  it("switches rateLimit", () => {
    const result = applySwitch(basePreset(), "rateLimit", "upstash");
    expect(result?.integrations.rateLimit).toBe("upstash");
  });

  it("switches ai", () => {
    const result = applySwitch(basePreset(), "ai", "vercel-ai-sdk");
    expect(result?.integrations.ai).toBe("vercel-ai-sdk");
  });

  it("does not affect other integrations when switching one", () => {
    const preset = basePreset();
    const result = applySwitch(preset, "analytics", "posthog");
    expect(result?.integrations.errorTracking).toBe(preset.integrations.errorTracking);
    expect(result?.integrations.email).toBe(preset.integrations.email);
  });
});

describe("applySwitch — unknown category", () => {
  it("returns null for an unknown category", () => {
    expect(applySwitch(basePreset(), "unknown", "x")).toBeNull();
    expect(applySwitch(basePreset(), "css", "tailwind4")).toBeNull();
  });
});
