import { startMcpServer } from "../mcp/server";

export async function mcpCommand() {
  await startMcpServer();
}
