import { describe, expect, it } from "vitest";
import { computeEnvChain } from "../../src/wiring/env-chain";
import { makePreset } from "../preset-factory";

function serverNames(preset: Parameters<typeof computeEnvChain>[0]) {
  return computeEnvChain(preset).base.server.map((v) => v.name);
}

function clientNames(preset: Parameters<typeof computeEnvChain>[0]) {
  return computeEnvChain(preset).base.client.map((v) => v.name);
}

// database: none

describe("computeEnvChain — database: none", () => {
  it("base.server and base.client are empty for bare preset", () => {
    const r = computeEnvChain(makePreset({ apps: [], packages: [] }));
    expect(r.base.server).toHaveLength(0);
    expect(r.base.client).toHaveLength(0);
  });
});

// database: supabase

describe("computeEnvChain — database: supabase", () => {
  const p = makePreset({ database: { strategy: "supabase" } });

  it("server has SUPABASE_URL", () => {
    expect(serverNames(p)).toContain("SUPABASE_URL");
  });

  it("server has SUPABASE_ANON_KEY", () => {
    expect(serverNames(p)).toContain("SUPABASE_ANON_KEY");
  });

  it("server has SUPABASE_SERVICE_ROLE_KEY", () => {
    expect(serverNames(p)).toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("client has NEXT_PUBLIC_SUPABASE_URL", () => {
    expect(clientNames(p)).toContain("NEXT_PUBLIC_SUPABASE_URL");
  });

  it("client has NEXT_PUBLIC_SUPABASE_ANON_KEY", () => {
    expect(clientNames(p)).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  });
});

// database: drizzle / prisma

describe("computeEnvChain — database: drizzle", () => {
  it("server has DATABASE_URL", () => {
    expect(
      serverNames(makePreset({ database: { strategy: "drizzle", driver: "postgres" } })),
    ).toContain("DATABASE_URL");
  });
});

describe("computeEnvChain — database: prisma", () => {
  it("server has DATABASE_URL", () => {
    expect(serverNames(makePreset({ database: { strategy: "prisma" } }))).toContain("DATABASE_URL");
  });
});

describe("computeEnvChain — auth: clerk", () => {
  const p = makePreset({
    auth: { provider: "clerk", rbac: false, entitlements: false },
  });

  it("server has CLERK_SECRET_KEY", () => {
    expect(serverNames(p)).toContain("CLERK_SECRET_KEY");
  });

  it("client has NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", () => {
    expect(clientNames(p)).toContain("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
  });
});

describe("computeEnvChain — integrations: sentry", () => {
  it("server has SENTRY_DSN", () => {
    const p = makePreset({
      integrations: { ...makePreset().integrations, errorTracking: "sentry" },
    });
    expect(serverNames(p)).toContain("SENTRY_DSN");
  });
});

describe("computeEnvChain — integrations: posthog", () => {
  const p = makePreset({
    integrations: { ...makePreset().integrations, analytics: "posthog" },
  });

  it("client has NEXT_PUBLIC_POSTHOG_KEY", () => {
    expect(clientNames(p)).toContain("NEXT_PUBLIC_POSTHOG_KEY");
  });

  it("client has NEXT_PUBLIC_POSTHOG_HOST", () => {
    expect(clientNames(p)).toContain("NEXT_PUBLIC_POSTHOG_HOST");
  });
});

describe("computeEnvChain — integrations: react-email-resend", () => {
  const p = makePreset({
    integrations: { ...makePreset().integrations, email: "react-email-resend" },
  });

  it("server has RESEND_API_KEY", () => {
    expect(serverNames(p)).toContain("RESEND_API_KEY");
  });

  it("server has EMAIL_FROM", () => {
    expect(serverNames(p)).toContain("EMAIL_FROM");
  });
});

describe("computeEnvChain — integrations: nodemailer", () => {
  const p = makePreset({
    integrations: { ...makePreset().integrations, email: "nodemailer" },
  });

  it("server has SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS", () => {
    const s = serverNames(p);
    expect(s).toContain("SMTP_HOST");
    expect(s).toContain("SMTP_PORT");
    expect(s).toContain("SMTP_USER");
    expect(s).toContain("SMTP_PASS");
  });
});

describe("computeEnvChain — integrations: upstash", () => {
  const p = makePreset({
    integrations: { ...makePreset().integrations, rateLimit: "upstash" },
  });

  it("server has UPSTASH_REDIS_REST_URL", () => {
    expect(serverNames(p)).toContain("UPSTASH_REDIS_REST_URL");
  });

  it("server has UPSTASH_REDIS_REST_TOKEN", () => {
    expect(serverNames(p)).toContain("UPSTASH_REDIS_REST_TOKEN");
  });
});

describe("computeEnvChain — integrations: vercel-ai-sdk", () => {
  it("server has OPENAI_API_KEY", () => {
    const p = makePreset({
      integrations: { ...makePreset().integrations, ai: "vercel-ai-sdk" },
    });
    expect(serverNames(p)).toContain("OPENAI_API_KEY");
  });
});

describe("computeEnvChain — per-app env", () => {
  it("nextjs app gets NEXT_PUBLIC_APP_URL in client vars", () => {
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
    const r = computeEnvChain(p);
    expect(r.apps.web?.client.map((v) => v.name)).toContain("NEXT_PUBLIC_APP_URL");
  });

  it("NEXT_PUBLIC_APP_URL example contains the app's port", () => {
    const p = makePreset({
      apps: [
        {
          name: "web",
          type: "nextjs",
          port: 4200,
          i18n: false,
          cms: "none",
          consumes: [],
        },
      ],
    });
    const r = computeEnvChain(p);
    const appUrl = r.apps.web?.client.find((v) => v.name === "NEXT_PUBLIC_APP_URL");
    expect(appUrl?.example).toContain("4200");
  });

  it("nextjs-api-only app also gets NEXT_PUBLIC_APP_URL", () => {
    const p = makePreset({
      apps: [
        {
          name: "api",
          type: "nextjs-api-only",
          port: 3001,
          i18n: false,
          cms: "none",
          consumes: [],
        },
      ],
    });
    const r = computeEnvChain(p);
    expect(r.apps.api?.client.map((v) => v.name)).toContain("NEXT_PUBLIC_APP_URL");
  });

  it("non-nextjs app (hono) has empty per-app env", () => {
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
    const r = computeEnvChain(p);
    expect(r.apps.server?.server).toHaveLength(0);
    expect(r.apps.server?.client).toHaveLength(0);
  });
});

// globalEnv + allVars

describe("computeEnvChain — globalEnv + allVars", () => {
  it("globalEnv contains all var names", () => {
    const p = makePreset({
      database: { strategy: "supabase" },
      integrations: { ...makePreset().integrations, errorTracking: "sentry" },
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
    const r = computeEnvChain(p);
    expect(r.globalEnv).toContain("SUPABASE_URL");
    expect(r.globalEnv).toContain("SENTRY_DSN");
    expect(r.globalEnv).toContain("NEXT_PUBLIC_APP_URL");
  });

  it("allVars length === globalEnv length", () => {
    const p = makePreset({
      database: { strategy: "drizzle", driver: "postgres" },
      auth: { provider: "clerk", rbac: false, entitlements: false },
      integrations: {
        ...makePreset().integrations,
        rateLimit: "upstash",
        ai: "vercel-ai-sdk",
      },
    });
    const r = computeEnvChain(p);
    expect(r.allVars.length).toBe(r.globalEnv.length);
  });

  it("allVars have all required fields", () => {
    const p = makePreset({
      database: { strategy: "drizzle", driver: "postgres" },
    });
    const r = computeEnvChain(p);
    for (const v of r.allVars) {
      expect(v.name.length).toBeGreaterThan(0);
      expect(v.zodType.length).toBeGreaterThan(0);
      expect(v.example.length).toBeGreaterThan(0);
      expect(v.description.length).toBeGreaterThan(0);
    }
  });

  it("bare preset → allVars is empty", () => {
    expect(computeEnvChain(makePreset({ apps: [], packages: [] })).allVars).toHaveLength(0);
  });

  it("bare preset → globalEnv is empty", () => {
    expect(computeEnvChain(makePreset({ apps: [], packages: [] })).globalEnv).toHaveLength(0);
  });
});
