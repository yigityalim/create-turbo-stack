import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerResources } from "./resources";
import { registerTools } from "./tools";

export async function startMcpServer() {
  const server = new McpServer({
    name: "create-turbo-stack",
    version: "0.5.0",
  });

  registerTools(server);
  registerResources(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
