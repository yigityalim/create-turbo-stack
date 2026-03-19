import type { Preset } from "@create-turbo-stack/schema";
import { describe, expect, it } from "vitest";
import apiOnlyJson from "../../../../presets/api-only.json";
import minimalJson from "../../../../presets/minimal.json";
import saasJson from "../../../../presets/saas-starter.json";
import { resolveFileTree } from "./file-tree";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

/** Find a node by exact path. */
function findNode(nodes: ReturnType<typeof resolveFileTree>["nodes"], path: string) {
  return nodes.find((n) => n.path === path);
}

/** Parse content of a JSON node. Throws if missing or unparseable. */
function parseJson<T = unknown>(
  nodes: ReturnType<typeof resolveFileTree>["nodes"],
  path: string,
): T {
  const node = findNode(nodes, path);
  if (!node?.content) throw new Error(`Node not found or has no content: ${path}`);
  return JSON.parse(node.content) as T;
}

// ---------------------------------------------------------------------------
// minimal preset — file existence
// ---------------------------------------------------------------------------

describe("resolveFileTree — minimal preset", () => {
  it("produces expected root config files", () => {
    const { nodes } = resolveFileTree(clone(minimalJson) as Preset);
    const paths = nodes.map((n) => n.path);

    expect(paths).toContain("package.json");
    expect(paths).toContain("turbo.json");
    expect(paths).toContain(".gitignore");
    expect(paths).toContain(".npmrc");
    expect(paths).toContain("biome.json"); // minimal uses biome linter
  });

  it("produces typescript-config package files", () => {
    const { nodes } = resolveFileTree(clone(minimalJson) as Preset);
    const paths = nodes.map((n) => n.path);

    // typescript-config is always auto-generated
    expect(paths.some((p) => p.startsWith("packages/typescript-config/"))).toBe(true);
  });

  it("produces ui package files", () => {
    const { nodes } = resolveFileTree(clone(minimalJson) as Preset);
    const paths = nodes.map((n) => n.path);

    expect(paths.some((p) => p.startsWith("packages/ui/"))).toBe(true);
  });

  it("produces web app files", () => {
    const { nodes } = resolveFileTree(clone(minimalJson) as Preset);
    const paths = nodes.map((n) => n.path);

    expect(paths.some((p) => p.startsWith("apps/web/"))).toBe(true);
  });

  // -------------------------------------------------------------------------
  // package.json catalog
  // -------------------------------------------------------------------------

  it("root package.json contains a catalog with typescript", () => {
    const { nodes } = resolveFileTree(clone(minimalJson) as Preset);
    const pkg = parseJson<Record<string, unknown>>(nodes, "package.json");

    expect(pkg).toHaveProperty("catalog");
    const catalog = pkg.catalog as Record<string, string>;
    expect(catalog).toHaveProperty("typescript");
    expect(catalog.typescript).toMatch(/^\^5/);
  });

  it("root package.json catalog includes tailwindcss for tailwind4 preset", () => {
    const { nodes } = resolveFileTree(clone(minimalJson) as Preset);
    const pkg = parseJson<{ catalog: Record<string, string> }>(nodes, "package.json");

    expect(pkg.catalog).toHaveProperty("tailwindcss");
    expect(pkg.catalog.tailwindcss).toMatch(/^\^4/);
  });

  it("root package.json sets workspaces to apps/* and packages/*", () => {
    const { nodes } = resolveFileTree(clone(minimalJson) as Preset);
    const pkg = parseJson<{ workspaces: string[] }>(nodes, "package.json");

    expect(pkg.workspaces).toContain("apps/*");
    expect(pkg.workspaces).toContain("packages/*");
  });

  // -------------------------------------------------------------------------
  // globals.css @source directives
  // -------------------------------------------------------------------------

  it("web app globals.css contains @source directive for consumed package", () => {
    const { nodes } = resolveFileTree(clone(minimalJson) as Preset);

    // globals.css may live at different sub-paths depending on template;
    // find whichever node under apps/web/ contains @source
    const cssNode = nodes.find(
      (n) => n.path.startsWith("apps/web/") && n.content?.includes("@source"),
    );

    expect(cssNode).toBeDefined();
    expect(cssNode!.content).toContain("@source");
    expect(cssNode!.content).toContain("../../packages/ui/src");
  });
});

// ---------------------------------------------------------------------------
// saas-starter preset — auto-generated packages
// ---------------------------------------------------------------------------

describe("resolveFileTree — saas-starter preset", () => {
  it("auto-generates db package (supabase strategy)", () => {
    const { nodes } = resolveFileTree(clone(saasJson) as Preset);
    const paths = nodes.map((n) => n.path);

    expect(paths.some((p) => p.startsWith("packages/db/"))).toBe(true);
  });

  it("auto-generates api package (trpc strategy)", () => {
    const { nodes } = resolveFileTree(clone(saasJson) as Preset);
    const paths = nodes.map((n) => n.path);

    expect(paths.some((p) => p.startsWith("packages/api/"))).toBe(true);
  });

  it("auto-generates auth package (supabase-auth provider)", () => {
    const { nodes } = resolveFileTree(clone(saasJson) as Preset);
    const paths = nodes.map((n) => n.path);

    expect(paths.some((p) => p.startsWith("packages/auth/"))).toBe(true);
  });

  it("auto-generates env package (envValidation: true)", () => {
    const { nodes } = resolveFileTree(clone(saasJson) as Preset);
    const paths = nodes.map((n) => n.path);

    expect(paths.some((p) => p.startsWith("packages/env/"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Preview mode (includeContent: false)
// ---------------------------------------------------------------------------

describe("resolveFileTree — preview mode", () => {
  it("all nodes have undefined content when includeContent is false", () => {
    const { nodes } = resolveFileTree(clone(minimalJson) as Preset, {
      includeContent: false,
    });

    const withContent = nodes.filter((n) => n.content !== undefined);
    expect(withContent).toHaveLength(0);
  });

  it("still produces the correct file paths in preview mode", () => {
    const { nodes } = resolveFileTree(clone(minimalJson) as Preset, {
      includeContent: false,
    });
    const paths = nodes.map((n) => n.path);

    expect(paths).toContain("package.json");
    expect(paths.some((p) => p.startsWith("apps/web/"))).toBe(true);
  });

  it("projectName is preserved in preview mode", () => {
    const tree = resolveFileTree(clone(minimalJson) as Preset, {
      includeContent: false,
    });

    expect(tree.projectName).toBe("my-project");
  });
});

// ---------------------------------------------------------------------------
// Phase 2 — Database scaffolding
// ---------------------------------------------------------------------------

describe("resolveFileTree — database scaffolding", () => {
  it("drizzle preset generates schema, client, and config files", () => {
    const { nodes } = resolveFileTree(clone(apiOnlyJson) as Preset);
    const paths = nodes.map((n) => n.path);

    expect(paths).toContain("packages/db/src/schema.ts");
    expect(paths).toContain("packages/db/src/client.ts");
    expect(paths).toContain("packages/db/src/index.ts");
    expect(paths).toContain("packages/db/drizzle.config.ts");
  });

  it("drizzle config uses correct dialect for postgres driver", () => {
    const { nodes } = resolveFileTree(clone(apiOnlyJson) as Preset);
    const configNode = nodes.find((n) => n.path === "packages/db/drizzle.config.ts");

    expect(configNode?.content).toContain('dialect: "postgresql"');
  });

  it("drizzle schema uses pgTable for postgres driver", () => {
    const { nodes } = resolveFileTree(clone(apiOnlyJson) as Preset);
    const schemaNode = nodes.find((n) => n.path === "packages/db/src/schema.ts");

    expect(schemaNode?.content).toContain("pgTable");
    expect(schemaNode?.content).toContain("drizzle-orm/pg-core");
  });

  it("drizzle client uses postgres driver", () => {
    const { nodes } = resolveFileTree(clone(apiOnlyJson) as Preset);
    const clientNode = nodes.find((n) => n.path === "packages/db/src/client.ts");

    expect(clientNode?.content).toContain("postgres");
    expect(clientNode?.content).toContain("drizzle-orm/postgres-js");
  });

  it("supabase preset generates server/client/types files", () => {
    const { nodes } = resolveFileTree(clone(saasJson) as Preset);
    const dbPaths = nodes.filter((n) => n.path.startsWith("packages/db/")).map((n) => n.path);

    expect(dbPaths).toContain("packages/db/src/index.ts");
    expect(dbPaths).toContain("packages/db/src/client.ts");
    expect(dbPaths).toContain("packages/db/src/server.ts");
    expect(dbPaths).toContain("packages/db/src/types.ts");
  });

  it("supabase db package has @supabase/ssr dependency", () => {
    const { nodes } = resolveFileTree(clone(saasJson) as Preset);
    const pkgNode = nodes.find((n) => n.path === "packages/db/package.json");
    const pkg = JSON.parse(pkgNode!.content!);

    expect(pkg.dependencies).toHaveProperty("@supabase/ssr");
  });

  it("prisma preset generates schema.prisma and client", () => {
    const preset = clone(minimalJson) as Preset;
    preset.database = { strategy: "prisma" };

    const { nodes } = resolveFileTree(preset);
    const dbPaths = nodes.filter((n) => n.path.startsWith("packages/db/")).map((n) => n.path);

    expect(dbPaths).toContain("packages/db/prisma/schema.prisma");
    expect(dbPaths).toContain("packages/db/src/client.ts");
    expect(dbPaths).toContain("packages/db/src/index.ts");
  });
});

// ---------------------------------------------------------------------------
// Phase 2 — API scaffolding
// ---------------------------------------------------------------------------

describe("resolveFileTree — API scaffolding", () => {
  it("trpc preset generates router, server, client files", () => {
    const { nodes } = resolveFileTree(clone(saasJson) as Preset);
    const apiPaths = nodes.filter((n) => n.path.startsWith("packages/api/")).map((n) => n.path);

    expect(apiPaths).toContain("packages/api/src/router.ts");
    expect(apiPaths).toContain("packages/api/src/server.ts");
    expect(apiPaths).toContain("packages/api/src/client.ts");
    expect(apiPaths).toContain("packages/api/src/index.ts");
  });

  it("trpc router imports db when database is set", () => {
    const { nodes } = resolveFileTree(clone(saasJson) as Preset);
    const routerNode = nodes.find((n) => n.path === "packages/api/src/router.ts");

    // saas-starter has database: supabase
    expect(routerNode?.content).toContain("@my-saas/db");
  });

  it("trpc server has initTRPC and superjson", () => {
    const { nodes } = resolveFileTree(clone(saasJson) as Preset);
    const serverNode = nodes.find((n) => n.path === "packages/api/src/server.ts");

    expect(serverNode?.content).toContain("initTRPC");
    expect(serverNode?.content).toContain("superjson");
  });

  it("hono preset generates app.ts with routes", () => {
    const { nodes } = resolveFileTree(clone(apiOnlyJson) as Preset);
    const apiPaths = nodes.filter((n) => n.path.startsWith("packages/api/")).map((n) => n.path);

    expect(apiPaths).toContain("packages/api/src/app.ts");
    expect(apiPaths).toContain("packages/api/src/index.ts");
  });

  it("hono app has health endpoint", () => {
    const { nodes } = resolveFileTree(clone(apiOnlyJson) as Preset);
    const appNode = nodes.find((n) => n.path === "packages/api/src/app.ts");

    expect(appNode?.content).toContain("/health");
    expect(appNode?.content).toContain("Hono");
  });

  it("rest-nextjs preset generates utils", () => {
    const preset = clone(minimalJson) as Preset;
    preset.api = { strategy: "rest-nextjs" };

    const { nodes } = resolveFileTree(preset);
    const apiPaths = nodes.filter((n) => n.path.startsWith("packages/api/")).map((n) => n.path);

    expect(apiPaths).toContain("packages/api/src/utils.ts");
    expect(apiPaths).toContain("packages/api/src/index.ts");
  });
});

// ---------------------------------------------------------------------------
// Phase 2 — Auth scaffolding
// ---------------------------------------------------------------------------

describe("resolveFileTree — auth scaffolding", () => {
  it("supabase-auth generates server/client/middleware", () => {
    const { nodes } = resolveFileTree(clone(saasJson) as Preset);
    const authPaths = nodes.filter((n) => n.path.startsWith("packages/auth/")).map((n) => n.path);

    expect(authPaths).toContain("packages/auth/src/server.ts");
    expect(authPaths).toContain("packages/auth/src/client.ts");
    expect(authPaths).toContain("packages/auth/src/middleware.ts");
    expect(authPaths).toContain("packages/auth/src/index.ts");
  });

  it("clerk auth exports @clerk/nextjs", () => {
    const preset = clone(minimalJson) as Preset;
    preset.auth = { provider: "clerk", rbac: false, entitlements: false };

    const { nodes } = resolveFileTree(preset);
    const indexNode = nodes.find((n) => n.path === "packages/auth/src/index.ts");

    expect(indexNode?.content).toContain("@clerk/nextjs");
  });

  it("better-auth generates server with betterAuth()", () => {
    const preset = clone(minimalJson) as Preset;
    preset.auth = { provider: "better-auth", rbac: false, entitlements: false };

    const { nodes } = resolveFileTree(preset);
    const serverNode = nodes.find((n) => n.path === "packages/auth/src/server.ts");

    expect(serverNode?.content).toContain("betterAuth");
  });

  it("lucia generates server with validateRequest", () => {
    const preset = clone(minimalJson) as Preset;
    preset.auth = { provider: "lucia", rbac: false, entitlements: false };

    const { nodes } = resolveFileTree(preset);
    const serverNode = nodes.find((n) => n.path === "packages/auth/src/server.ts");

    expect(serverNode?.content).toContain("Lucia");
    expect(serverNode?.content).toContain("validateRequest");
  });

  it("next-auth generates server with NextAuth()", () => {
    const preset = clone(minimalJson) as Preset;
    preset.auth = { provider: "next-auth", rbac: false, entitlements: false };

    const { nodes } = resolveFileTree(preset);
    const serverNode = nodes.find((n) => n.path === "packages/auth/src/server.ts");

    expect(serverNode?.content).toContain("NextAuth");
  });
});

// ---------------------------------------------------------------------------
// Phase 2 — Env package
// ---------------------------------------------------------------------------

describe("resolveFileTree — env package", () => {
  it("env package uses @t3-oss/env-nextjs", () => {
    const { nodes } = resolveFileTree(clone(saasJson) as Preset);
    const envIndex = nodes.find((n) => n.path === "packages/env/src/index.ts");

    expect(envIndex?.content).toContain("@t3-oss/env-nextjs");
    expect(envIndex?.content).toContain("createEnv");
  });

  it("env package includes supabase vars when supabase selected", () => {
    const { nodes } = resolveFileTree(clone(saasJson) as Preset);
    const envIndex = nodes.find((n) => n.path === "packages/env/src/index.ts");

    expect(envIndex?.content).toContain("SUPABASE_URL");
    expect(envIndex?.content).toContain("SUPABASE_ANON_KEY");
  });

  it("env package includes DATABASE_URL when drizzle selected", () => {
    const { nodes } = resolveFileTree(clone(apiOnlyJson) as Preset);
    const envIndex = nodes.find((n) => n.path === "packages/env/src/index.ts");

    expect(envIndex?.content).toContain("DATABASE_URL");
  });

  it("env package includes sentry DSN when sentry selected", () => {
    const { nodes } = resolveFileTree(clone(apiOnlyJson) as Preset);
    const envIndex = nodes.find((n) => n.path === "packages/env/src/index.ts");

    // api-only preset has errorTracking: "sentry"
    expect(envIndex?.content).toContain("SENTRY_DSN");
  });
});

// ---------------------------------------------------------------------------
// Phase 2 — Hono standalone app
// ---------------------------------------------------------------------------

describe("resolveFileTree — Hono standalone app", () => {
  it("generates Hono app files", () => {
    const { nodes } = resolveFileTree(clone(apiOnlyJson) as Preset);
    const appPaths = nodes.filter((n) => n.path.startsWith("apps/api/")).map((n) => n.path);

    expect(appPaths).toContain("apps/api/package.json");
    expect(appPaths).toContain("apps/api/tsconfig.json");
    expect(appPaths).toContain("apps/api/src/index.ts");
  });

  it("Hono app entry imports @hono/node-server", () => {
    const { nodes } = resolveFileTree(clone(apiOnlyJson) as Preset);
    const entryNode = nodes.find((n) => n.path === "apps/api/src/index.ts");

    expect(entryNode?.content).toContain("@hono/node-server");
    expect(entryNode?.content).toContain("serve");
  });

  it("Hono app has hono and @hono/node-server deps", () => {
    const { nodes } = resolveFileTree(clone(apiOnlyJson) as Preset);
    const pkgNode = nodes.find((n) => n.path === "apps/api/package.json");
    const pkg = JSON.parse(pkgNode!.content!);

    expect(pkg.dependencies).toHaveProperty("hono");
    expect(pkg.dependencies).toHaveProperty("@hono/node-server");
  });

  it("Hono app imports api package when hono api strategy", () => {
    const { nodes } = resolveFileTree(clone(apiOnlyJson) as Preset);
    const entryNode = nodes.find((n) => n.path === "apps/api/src/index.ts");

    // api-only preset has api strategy: hono
    expect(entryNode?.content).toContain("@my-api/api");
  });

  it("catalog includes @hono/node-server and tsx for hono apps", () => {
    const { nodes } = resolveFileTree(clone(apiOnlyJson) as Preset);
    const rootPkg = JSON.parse(nodes.find((n) => n.path === "package.json")!.content!);

    expect(rootPkg.catalog).toHaveProperty("@hono/node-server");
    expect(rootPkg.catalog).toHaveProperty("tsx");
  });
});

// ---------------------------------------------------------------------------
// Phase 2 — Catalog includes driver deps
// ---------------------------------------------------------------------------

describe("resolveFileTree — catalog driver dependencies", () => {
  it("includes postgres driver in catalog for drizzle+postgres", () => {
    const { nodes } = resolveFileTree(clone(apiOnlyJson) as Preset);
    const rootPkg = JSON.parse(nodes.find((n) => n.path === "package.json")!.content!);

    expect(rootPkg.catalog).toHaveProperty("postgres");
  });

  it("includes mysql2 for drizzle+mysql", () => {
    const preset = clone(minimalJson) as Preset;
    preset.database = { strategy: "drizzle", driver: "mysql" };

    const { nodes } = resolveFileTree(preset);
    const rootPkg = JSON.parse(nodes.find((n) => n.path === "package.json")!.content!);

    expect(rootPkg.catalog).toHaveProperty("mysql2");
  });

  it("includes @neondatabase/serverless for drizzle+neon", () => {
    const preset = clone(minimalJson) as Preset;
    preset.database = { strategy: "drizzle", driver: "neon" };

    const { nodes } = resolveFileTree(preset);
    const rootPkg = JSON.parse(nodes.find((n) => n.path === "package.json")!.content!);

    expect(rootPkg.catalog).toHaveProperty("@neondatabase/serverless");
  });
});

// ---------------------------------------------------------------------------
// Phase 3 — Integration packages
// ---------------------------------------------------------------------------

describe("resolveFileTree — analytics package (PostHog)", () => {
  it("generates PostHog provider, client, and server files", () => {
    const { nodes } = resolveFileTree(clone(saasJson) as Preset);
    const paths = nodes.filter((n) => n.path.startsWith("packages/analytics/")).map((n) => n.path);

    expect(paths).toContain("packages/analytics/src/index.ts");
    expect(paths).toContain("packages/analytics/src/provider.tsx");
    expect(paths).toContain("packages/analytics/src/client.ts");
    expect(paths).toContain("packages/analytics/src/server.ts");
  });

  it("PostHog provider uses posthog-js", () => {
    const { nodes } = resolveFileTree(clone(saasJson) as Preset);
    const provider = nodes.find((n) => n.path === "packages/analytics/src/provider.tsx");

    expect(provider?.content).toContain("posthog-js");
    expect(provider?.content).toContain("PostHogProvider");
  });

  it("Vercel Analytics exports from @vercel/analytics", () => {
    const preset = clone(minimalJson) as Preset;
    preset.integrations.analytics = "vercel-analytics";

    const { nodes } = resolveFileTree(preset);
    const index = nodes.find((n) => n.path === "packages/analytics/src/index.ts");

    expect(index?.content).toContain("@vercel/analytics");
  });

  it("Plausible generates provider with Script tag", () => {
    const preset = clone(minimalJson) as Preset;
    preset.integrations.analytics = "plausible";

    const { nodes } = resolveFileTree(preset);
    const provider = nodes.find((n) => n.path === "packages/analytics/src/provider.tsx");

    expect(provider?.content).toContain("plausible.io");
  });

  it("no analytics package when analytics is none", () => {
    const preset = clone(minimalJson) as Preset;
    preset.integrations.analytics = "none";

    const { nodes } = resolveFileTree(preset);
    const paths = nodes.map((n) => n.path);

    expect(paths.some((p) => p.startsWith("packages/analytics/"))).toBe(false);
  });
});

describe("resolveFileTree — monitoring package (Sentry)", () => {
  it("generates sentry config files", () => {
    const { nodes } = resolveFileTree(clone(saasJson) as Preset);
    const paths = nodes.filter((n) => n.path.startsWith("packages/monitoring/")).map((n) => n.path);

    expect(paths).toContain("packages/monitoring/src/sentry.ts");
    expect(paths).toContain("packages/monitoring/src/sentry.client.config.ts");
    expect(paths).toContain("packages/monitoring/src/sentry.server.config.ts");
  });

  it("sentry module has captureException and captureMessage", () => {
    const { nodes } = resolveFileTree(clone(saasJson) as Preset);
    const sentry = nodes.find((n) => n.path === "packages/monitoring/src/sentry.ts");

    expect(sentry?.content).toContain("captureException");
    expect(sentry?.content).toContain("captureMessage");
    expect(sentry?.content).toContain("@sentry/nextjs");
  });
});

describe("resolveFileTree — email package", () => {
  it("react-email-resend generates client and welcome template", () => {
    const { nodes } = resolveFileTree(clone(saasJson) as Preset);
    const paths = nodes.filter((n) => n.path.startsWith("packages/email/")).map((n) => n.path);

    expect(paths).toContain("packages/email/src/client.ts");
    expect(paths).toContain("packages/email/src/templates/welcome.tsx");
  });

  it("email client uses Resend", () => {
    const { nodes } = resolveFileTree(clone(saasJson) as Preset);
    const client = nodes.find((n) => n.path === "packages/email/src/client.ts");

    expect(client?.content).toContain("Resend");
    expect(client?.content).toContain("sendEmail");
  });

  it("nodemailer generates client with transporter", () => {
    const preset = clone(minimalJson) as Preset;
    preset.integrations.email = "nodemailer";

    const { nodes } = resolveFileTree(preset);
    const client = nodes.find((n) => n.path === "packages/email/src/client.ts");

    expect(client?.content).toContain("nodemailer");
    expect(client?.content).toContain("transporter");
  });
});

describe("resolveFileTree — rate-limit package", () => {
  it("generates upstash rate limiter", () => {
    const { nodes } = resolveFileTree(clone(apiOnlyJson) as Preset);
    const index = nodes.find((n) => n.path === "packages/rate-limit/src/index.ts");

    expect(index?.content).toContain("Ratelimit");
    expect(index?.content).toContain("@upstash/ratelimit");
    expect(index?.content).toContain("slidingWindow");
  });
});

describe("resolveFileTree — AI package", () => {
  it("vercel-ai-sdk generates client with generateText and streamText", () => {
    const preset = clone(minimalJson) as Preset;
    preset.integrations.ai = "vercel-ai-sdk";

    const { nodes } = resolveFileTree(preset);
    const client = nodes.find((n) => n.path === "packages/ai/src/client.ts");

    expect(client?.content).toContain("generateText");
    expect(client?.content).toContain("streamText");
    expect(client?.content).toContain("@ai-sdk/openai");
  });
});

describe("resolveFileTree — env includes integration vars", () => {
  it("includes RESEND_API_KEY when email is react-email-resend", () => {
    const { nodes } = resolveFileTree(clone(saasJson) as Preset);
    const env = nodes.find((n) => n.path === "packages/env/src/index.ts");

    expect(env?.content).toContain("RESEND_API_KEY");
  });

  it("includes UPSTASH vars when rateLimit is upstash", () => {
    const { nodes } = resolveFileTree(clone(apiOnlyJson) as Preset);
    const env = nodes.find((n) => n.path === "packages/env/src/index.ts");

    expect(env?.content).toContain("UPSTASH_REDIS_REST_URL");
    expect(env?.content).toContain("UPSTASH_REDIS_REST_TOKEN");
  });

  it("includes OPENAI_API_KEY when ai is vercel-ai-sdk", () => {
    const preset = clone(minimalJson) as Preset;
    preset.integrations.ai = "vercel-ai-sdk";

    const { nodes } = resolveFileTree(preset);
    const env = nodes.find((n) => n.path === "packages/env/src/index.ts");

    expect(env?.content).toContain("OPENAI_API_KEY");
  });
});
