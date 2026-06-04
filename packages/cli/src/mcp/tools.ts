import {
  computeCatalog,
  computeCssSourceMap,
  computeWorkspaceRefs,
  resolveAutoPackages,
  resolveFileTree,
} from "@create-turbo-stack/core";
import type { App, Package, Preset } from "@create-turbo-stack/schema";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type McpContext, textResponse, withConfig } from "./context";

/**
 * Tool names are prefixed with `turbostack_` because MCP tool names
 * share a flat namespace on the client side; a generic `add_app` would
 * collide with any other server offering similar tools.
 */
const PREFIX = "turbostack_";

export function registerTools(server: McpServer, ctx: McpContext): void {
  server.tool(
    `${PREFIX}add_app`,
    "Scaffold a new app in the monorepo",
    {
      name: z.string().describe("App name (lowercase, kebab-case)"),
      type: z
        .enum([
          "nextjs",
          "nextjs-api-only",
          "hono-standalone",
          "vite-react",
          "vite-vue",
          "sveltekit",
          "astro",
          "expo",
          "tauri",
        ])
        .describe("App framework type"),
      port: z.number().int().min(1024).max(65535).describe("Dev server port"),
      i18n: z.boolean().optional().default(false).describe("Enable i18n"),
      consumes: z.array(z.string()).optional().default([]).describe("Package names to consume"),
      location: z
        .string()
        .optional()
        .default("apps")
        .describe("Workspace directory for this app (default: apps)"),
    },
    ({ name, type, port, i18n, consumes, location }) =>
      withConfig(ctx, async (config) => {
        if (config.apps.some((a) => a.name === name)) {
          return { error: `App "${name}" already exists` };
        }
        if (config.apps.some((a) => a.port === port)) {
          return { error: `Port ${port} is already in use by another app` };
        }
        const newApp: App = {
          name,
          type,
          location: location ?? "apps",
          port,
          i18n: i18n ?? false,
          consumes: consumes ?? [],
        };
        return {
          preset: { ...config, apps: [...config.apps, newApp] } as Preset,
          success: `Created app "${name}" (${type}:${port}) in ${location ?? "apps"}/`,
        };
      }),
  );

  server.tool(
    `${PREFIX}add_package`,
    "Scaffold a new package in the monorepo",
    {
      name: z.string().describe("Package name (lowercase, kebab-case)"),
      type: z.enum(["ui", "utils", "config", "library", "react-library"]).describe("Package type"),
      producesCSS: z
        .boolean()
        .optional()
        .default(false)
        .describe("Whether the package produces CSS"),
      exports: z.array(z.string()).optional().default(["."]).describe("Package export paths"),
      location: z
        .string()
        .optional()
        .default("packages")
        .describe("Workspace directory for this package (default: packages)"),
    },
    ({ name, type, producesCSS, exports, location }) =>
      withConfig(ctx, async (config) => {
        if (config.packages.some((p) => p.name === name)) {
          return { error: `Package "${name}" already exists` };
        }
        const newPkg: Package = {
          name,
          type,
          location: location ?? "packages",
          producesCSS: producesCSS ?? false,
          exports: exports ?? ["."],
        };
        return {
          preset: { ...config, packages: [...config.packages, newPkg] } as Preset,
          success: `Created package "${name}" (${type}) in ${location ?? "packages"}/`,
        };
      }),
  );

  server.tool(
    `${PREFIX}add_integration`,
    "Add or switch an integration provider in the monorepo",
    {
      category: z
        .enum(["analytics", "errorTracking", "email", "rateLimit", "ai", "cache"])
        .describe("Integration category"),
      value: z
        .string()
        .describe(
          "Provider value. Analytics: posthog|vercel-analytics|plausible|none. " +
            "Error tracking: sentry|bugsnag|none. Email: react-email-resend|nodemailer|none. " +
            "Rate limit: upstash|none. AI: vercel-ai-sdk|langchain|none. Cache: upstash|none.",
        ),
    },
    ({ category, value }) =>
      withConfig(ctx, async (config) => ({
        preset: {
          ...config,
          integrations: { ...config.integrations, [category]: value },
        } as Preset,
        success: `Set ${category} → ${value}.`,
      })),
  );

  server.tool(
    `${PREFIX}switch_database`,
    "Switch the database strategy (replaces existing database config)",
    {
      strategy: z
        .enum(["drizzle", "prisma", "supabase", "none"])
        .describe("Database strategy"),
      driver: z
        .enum(["postgres", "mysql", "sqlite", "turso", "neon", "planetscale"])
        .optional()
        .describe("Drizzle/Prisma driver (required for drizzle, optional for prisma)"),
    },
    ({ strategy, driver }) =>
      withConfig(ctx, async (config) => {
        if (strategy === "drizzle" && !driver) {
          return { error: "Drizzle requires a driver (postgres, mysql, sqlite, turso, neon, planetscale)" };
        }
        const database =
          strategy === "drizzle"
            ? { strategy: "drizzle" as const, driver: driver! }
            : strategy === "prisma" && driver
              ? { strategy: "prisma" as const, driver }
              : { strategy } as Preset["database"];
        return {
          preset: { ...config, database } as Preset,
          success: `Database switched to ${strategy}${driver ? ` (${driver})` : ""}.`,
        };
      }),
  );

  server.tool(
    `${PREFIX}switch_auth`,
    "Switch the authentication provider",
    {
      provider: z
        .enum(["supabase-auth", "better-auth", "clerk", "next-auth", "lucia", "none"])
        .describe("Auth provider"),
    },
    ({ provider }) =>
      withConfig(ctx, async (config) => ({
        preset: {
          ...config,
          auth: { provider, rbac: config.auth.rbac, entitlements: config.auth.entitlements },
        } as Preset,
        success: `Auth switched to ${provider}.`,
      })),
  );

  server.tool(
    `${PREFIX}switch_api`,
    "Switch the API strategy",
    {
      strategy: z
        .enum(["trpc", "hono", "rest-nextjs", "none"])
        .describe("API strategy"),
    },
    ({ strategy }) =>
      withConfig(ctx, async (config) => ({
        preset: {
          ...config,
          api: { strategy } as Preset["api"],
        } as Preset,
        success: `API switched to ${strategy}.`,
      })),
  );

  server.tool(
    `${PREFIX}wire_workspace_package`,
    "Make an app consume a workspace package (adds to its `consumes` list)",
    {
      app: z.string().describe("Name of the app to update"),
      packageName: z.string().describe("Workspace package name to add to consumes"),
    },
    ({ app, packageName }) =>
      withConfig(ctx, async (config) => {
        const idx = config.apps.findIndex((a) => a.name === app);
        if (idx === -1) return { error: `App "${app}" not found` };

        const target = config.apps[idx];
        if (target.consumes.includes(packageName)) {
          return { error: `App "${app}" already consumes "${packageName}"` };
        }

        const updatedApps = [...config.apps];
        updatedApps[idx] = { ...target, consumes: [...target.consumes, packageName] };
        return {
          preset: { ...config, apps: updatedApps } as Preset,
          success: `Wired "${packageName}" into "${app}".`,
        };
      }),
  );

  // Read-only tools — go through the cache instead of invalidating it.

  server.tool(
    `${PREFIX}get_workspace_info`,
    "Read .turbo-stack.json and return workspace state",
    {},
    async () => {
      const config = await ctx.cache.getConfigCached();
      if (!config) return textResponse(`Error: No .turbo-stack.json found at ${ctx.projectRoot}`);
      return textResponse(JSON.stringify(config, null, 2));
    },
  );

  server.tool(
    `${PREFIX}get_dependency_graph`,
    "Compute and return the workspace dependency graph",
    {},
    async () => {
      const config = await ctx.cache.getConfigCached();
      if (!config) return textResponse(`Error: No .turbo-stack.json found at ${ctx.projectRoot}`);

      const preset = config as Preset;
      const graph = {
        apps: preset.apps.map((a) => ({
          name: a.name,
          type: a.type,
          port: a.port,
          consumes: a.consumes,
        })),
        packages: preset.packages.map((p) => ({
          name: p.name,
          type: p.type,
          producesCSS: p.producesCSS,
        })),
        autoPackages: resolveAutoPackages(preset).map((p) => ({ name: p.name, type: p.type })),
        workspaceRefs: computeWorkspaceRefs(preset),
        cssSourceMap: computeCssSourceMap(preset),
        catalog: computeCatalog(preset),
      };
      return textResponse(JSON.stringify(graph, null, 2));
    },
  );

  server.tool(
    `${PREFIX}preview_files`,
    "Resolve the file tree and return paths (or full contents)",
    {
      includeContents: z
        .boolean()
        .optional()
        .default(false)
        .describe("Include file contents in the response (can be large)"),
    },
    async ({ includeContents }) => {
      const config = await ctx.cache.getConfigCached();
      if (!config) return textResponse(`Error: No .turbo-stack.json found at ${ctx.projectRoot}`);

      const tree = resolveFileTree(config as Preset);
      const files = tree.nodes.filter((n) => !n.isDirectory);
      const payload = includeContents
        ? files.map((n) => ({ path: n.path, content: n.content ?? "" }))
        : files.map((n) => n.path);
      return textResponse(JSON.stringify(payload, null, 2));
    },
  );
}
