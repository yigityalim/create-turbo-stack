import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CLI_VERSION } from "../version";
import { createContext, resolveProjectRoot } from "./context";
import { registerResources } from "./resources";
import { registerTools } from "./tools";

export async function startMcpServer(): Promise<void> {
  // the server from their own cwd, so we must explicitly pin it via
  // `TURBO_STACK_ROOT` or by walking up from the CLI's invocation cwd.
  const projectRoot = await resolveProjectRoot();
  const ctx = createContext(projectRoot);

  const server = new McpServer(
    { name: "create-turbo-stack", version: CLI_VERSION },
    {
      capabilities: { tools: {}, resources: {} },
      instructions: `Scaffolds Turborepo monorepos. Tools mutate \`${projectRoot}/.turbo-stack.json\` and emit files there.`,
    },
  );

  registerTools(server, ctx);
  registerResources(server, ctx);

  const transport = new StdioServerTransport();

  const shutdown = async (signal: string) => {
    console.error(`[mcp] received ${signal}, shutting down`);
    await server.close().catch(() => {});
    process.exit(0);
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  await server.connect(transport);
  console.error(
    `[mcp] create-turbo-stack v${CLI_VERSION} ready on stdio (project: ${projectRoot})`,
  );
}
