import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { describe, expect, it } from "vitest";
import { createContext } from "./context";
import { registerResources } from "./resources";
import { registerTools } from "./tools";

/**
 * Smoke test for the MCP server's tool / resource surface.
 *
 * Construction-time only — actual tool calls are skipped because they
 * touch the filesystem. The point is to catch typos in tool names,
 * schema drift, and missing `ctx` plumbing before they reach a client.
 */
describe("MCP server", () => {
  it("registers tools and resources without throwing", () => {
    const server = new McpServer({ name: "create-turbo-stack", version: "0.0.0-test" });
    const ctx = createContext("/tmp/non-existent-project-root");
    expect(() => {
      registerTools(server, ctx);
      registerResources(server, ctx);
    }).not.toThrow();
  });
});
