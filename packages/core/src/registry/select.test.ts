import { describe, expect, it } from "vitest";
import { makePreset, WEB_APP } from "../preset-factory.js";
import { selectRegistryItems } from "./select.js";

/**
 * Spread a realistic baseline preset for tests — `makePreset()` returns a
 * bare scaffold (no apps, envValidation: "none") which is too empty to
 * exercise the selector. The realistic shape: one Next.js app + t3-env.
 */
function basePreset(overrides: Parameters<typeof makePreset>[0] = {}) {
  return makePreset({
    apps: [WEB_APP],
    integrations: {
      analytics: "none",
      errorTracking: "none",
      email: "none",
      rateLimit: "none",
      ai: "none",
      cache: "none",
      envValidation: "t3-env",
    },
    ...overrides,
  });
}

describe("selectRegistryItems — baseline preset", () => {
  it("emits typescript-config, env, and the app", () => {
    const requests = selectRegistryItems(basePreset());
    const slots = requests.map((r) => r.slot);
    expect(slots).toContain("typescript-config");
    expect(slots).toContain("env");
    expect(slots).toContain("app");
  });

  it("emits NOTHING beyond typescript-config when everything is 'none' and apps is empty", () => {
    // The truly-bare `makePreset()` — useful as a regression: turning every
    // integration off should NOT keep emitting requests.
    const requests = selectRegistryItems(makePreset());
    expect(requests.map((r) => r.slot)).toEqual(["typescript-config"]);
  });

  it("variant ids match the preset's enum values literally", () => {
    const requests = selectRegistryItems(basePreset());
    const appReq = requests.find((r) => r.slot === "app");
    expect(appReq?.variant).toBe("nextjs");
    expect(appReq?.pkgName).toBe("web"); // app name, not slot name
  });
});

describe("selectRegistryItems — db variant computation", () => {
  it("encodes ORM × driver as `<strategy>-<driver>`", () => {
    const requests = selectRegistryItems(
      basePreset({ database: { strategy: "drizzle", driver: "postgres" } }),
    );
    const db = requests.find((r) => r.slot === "db");
    expect(db?.variant).toBe("drizzle-postgres");
  });

  it("supabase has no driver — variant is the bare strategy", () => {
    const requests = selectRegistryItems(basePreset({ database: { strategy: "supabase" } }));
    const db = requests.find((r) => r.slot === "db");
    expect(db?.variant).toBe("supabase");
  });

  it("omits the db slot when strategy is none", () => {
    const requests = selectRegistryItems(basePreset({ database: { strategy: "none" } }));
    expect(requests.find((r) => r.slot === "db")).toBeUndefined();
  });
});

describe("selectRegistryItems — api variant computation", () => {
  it("trpc → bare strategy", () => {
    const requests = selectRegistryItems(basePreset({ api: { strategy: "trpc" } }));
    const api = requests.find((r) => r.slot === "api");
    expect(api?.variant).toBe("trpc");
  });

  it("hono standalone → no api package (the Hono app IS the server)", () => {
    const requests = selectRegistryItems(
      basePreset({ api: { strategy: "hono", mode: "standalone-app" } }),
    );
    // standalone-app is served by `slot: app` (variant hono-standalone), so
    // there is no separate `slot: api` package.
    expect(requests.find((r) => r.slot === "api")).toBeUndefined();
  });

  it("hono route handler → hono-route variant", () => {
    const requests = selectRegistryItems(
      basePreset({ api: { strategy: "hono", mode: "route-handler" } }),
    );
    const api = requests.find((r) => r.slot === "api");
    expect(api?.variant).toBe("hono-route");
  });
});

describe("selectRegistryItems — optional integrations", () => {
  it("emits items only for the categories that are not 'none'", () => {
    const requests = selectRegistryItems(
      basePreset({
        integrations: {
          analytics: "posthog",
          errorTracking: "sentry",
          email: "none",
          rateLimit: "none",
          ai: "none",
          cache: "upstash",
          envValidation: "t3-env",
        },
      }),
    );
    const integrationSlots = requests
      .map((r) => r.slot)
      .filter((s) => ["analytics", "monitoring", "email", "rate-limit", "ai", "cache"].includes(s));
    expect(integrationSlots).toEqual(["monitoring", "analytics", "cache"]);
  });

  it("errorTracking enum key maps to slot id `monitoring`", () => {
    const requests = selectRegistryItems(
      basePreset({
        integrations: {
          ...makePreset().integrations,
          errorTracking: "sentry",
        },
      }),
    );
    const monitoring = requests.find((r) => r.slot === "monitoring");
    expect(monitoring?.variant).toBe("sentry");
  });

  it("rateLimit enum key maps to slot id `rate-limit`", () => {
    const requests = selectRegistryItems(
      basePreset({
        integrations: {
          ...makePreset().integrations,
          rateLimit: "upstash",
        },
      }),
    );
    const rl = requests.find((r) => r.slot === "rate-limit");
    expect(rl?.variant).toBe("upstash");
  });
});

describe("selectRegistryItems — ui slot is opt-in", () => {
  it("emits ui when at least one user package has producesCSS: true", () => {
    const requests = selectRegistryItems(
      basePreset({
        packages: [
          {
            name: "ui",
            type: "react-library",
            location: "packages",
            producesCSS: true,
            exports: ["."],
          },
        ],
      }),
    );
    expect(requests.find((r) => r.slot === "ui")).toBeDefined();
  });

  it("does not emit ui when no user package produces CSS", () => {
    const requests = selectRegistryItems(basePreset());
    expect(requests.find((r) => r.slot === "ui")).toBeUndefined();
  });
});

describe("selectRegistryItems — order invariant", () => {
  it("typescript-config comes before env, env before everything else", () => {
    const requests = selectRegistryItems(basePreset());
    const tsIdx = requests.findIndex((r) => r.slot === "typescript-config");
    const envIdx = requests.findIndex((r) => r.slot === "env");
    const appIdx = requests.findIndex((r) => r.slot === "app");
    expect(tsIdx).toBeLessThan(envIdx);
    expect(envIdx).toBeLessThan(appIdx);
  });
});
