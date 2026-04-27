import { resolveAutoPackages } from "@create-turbo-stack/core";
import type { Preset } from "@create-turbo-stack/schema";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpContext } from "./context";

export function registerResources(server: McpServer, ctx: McpContext): void {
  server.resource("workspace-config", "workspace://config", async (uri) => {
    const config = await ctx.cache.getConfigCached();
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: config ? JSON.stringify(config, null, 2) : "{}",
        },
      ],
    };
  });

  server.resource("workspace-conventions", "workspace://conventions", async (uri) => {
    const config = await ctx.cache.getConfigCached();
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "text/markdown",
          text: config ? generateConventionsDoc(config as Preset) : "No .turbo-stack.json found.",
        },
      ],
    };
  });

  server.resource("workspace-apps", "workspace://apps", async (uri) => {
    const config = await ctx.cache.getConfigCached();
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(config?.apps ?? [], null, 2),
        },
      ],
    };
  });

  server.resource("workspace-packages", "workspace://packages", async (uri) => {
    const config = await ctx.cache.getConfigCached();
    const allPkgs = config ? [...config.packages, ...resolveAutoPackages(config as Preset)] : [];
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(allPkgs, null, 2),
        },
      ],
    };
  });
}

/**
 * Defensive accessors — the schema guarantees these fields under
 * normal validation, but resources may be queried against an
 * out-of-band-edited or migration-stale config. Falling back beats
 * crashing the resource handler.
 */
function safe<T>(value: T | undefined | null, fallback: T): T {
  return value ?? fallback;
}

function generateConventionsDoc(preset: Preset): string {
  const basics = preset.basics;
  const integrations = preset.integrations;
  const lines: string[] = [
    `# ${safe(basics?.projectName, "project")} — Workspace Conventions`,
    "",
    "## Basics",
    `- **Package Manager**: ${safe(basics?.packageManager, "unknown")}`,
    `- **TypeScript**: ${safe(basics?.typescript, "unknown")}`,
    `- **Linter**: ${safe(basics?.linter, "unknown")}`,
    `- **Scope**: ${safe(basics?.scope, "@unknown")}`,
    "",
    "## Stack",
    `- **Database**: ${safe(preset.database?.strategy, "none")}`,
    `- **API**: ${safe(preset.api?.strategy, "none")}`,
    `- **Auth**: ${safe(preset.auth?.provider, "none")}`,
    `- **CSS**: ${safe(preset.css?.framework, "none")} + ${safe(preset.css?.ui, "none")}`,
    "",
    "## Apps",
  ];

  for (const app of preset.apps ?? []) {
    lines.push(
      `- **${app.name}** (${app.type}, port ${app.port})${
        app.consumes.length > 0 ? ` — consumes: ${app.consumes.join(", ")}` : ""
      }`,
    );
  }

  lines.push("", "## Packages");
  const scope = safe(basics?.scope, "@unknown");
  for (const pkg of preset.packages ?? []) {
    lines.push(
      `- **${scope}/${pkg.name}** (${pkg.type})${pkg.producesCSS ? " — produces CSS" : ""}`,
    );
  }

  const autoPackages = resolveAutoPackages(preset);
  if (autoPackages.length > 0) {
    lines.push("", "## Auto-generated Packages");
    for (const pkg of autoPackages) {
      lines.push(`- **${scope}/${pkg.name}** (${pkg.type})`);
    }
  }

  lines.push("", "## Import Conventions");
  lines.push(`- Internal packages: \`import { ... } from "${scope}/{package-name}"\``);
  lines.push('- Workspace deps use `"workspace:*"`');
  lines.push('- External deps use `"catalog:"` (version in root package.json catalog)');

  if (integrations?.envValidation) {
    lines.push("", "## Environment Variables");
    lines.push(`- Validated via \`@t3-oss/env-nextjs\` in \`${scope}/env\``);
    lines.push(`- Import: \`import { env } from "${scope}/env"\``);
  }

  return lines.join("\n");
}
