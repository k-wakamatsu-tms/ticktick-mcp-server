import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TickTickClient } from "../ticktick/client.js";
import { formatProject, formatProjectList } from "../ticktick/formatters.js";

export function registerProjectTools(
  server: McpServer,
  getClient: () => TickTickClient,
) {
  server.tool(
    "get_projects",
    "Get all TickTick projects",
    {},
    async () => {
      const projects = await getClient().getProjects();
      return {
        content: [{ type: "text", text: formatProjectList(projects) }],
      };
    },
  );

  server.tool(
    "get_project",
    "Get a specific TickTick project by ID",
    { project_id: z.string().describe("The project ID") },
    async ({ project_id }) => {
      const project = await getClient().getProject(project_id);
      return {
        content: [{ type: "text", text: formatProject(project) }],
      };
    },
  );

  server.tool(
    "create_project",
    "Create a new TickTick project",
    {
      name: z.string().describe("Project name"),
      color: z.string().optional().describe('Project color hex (e.g. "#F18181")'),
      view_mode: z
        .enum(["list", "kanban", "timeline"])
        .optional()
        .describe("Project view mode"),
    },
    async ({ name, color, view_mode }) => {
      const project = await getClient().createProject({
        name,
        color,
        viewMode: view_mode,
      });
      return {
        content: [
          { type: "text", text: `Project created:\n${formatProject(project)}` },
        ],
      };
    },
  );

  server.tool(
    "delete_project",
    "Delete a TickTick project by ID",
    { project_id: z.string().describe("The project ID to delete") },
    async ({ project_id }) => {
      await getClient().deleteProject(project_id);
      return {
        content: [
          { type: "text", text: `Project ${project_id} deleted successfully.` },
        ],
      };
    },
  );
}
