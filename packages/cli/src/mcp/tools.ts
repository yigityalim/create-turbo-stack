import fs from "node:fs/promises";
import path from "node:path";
import {
  applyMutations,
  computeCatalog,
  computeCssSourceMap,
  computeWorkspaceRefs,
  diffTree,
  resolveAutoPackages,
  resolveFileTree,
} from "@create-turbo-stack/core";
import type { App, Package, Preset, TurboStackConfig } from "@create-turbo-stack/schema";
import { ValidatedPresetSchema } from "@create-turbo-stack/schema";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { readExistingFiles, readProjectConfig, writeProjectConfig } from "../io/reader";
import { writeFiles } from "../io/writer";

async function applyChanges(cwd: string, _oldPreset: Preset, newPreset: Preset): Promise<string> {
  const newTree = resolveFileTree(newPreset);
  const existingPaths = newTree.nodes.filter((n) => !n.isDirectory).map((n) => n.path);
  const existingFiles = await readExistingFiles(cwd, existingPaths);
  const diff = diffTree(existingFiles, newTree.nodes);

  if (diff.create.length === 0 && diff.update.length === 0) {
    return "No changes needed.";
  }

  if (diff.create.length > 0) {
    await writeFiles(cwd, diff.create);
  }

  if (diff.update.length > 0) {
    for (const update of diff.update) {
      const existing = existingFiles.get(update.path) ?? "";
      const updated = applyMutations(existing, update.mutations);
      const fullPath = path.join(cwd, update.path);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, updated, "utf-8");
    }
  }

  const newConfig: TurboStackConfig = {
    ...newPreset,
    generatedAt: new Date().toISOString(),
    cliVersion: "0.5.0",
    catalog: {},
    cssSourceMap: {},
    autoPackages: resolveAutoPackages(newPreset).map((p) => p.name),
  };
  await writeProjectConfig(cwd, newConfig);

  return `${diff.create.length} created, ${diff.update.length} updated.`;
}

export function registerTools(server: McpServer) {
  server.tool(
    "add_app",
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
      cms: z
        .enum(["none", "sanity", "keystatic"])
        .optional()
        .default("none")
        .describe("CMS integration"),
      consumes: z.array(z.string()).optional().default([]).describe("Package names to consume"),
    },
    async ({ name, type, port, i18n, cms, consumes }) => {
      const cwd = process.cwd();
      const config = await readProjectConfig(cwd);
      if (!config) {
        return {
          content: [{ type: "text" as const, text: "Error: No .turbo-stack.json found" }],
        };
      }

      if (config.apps.some((a) => a.name === name)) {
        return {
          content: [{ type: "text" as const, text: `Error: App "${name}" already exists` }],
        };
      }

      const newApp: App = {
        name,
        type,
        port,
        i18n: i18n ?? false,
        cms: cms ?? "none",
        consumes: consumes ?? [],
      };
      const updatedPreset: Preset = { ...config, apps: [...config.apps, newApp] };

      const result = ValidatedPresetSchema.safeParse(updatedPreset);
      if (!result.success) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Validation error: ${result.error.issues.map((i) => i.message).join(", ")}`,
            },
          ],
        };
      }

      const changes = await applyChanges(cwd, config as Preset, result.data);
      return {
        content: [
          {
            type: "text" as const,
            text: `Created app "${name}" (${type}:${port}). ${changes}`,
          },
        ],
      };
    },
  );

  server.tool(
    "add_package",
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
    async ({ name, type, producesCSS, exports }) => {
      const cwd = process.cwd();
      const config = await readProjectConfig(cwd);
      if (!config) {
        return {
          content: [{ type: "text" as const, text: "Error: No .turbo-stack.json found" }],
        };
      }

      if (config.packages.some((p) => p.name === name)) {
        return {
          content: [{ type: "text" as const, text: `Error: Package "${name}" already exists` }],
        };
      }

      const newPkg: Package = {
        name,
        type,
        producesCSS: producesCSS ?? false,
        exports: exports ?? ["."],
      };
      const updatedPreset: Preset = {
        ...config,
        packages: [...config.packages, newPkg],
      };

      const result = ValidatedPresetSchema.safeParse(updatedPreset);
      if (!result.success) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Validation error: ${result.error.issues.map((i) => i.message).join(", ")}`,
            },
          ],
        };
      }

      const changes = await applyChanges(cwd, config as Preset, result.data);
      return {
        content: [
          {
            type: "text" as const,
            text: `Created package "${name}" (${type}). ${changes}`,
          },
        ],
      };
    },
  );

  server.tool(
    "add_integration",
    "Add an integration to the monorepo",
    {
      category: z
        .enum(["analytics", "errorTracking", "email", "rateLimit", "ai"])
        .describe("Integration category"),
      value: z.string().describe("Integration value (e.g. posthog, sentry, react-email-resend)"),
    },
    async ({ category, value }) => {
      const cwd = process.cwd();
      const config = await readProjectConfig(cwd);
      if (!config) {
        return {
          content: [{ type: "text" as const, text: "Error: No .turbo-stack.json found" }],
        };
      }

      const updatedPreset: Preset = {
        ...config,
        integrations: {
          ...config.integrations,
          [category]: value,
        },
      };

      const result = ValidatedPresetSchema.safeParse(updatedPreset);
      if (!result.success) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Validation error: ${result.error.issues.map((i) => i.message).join(", ")}`,
            },
          ],
        };
      }

      const changes = await applyChanges(cwd, config as Preset, result.data);
      return {
        content: [
          {
            type: "text" as const,
            text: `Added integration ${category}=${value}. ${changes}`,
          },
        ],
      };
    },
  );

  server.tool(
    "add_dependency",
    "Add a workspace dependency to an app or package",
    {
      appOrPackage: z.string().describe("Name of the app or package to update"),
      dependency: z.string().describe("Package name to add as a dependency"),
    },
    async ({ appOrPackage, dependency }) => {
      const cwd = process.cwd();
      const config = await readProjectConfig(cwd);
      if (!config) {
        return {
          content: [{ type: "text" as const, text: "Error: No .turbo-stack.json found" }],
        };
      }

      const appIdx = config.apps.findIndex((a) => a.name === appOrPackage);
      if (appIdx === -1) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: App or package "${appOrPackage}" not found`,
            },
          ],
        };
      }

      const app = config.apps[appIdx];
      if (app.consumes.includes(dependency)) {
        return {
          content: [
            {
              type: "text" as const,
              text: `"${appOrPackage}" already consumes "${dependency}"`,
            },
          ],
        };
      }

      const updatedApps = [...config.apps];
      updatedApps[appIdx] = {
        ...app,
        consumes: [...app.consumes, dependency],
      };

      const updatedPreset: Preset = { ...config, apps: updatedApps };

      const result = ValidatedPresetSchema.safeParse(updatedPreset);
      if (!result.success) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Validation error: ${result.error.issues.map((i) => i.message).join(", ")}`,
            },
          ],
        };
      }

      const changes = await applyChanges(cwd, config as Preset, result.data);
      return {
        content: [
          {
            type: "text" as const,
            text: `Added dependency "${dependency}" to "${appOrPackage}". ${changes}`,
          },
        ],
      };
    },
  );

  server.tool(
    "get_workspace_info",
    "Read .turbo-stack.json and return workspace state",
    {},
    async () => {
      const cwd = process.cwd();
      const config = await readProjectConfig(cwd);
      if (!config) {
        return {
          content: [{ type: "text" as const, text: "Error: No .turbo-stack.json found" }],
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(config, null, 2),
          },
        ],
      };
    },
  );

  server.tool(
    "get_dependency_graph",
    "Compute and return the workspace dependency graph",
    {},
    async () => {
      const cwd = process.cwd();
      const config = await readProjectConfig(cwd);
      if (!config) {
        return {
          content: [{ type: "text" as const, text: "Error: No .turbo-stack.json found" }],
        };
      }

      const preset = config as Preset;
      const autoPackages = resolveAutoPackages(preset);
      const workspaceRefs = computeWorkspaceRefs(preset);
      const cssSourceMap = computeCssSourceMap(preset);
      const catalog = computeCatalog(preset);

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
        autoPackages: autoPackages.map((p) => ({
          name: p.name,
          type: p.type,
        })),
        workspaceRefs,
        cssSourceMap,
        catalog,
      };

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(graph, null, 2),
          },
        ],
      };
    },
  );

  server.tool(
    "preview_files",
    "Given the current preset, resolve file tree and return file paths with contents",
    {
      includeContents: z
        .boolean()
        .optional()
        .default(false)
        .describe("Include file contents in the response (can be large)"),
    },
    async ({ includeContents }) => {
      const cwd = process.cwd();
      const config = await readProjectConfig(cwd);
      if (!config) {
        return {
          content: [{ type: "text" as const, text: "Error: No .turbo-stack.json found" }],
        };
      }

      const preset = config as Preset;
      const tree = resolveFileTree(preset);

      if (includeContents) {
        const files = tree.nodes
          .filter((n) => !n.isDirectory)
          .map((n) => ({
            path: n.path,
            content: n.content ?? "",
          }));

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(files, null, 2),
            },
          ],
        };
      }

      const paths = tree.nodes.filter((n) => !n.isDirectory).map((n) => n.path);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(paths, null, 2),
          },
        ],
      };
    },
  );
}
