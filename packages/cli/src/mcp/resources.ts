import { resolveAutoPackages } from "@create-turbo-stack/core";
import type { Preset } from "@create-turbo-stack/schema";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readProjectConfig } from "../io/reader";

export function registerResources(server: McpServer) {
  server.resource("workspace-config", "workspace://config", async (uri) => {
    const config = await readProjectConfig(process.cwd());
    if (!config) {
      return {
        contents: [{ uri: uri.href, mimeType: "application/json", text: "{}" }],
      };
    }
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(config, null, 2),
        },
      ],
    };
  });

  server.resource("workspace-conventions", "workspace://conventions", async (uri) => {
    const config = await readProjectConfig(process.cwd());
    if (!config) {
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text/markdown",
            text: "No .turbo-stack.json found.",
          },
        ],
      };
    }
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "text/markdown",
          text: generateConventionsDoc(config as Preset),
        },
      ],
    };
  });

  server.resource("workspace-apps", "workspace://apps", async (uri) => {
    const config = await readProjectConfig(process.cwd());
    if (!config) {
      return {
        contents: [{ uri: uri.href, mimeType: "application/json", text: "[]" }],
      };
    }
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(config.apps, null, 2),
        },
      ],
    };
  });

  server.resource("workspace-packages", "workspace://packages", async (uri) => {
    const config = await readProjectConfig(process.cwd());
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

function generateConventionsDoc(preset: Preset): string {
  const lines: string[] = [
    `# ${preset.basics.projectName} — Workspace Conventions`,
    "",
    "## Basics",
    `- **Package Manager**: ${preset.basics.packageManager}`,
    `- **TypeScript**: ${preset.basics.typescript}`,
    `- **Linter**: ${preset.basics.linter}`,
    `- **Scope**: ${preset.basics.scope}`,
    "",
    "## Stack",
    `- **Database**: ${preset.database.strategy}`,
    `- **API**: ${preset.api.strategy}`,
    `- **Auth**: ${preset.auth.provider}`,
    `- **CSS**: ${preset.css.framework} + ${preset.css.ui}`,
    "",
    "## Apps",
  ];

  for (const app of preset.apps) {
    lines.push(
      `- **${app.name}** (${app.type}, port ${app.port})${app.consumes.length > 0 ? ` — consumes: ${app.consumes.join(", ")}` : ""}`,
    );
  }

  lines.push("", "## Packages");
  for (const pkg of preset.packages) {
    lines.push(
      `- **${preset.basics.scope}/${pkg.name}** (${pkg.type})${pkg.producesCSS ? " — produces CSS" : ""}`,
    );
  }

  const autoPackages = resolveAutoPackages(preset);
  if (autoPackages.length > 0) {
    lines.push("", "## Auto-generated Packages");
    for (const pkg of autoPackages) {
      lines.push(`- **${preset.basics.scope}/${pkg.name}** (${pkg.type})`);
    }
  }

  lines.push("", "## Import Conventions");
  lines.push(
    `- Internal packages: \`import { ... } from "${preset.basics.scope}/{package-name}"\``,
  );
  lines.push('- Workspace deps use `"workspace:*"`');
  lines.push('- External deps use `"catalog:"` (version in root package.json catalog)');

  if (preset.integrations.envValidation) {
    lines.push("", "## Environment Variables");
    lines.push(`- Validated via \`@t3-oss/env-nextjs\` in \`${preset.basics.scope}/env\``);
    lines.push(`- Import: \`import { env } from "${preset.basics.scope}/env"\``);
  }

  return lines.join("\n");
}
