import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { GitHubHandler } from "./github-handler.js";
import { TickTickClient } from "./ticktick/client.js";
import { registerProjectTools } from "./tools/projects.js";
import { registerTaskCrudTools } from "./tools/tasks-crud.js";
import { registerTaskQueryTools } from "./tools/tasks-query.js";
import { registerGtdTools } from "./tools/tasks-gtd.js";
import type { Props } from "./utils.js";

export class TickTickMCP extends McpAgent<Env, Record<string, never>, Props> {
  server = new McpServer({
    name: "TickTick MCP Server",
    version: "1.0.0",
  });

  async init() {
    const getClient = () => new TickTickClient(this.env.TICKTICK_ACCESS_TOKEN);

    registerProjectTools(this.server, getClient);
    registerTaskCrudTools(this.server, getClient);
    registerTaskQueryTools(this.server, getClient);
    registerGtdTools(this.server, getClient);
  }
}

export default new OAuthProvider({
  apiHandler: TickTickMCP.serve("/mcp"),
  apiRoute: "/mcp",
  defaultHandler: GitHubHandler as any,
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/token",
  clientRegistrationEndpoint: "/register",
});
