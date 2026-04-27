import { describe, expect, it } from "vitest";
import { computeCatalog } from "../../src/wiring/catalog";
import { VERSIONS } from "../../src/wiring/versions";
import { makeFullPreset, makePreset } from "../preset-factory";

// Helpers

function names(preset: Parameters<typeof computeCatalog>[0]): string[] {
  return computeCatalog(preset).map((e) => e.name);
}

function entry(preset: Parameters<typeof computeCatalog>[0], name: string) {
  return computeCatalog(preset).find((e) => e.name === name);
}

// Always-present

describe("computeCatalog — always present", () => {
  it("includes typescript for every preset", () => {
    expect(names(makePreset())).toContain("typescript");
  });

  it("typescript version matches VERSIONS.typescript", () => {
    expect(entry(makePreset(), "typescript")?.version).toBe(VERSIONS.typescript);
  });
});

describe("computeCatalog — linter", () => {
  it("biome linter → @biomejs/biome present", () => {
    const p = makePreset({
      basics: { ...makePreset().basics, linter: "biome" },
    });
    expect(names(p)).toContain("@biomejs/biome");
  });

  it("biome linter → eslint and prettier absent", () => {
    const p = makePreset({
      basics: { ...makePreset().basics, linter: "biome" },
    });
    expect(names(p)).not.toContain("eslint");
    expect(names(p)).not.toContain("prettier");
  });

  it("eslint-prettier linter → eslint + prettier present", () => {
    const p = makePreset({
      basics: { ...makePreset().basics, linter: "eslint-prettier" },
    });
    const n = names(p);
    expect(n).toContain("eslint");
    expect(n).toContain("prettier");
  });

  it("eslint-prettier linter → @biomejs/biome absent", () => {
    const p = makePreset({
      basics: { ...makePreset().basics, linter: "eslint-prettier" },
    });
    expect(names(p)).not.toContain("@biomejs/biome");
  });
});

describe("computeCatalog — CSS", () => {
  it("tailwind4 → tailwindcss + @tailwindcss/postcss", () => {
    const p = makePreset({
      css: { framework: "tailwind4", ui: "none", styling: "css-variables" },
    });
    const n = names(p);
    expect(n).toContain("tailwindcss");
    expect(n).toContain("@tailwindcss/postcss");
    expect(n).not.toContain("postcss");
    expect(n).not.toContain("autoprefixer");
  });

  it("tailwind3 → tailwindcss + postcss + autoprefixer", () => {
    const p = makePreset({
      css: { framework: "tailwind3", ui: "none", styling: "css-variables" },
    });
    const n = names(p);
    expect(n).toContain("tailwindcss");
    expect(n).toContain("postcss");
    expect(n).toContain("autoprefixer");
    expect(n).not.toContain("@tailwindcss/postcss");
  });

  it("shadcn ui → tw-animate-css added", () => {
    const p = makePreset({
      css: { framework: "tailwind4", ui: "shadcn", styling: "css-variables" },
    });
    expect(names(p)).toContain("tw-animate-css");
  });

  it("ui: none → tw-animate-css absent", () => {
    const p = makePreset({
      css: { framework: "tailwind4", ui: "none", styling: "css-variables" },
    });
    expect(names(p)).not.toContain("tw-animate-css");
  });

  it("vanilla framework → no tailwind deps", () => {
    const p = makePreset({
      css: { framework: "vanilla", ui: "none", styling: "css-variables" },
    });
    const n = names(p);
    expect(n).not.toContain("tailwindcss");
    expect(n).not.toContain("postcss");
  });
});

describe("computeCatalog — apps", () => {
  it("nextjs app → next, react, react-dom, @types/react, @types/react-dom", () => {
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
    const n = names(p);
    expect(n).toContain("next");
    expect(n).toContain("react");
    expect(n).toContain("react-dom");
    expect(n).toContain("@types/react");
    expect(n).toContain("@types/react-dom");
  });

  it("nextjs-api-only app → same react deps added", () => {
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
    expect(names(p)).toContain("next");
  });

  it("hono-standalone app → hono, @hono/node-server, tsx", () => {
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
    const n = names(p);
    expect(n).toContain("hono");
    expect(n).toContain("@hono/node-server");
    expect(n).toContain("tsx");
  });

  it("i18n: true → next-intl added", () => {
    const p = makePreset({
      apps: [
        {
          name: "web",
          type: "nextjs",
          port: 3000,
          i18n: true,
          cms: "none",
          consumes: [],
        },
      ],
    });
    expect(names(p)).toContain("next-intl");
  });

  it("i18n: false → next-intl absent", () => {
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
    expect(names(p)).not.toContain("next-intl");
  });
});

describe("computeCatalog — database", () => {
  it("supabase → @supabase/supabase-js + @supabase/ssr", () => {
    const p = makePreset({ database: { strategy: "supabase" } });
    const n = names(p);
    expect(n).toContain("@supabase/supabase-js");
    expect(n).toContain("@supabase/ssr");
  });

  it("drizzle + postgres driver → drizzle-orm + drizzle-kit + postgres", () => {
    const p = makePreset({
      database: { strategy: "drizzle", driver: "postgres" },
    });
    const n = names(p);
    expect(n).toContain("drizzle-orm");
    expect(n).toContain("drizzle-kit");
    expect(n).toContain("postgres");
  });

  it("drizzle + mysql driver → mysql2", () => {
    const p = makePreset({
      database: { strategy: "drizzle", driver: "mysql" },
    });
    expect(names(p)).toContain("mysql2");
  });

  it("drizzle + sqlite driver → better-sqlite3", () => {
    const p = makePreset({
      database: { strategy: "drizzle", driver: "sqlite" },
    });
    expect(names(p)).toContain("better-sqlite3");
  });

  it("drizzle + turso driver → @libsql/client", () => {
    const p = makePreset({
      database: { strategy: "drizzle", driver: "turso" },
    });
    expect(names(p)).toContain("@libsql/client");
  });

  it("drizzle + neon driver → @neondatabase/serverless", () => {
    const p = makePreset({ database: { strategy: "drizzle", driver: "neon" } });
    expect(names(p)).toContain("@neondatabase/serverless");
  });

  it("drizzle + planetscale driver → @planetscale/database", () => {
    const p = makePreset({
      database: { strategy: "drizzle", driver: "planetscale" },
    });
    expect(names(p)).toContain("@planetscale/database");
  });

  it("prisma → prisma + @prisma/client", () => {
    const p = makePreset({ database: { strategy: "prisma" } });
    const n = names(p);
    expect(n).toContain("prisma");
    expect(n).toContain("@prisma/client");
  });

  it("database: none → no db deps", () => {
    const p = makePreset({ database: { strategy: "none" } });
    const n = names(p);
    expect(n).not.toContain("drizzle-orm");
    expect(n).not.toContain("prisma");
    expect(n).not.toContain("@supabase/supabase-js");
  });
});

describe("computeCatalog — api", () => {
  it("trpc → @trpc/server, @trpc/client, superjson, zod", () => {
    const p = makePreset({ api: { strategy: "trpc", version: "v11" } });
    const n = names(p);
    expect(n).toContain("@trpc/server");
    expect(n).toContain("@trpc/client");
    expect(n).toContain("superjson");
    expect(n).toContain("zod");
  });

  it("trpc → @trpc/react-query + @tanstack/react-query", () => {
    const p = makePreset({ api: { strategy: "trpc", version: "v11" } });
    const n = names(p);
    expect(n).toContain("@trpc/react-query");
    expect(n).toContain("@tanstack/react-query");
  });

  it("hono api → hono present", () => {
    const p = makePreset({ api: { strategy: "hono", mode: "standalone-app" } });
    expect(names(p)).toContain("hono");
  });

  it("api: none → no trpc deps", () => {
    const p = makePreset({ api: { strategy: "none" } });
    expect(names(p)).not.toContain("@trpc/server");
  });
});

describe("computeCatalog — auth", () => {
  it("clerk → @clerk/nextjs", () => {
    const p = makePreset({
      auth: { provider: "clerk", rbac: false, entitlements: false },
    });
    expect(names(p)).toContain("@clerk/nextjs");
  });

  it("better-auth → better-auth", () => {
    const p = makePreset({
      auth: { provider: "better-auth", rbac: false, entitlements: false },
    });
    expect(names(p)).toContain("better-auth");
  });

  it("next-auth → next-auth", () => {
    const p = makePreset({
      auth: { provider: "next-auth", rbac: false, entitlements: false },
    });
    expect(names(p)).toContain("next-auth");
  });

  it("auth: none → no auth deps", () => {
    const p = makePreset({
      auth: { provider: "none", rbac: false, entitlements: false },
    });
    const n = names(p);
    expect(n).not.toContain("@clerk/nextjs");
    expect(n).not.toContain("better-auth");
    expect(n).not.toContain("next-auth");
  });
});

describe("computeCatalog — integrations", () => {
  it("envValidation: true → @t3-oss/env-nextjs + zod", () => {
    const p = makePreset({
      integrations: { ...makePreset().integrations, envValidation: true },
    });
    const n = names(p);
    expect(n).toContain("@t3-oss/env-nextjs");
    expect(n).toContain("zod");
  });

  it("analytics: posthog → posthog-js + posthog-node", () => {
    const p = makePreset({
      integrations: { ...makePreset().integrations, analytics: "posthog" },
    });
    const n = names(p);
    expect(n).toContain("posthog-js");
    expect(n).toContain("posthog-node");
  });

  it("analytics: vercel-analytics → @vercel/analytics", () => {
    const p = makePreset({
      integrations: {
        ...makePreset().integrations,
        analytics: "vercel-analytics",
      },
    });
    expect(names(p)).toContain("@vercel/analytics");
  });

  it("errorTracking: sentry → @sentry/nextjs", () => {
    const p = makePreset({
      integrations: { ...makePreset().integrations, errorTracking: "sentry" },
    });
    expect(names(p)).toContain("@sentry/nextjs");
  });

  it("email: react-email-resend → resend + @react-email/components", () => {
    const p = makePreset({
      integrations: {
        ...makePreset().integrations,
        email: "react-email-resend",
      },
    });
    const n = names(p);
    expect(n).toContain("resend");
    expect(n).toContain("@react-email/components");
  });

  it("email: nodemailer → nodemailer", () => {
    const p = makePreset({
      integrations: { ...makePreset().integrations, email: "nodemailer" },
    });
    expect(names(p)).toContain("nodemailer");
  });

  it("rateLimit: upstash → @upstash/ratelimit + @upstash/redis", () => {
    const p = makePreset({
      integrations: { ...makePreset().integrations, rateLimit: "upstash" },
    });
    const n = names(p);
    expect(n).toContain("@upstash/ratelimit");
    expect(n).toContain("@upstash/redis");
  });

  it("ai: vercel-ai-sdk → ai + @ai-sdk/openai", () => {
    const p = makePreset({
      integrations: { ...makePreset().integrations, ai: "vercel-ai-sdk" },
    });
    const n = names(p);
    expect(n).toContain("ai");
    expect(n).toContain("@ai-sdk/openai");
  });
});

// Deduplication

describe("computeCatalog — deduplication", () => {
  it("trpc + envValidation both need zod — no duplicate", () => {
    const p = makePreset({
      api: { strategy: "trpc", version: "v11" },
      integrations: { ...makePreset().integrations, envValidation: true },
    });
    const zodEntries = computeCatalog(p).filter((e) => e.name === "zod");
    expect(zodEntries).toHaveLength(1);
  });

  it("hono app + hono api — hono appears once", () => {
    const p = makePreset({
      api: { strategy: "hono", mode: "standalone-app" },
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
    const honoEntries = computeCatalog(p).filter((e) => e.name === "hono");
    expect(honoEntries).toHaveLength(1);
  });

  it("full preset — no duplicate entries", () => {
    const entries = computeCatalog(makeFullPreset());
    const nameSet = new Set(entries.map((e) => e.name));
    expect(entries.length).toBe(nameSet.size);
  });

  it("full preset — all expected deps present", () => {
    const n = names(makeFullPreset());
    expect(n).toContain("next");
    expect(n).toContain("@trpc/server");
    expect(n).toContain("drizzle-orm");
    expect(n).toContain("@clerk/nextjs");
    expect(n).toContain("tailwindcss");
    expect(n).toContain("tw-animate-css");
    expect(n).toContain("posthog-js");
    expect(n).toContain("@sentry/nextjs");
    expect(n).toContain("resend");
    expect(n).toContain("@upstash/ratelimit");
    expect(n).toContain("ai");
    expect(n).toContain("@t3-oss/env-nextjs");
    expect(n).toContain("next-intl");
  });
});

describe("computeCatalog — return shape", () => {
  it("returns CatalogEntry[] with name and version on every entry", () => {
    const entries = computeCatalog(makeFullPreset());
    for (const e of entries) {
      expect(typeof e.name).toBe("string");
      expect(e.name.length).toBeGreaterThan(0);
      expect(typeof e.version).toBe("string");
      expect(e.version.length).toBeGreaterThan(0);
    }
  });

  it("minimal preset returns non-empty array", () => {
    expect(computeCatalog(makePreset()).length).toBeGreaterThan(0);
  });
});
