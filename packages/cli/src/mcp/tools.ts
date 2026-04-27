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
          "remix",
          "expo",
          "tauri",
        ])
        .describe("App framework type"),
      port: z.number().int().min(1024).max(65535).describe("Dev server port"),
      i18n: z.boolean().optional().default(false).describe("Enable i18n"),
      consumes: z.array(z.string()).optional().default([]).describe("Package names to consume"),
    },
    ({ name, type, port, i18n, consumes }) =>
      withConfig(ctx, async (config) => {
        if (config.apps.some((a) => a.name === name)) {
          return { error: `App "${name}" already exists` };
        }
        const newApp: App = {
          name,
          type,
          port,
          i18n: i18n ?? false,
          cms: "none",
          consumes: consumes ?? [],
        };
        return {
          preset: { ...config, apps: [...config.apps, newApp] } as Preset,
          success: `Created app "${name}" (${type}:${port}).`,
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
    },
    ({ name, type, producesCSS, exports }) =>
      withConfig(ctx, async (config) => {
        if (config.packages.some((p) => p.name === name)) {
          return { error: `Package "${name}" already exists` };
        }
        const newPkg: Package = {
          name,
          type,
          producesCSS: producesCSS ?? false,
          exports: exports ?? ["."],
        };
        return {
          preset: { ...config, packages: [...config.packages, newPkg] } as Preset,
          success: `Created package "${name}" (${type}).`,
        };
      }),
  );

  server.tool(
    `${PREFIX}add_integration`,
    "Add an integration to the monorepo",
    {
      category: z
        .enum(["analytics", "errorTracking", "email", "rateLimit", "ai"])
        .describe("Integration category"),
      value: z.string().describe("Integration value (e.g. posthog, sentry, react-email-resend)"),
    },
    ({ category, value }) =>
      withConfig(ctx, async (config) => ({
        preset: {
          ...config,
          integrations: { ...config.integrations, [category]: value },
        } as Preset,
        success: `Added integration ${category}=${value}.`,
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
