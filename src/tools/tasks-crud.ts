import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TickTickClient } from "../ticktick/client.js";
import { formatTask, formatTaskList } from "../ticktick/formatters.js";

export function registerTaskCrudTools(
  server: McpServer,
  getClient: () => TickTickClient,
) {
  server.tool(
    "get_project_tasks",
    "Get all tasks in a specific project",
    { project_id: z.string().describe("The project ID") },
    async ({ project_id }) => {
      const data = await getClient().getProjectWithData(project_id);
      return {
        content: [{ type: "text", text: formatTaskList(data.tasks) }],
      };
    },
  );

  server.tool(
    "get_task",
    "Get a specific task by project ID and task ID",
    {
      project_id: z.string().describe("The project ID"),
      task_id: z.string().describe("The task ID"),
    },
    async ({ project_id, task_id }) => {
      const task = await getClient().getTask(project_id, task_id);
      return {
        content: [{ type: "text", text: formatTask(task) }],
      };
    },
  );

  server.tool(
    "create_task",
    "Create a new task in a project",
    {
      title: z.string().describe("Task title"),
      project_id: z.string().describe("Project ID to add the task to"),
      content: z.string().optional().describe("Task description/content"),
      start_date: z
        .string()
        .optional()
        .describe("Start date in ISO format (yyyy-MM-ddTHH:mm:ssZ)"),
      due_date: z
        .string()
        .optional()
        .describe("Due date in ISO format (yyyy-MM-ddTHH:mm:ssZ)"),
      priority: z
        .number()
        .optional()
        .describe("Priority: 0=None, 1=Low, 3=Medium, 5=High"),
    },
    async ({ title, project_id, content, start_date, due_date, priority }) => {
      const task = await getClient().createTask({
        title,
        projectId: project_id,
        content,
        startDate: start_date,
        dueDate: due_date,
        priority,
      });
      return {
        content: [
          { type: "text", text: `Task created:\n${formatTask(task)}` },
        ],
      };
    },
  );

  server.tool(
    "update_task",
    "Update an existing task",
    {
      task_id: z.string().describe("The task ID to update"),
      project_id: z.string().describe("The project ID the task belongs to"),
      title: z.string().optional().describe("New task title"),
      content: z.string().optional().describe("New task description/content"),
      start_date: z
        .string()
        .optional()
        .describe("New start date in ISO format"),
      due_date: z.string().optional().describe("New due date in ISO format"),
      priority: z
        .number()
        .optional()
        .describe("New priority: 0=None, 1=Low, 3=Medium, 5=High"),
    },
    async ({
      task_id,
      project_id,
      title,
      content,
      start_date,
      due_date,
      priority,
    }) => {
      const task = await getClient().updateTask({
        taskId: task_id,
        projectId: project_id,
        title,
        content,
        startDate: start_date,
        dueDate: due_date,
        priority,
      });
      return {
        content: [
          { type: "text", text: `Task updated:\n${formatTask(task)}` },
        ],
      };
    },
  );

  server.tool(
    "complete_task",
    "Mark a task as complete",
    {
      project_id: z.string().describe("The project ID"),
      task_id: z.string().describe("The task ID to complete"),
    },
    async ({ project_id, task_id }) => {
      await getClient().completeTask(project_id, task_id);
      return {
        content: [
          { type: "text", text: `Task ${task_id} marked as complete.` },
        ],
      };
    },
  );

  server.tool(
    "delete_task",
    "Delete a task",
    {
      project_id: z.string().describe("The project ID"),
      task_id: z.string().describe("The task ID to delete"),
    },
    async ({ project_id, task_id }) => {
      await getClient().deleteTask(project_id, task_id);
      return {
        content: [
          { type: "text", text: `Task ${task_id} deleted successfully.` },
        ],
      };
    },
  );
}
