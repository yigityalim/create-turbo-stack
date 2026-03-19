import { describe, expect, it } from "vitest";
import { resolveAutoPackages } from "../../src/resolve/auto-packages";
import { makeFullPreset, makePreset } from "../preset-factory";

function names(preset: Parameters<typeof resolveAutoPackages>[0]) {
  return resolveAutoPackages(preset).map((p) => p.name);
}

describe("resolveAutoPackages — always present", () => {
  it("always includes typescript-config", () => {
    expect(names(makePreset())).toContain("typescript-config");
  });

  it("typescript-config has type: config", () => {
    const pkg = resolveAutoPackages(makePreset()).find((p) => p.name === "typescript-config");
    expect(pkg?.type).toBe("config");
  });
});

describe("resolveAutoPackages — envValidation", () => {
  it("envValidation: true → includes env", () => {
    const p = makePreset({
      integrations: { ...makePreset().integrations, envValidation: true },
    });
    expect(names(p)).toContain("env");
  });

  it("envValidation: false → env absent", () => {
    expect(names(makePreset())).not.toContain("env");
  });
});

describe("resolveAutoPackages — database", () => {
  it("database !== none → includes db", () => {
    expect(names(makePreset({ database: { strategy: "drizzle", driver: "postgres" } }))).toContain(
      "db",
    );
  });

  it("database: none → db absent", () => {
    expect(names(makePreset())).not.toContain("db");
  });
});

describe("resolveAutoPackages — api", () => {
  it("api !== none → includes api", () => {
    expect(names(makePreset({ api: { strategy: "trpc", version: "v11" } }))).toContain("api");
  });

  it("trpc api → exports include ., ./server, ./client", () => {
    const p = makePreset({ api: { strategy: "trpc", version: "v11" } });
    const pkg = resolveAutoPackages(p).find((pkg) => pkg.name === "api");
    expect(pkg?.exports).toContain(".");
    expect(pkg?.exports).toContain("./server");
    expect(pkg?.exports).toContain("./client");
  });

  it("hono api → exports is just [.]", () => {
    const p = makePreset({ api: { strategy: "hono", mode: "standalone-app" } });
    const pkg = resolveAutoPackages(p).find((pkg) => pkg.name === "api");
    expect(pkg?.exports).toEqual(["."]);
  });

  it("api: none → api absent", () => {
    expect(names(makePreset())).not.toContain("api");
  });
});

describe("resolveAutoPackages — auth", () => {
  it("auth !== none → includes auth", () => {
    expect(
      names(
        makePreset({
          auth: { provider: "clerk", rbac: false, entitlements: false },
        }),
      ),
    ).toContain("auth");
  });

  it("auth exports: ., ./server, ./client, ./middleware", () => {
    const p = makePreset({
      auth: { provider: "clerk", rbac: false, entitlements: false },
    });
    const pkg = resolveAutoPackages(p).find((pkg) => pkg.name === "auth");
    expect(pkg?.exports).toContain("./middleware");
  });

  it("auth: none → auth absent", () => {
    expect(names(makePreset())).not.toContain("auth");
  });
});

describe("resolveAutoPackages — integrations", () => {
  it("analytics !== none → includes analytics", () => {
    const p = makePreset({
      integrations: { ...makePreset().integrations, analytics: "posthog" },
    });
    expect(names(p)).toContain("analytics");
  });

  it("analytics: none → analytics absent", () => {
    expect(names(makePreset())).not.toContain("analytics");
  });

  it("errorTracking: sentry → includes monitoring", () => {
    const p = makePreset({
      integrations: { ...makePreset().integrations, errorTracking: "sentry" },
    });
    expect(names(p)).toContain("monitoring");
  });

  it("errorTracking: none → monitoring absent", () => {
    expect(names(makePreset())).not.toContain("monitoring");
  });

  it("email !== none → includes email", () => {
    const p = makePreset({
      integrations: {
        ...makePreset().integrations,
        email: "react-email-resend",
      },
    });
    expect(names(p)).toContain("email");
  });

  it("email: none → email absent", () => {
    expect(names(makePreset())).not.toContain("email");
  });

  it("rateLimit: upstash → includes rate-limit", () => {
    const p = makePreset({
      integrations: { ...makePreset().integrations, rateLimit: "upstash" },
    });
    expect(names(p)).toContain("rate-limit");
  });

  it("rateLimit: none → rate-limit absent", () => {
    expect(names(makePreset())).not.toContain("rate-limit");
  });

  it("ai !== none → includes ai", () => {
    const p = makePreset({
      integrations: { ...makePreset().integrations, ai: "vercel-ai-sdk" },
    });
    expect(names(p)).toContain("ai");
  });

  it("ai: none → ai absent", () => {
    expect(names(makePreset())).not.toContain("ai");
  });
});

describe("resolveAutoPackages — full preset", () => {
  it("full preset → all auto packages present", () => {
    const n = names(makeFullPreset());
    const expected = [
      "typescript-config",
      "env",
      "db",
      "api",
      "auth",
      "analytics",
      "monitoring",
      "email",
      "rate-limit",
      "ai",
    ];
    for (const name of expected) {
      expect(n, `expected ${name}`).toContain(name);
    }
  });

  it("all auto packages have producesCSS: false", () => {
    for (const pkg of resolveAutoPackages(makeFullPreset())) {
      expect(pkg.producesCSS).toBe(false);
    }
  });
});
