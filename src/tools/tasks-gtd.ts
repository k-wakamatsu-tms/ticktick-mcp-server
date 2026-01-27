import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TickTickClient } from "../ticktick/client.js";
import type { Task } from "../ticktick/types.js";
import { formatTask, formatTaskList } from "../ticktick/formatters.js";

/** Collect all tasks from all non-closed projects */
async function getAllTasks(client: TickTickClient): Promise<Task[]> {
  const projects = await client.getProjects();
  const allTasks: Task[] = [];
  for (const project of projects) {
    if (project.closed) continue;
    const data = await client.getProjectWithData(project.id);
    allTasks.push(...data.tasks);
  }
  return allTasks;
}

function startOfDayUTC(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function startOfNextDayUTC(date: Date): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() + 1,
    ),
  );
}

export function registerGtdTools(
  server: McpServer,
  getClient: () => TickTickClient,
) {
  server.tool(
    "get_engaged_tasks",
    "Get engaged tasks (GTD): high priority (5), due today, or overdue",
    {},
    async () => {
      const now = new Date();
      const dayStart = startOfDayUTC(now);
      const dayEnd = startOfNextDayUTC(now);
      const allTasks = await getAllTasks(getClient());
      const engaged = allTasks.filter((task) => {
        if (task.status === 2) return false;
        if (task.priority === 5) return true;
        if (task.dueDate) {
          const due = new Date(task.dueDate);
          if (due >= dayStart && due < dayEnd) return true;
          if (due < dayStart) return true;
        }
        return false;
      });
      return {
        content: [{ type: "text", text: formatTaskList(engaged) }],
      };
    },
  );

  server.tool(
    "get_next_tasks",
    "Get next tasks (GTD): medium priority (3) or due tomorrow",
    {},
    async () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      const tomorrowStart = startOfDayUTC(tomorrow);
      const tomorrowEnd = startOfNextDayUTC(tomorrow);
      const allTasks = await getAllTasks(getClient());
      const next = allTasks.filter((task) => {
        if (task.status === 2) return false;
        if (task.priority === 3) return true;
        if (task.dueDate) {
          const due = new Date(task.dueDate);
          if (due >= tomorrowStart && due < tomorrowEnd) return true;
        }
        return false;
      });
      return {
        content: [{ type: "text", text: formatTaskList(next) }],
      };
    },
  );

  server.tool(
    "batch_create_tasks",
    "Create multiple tasks at once. Each task requires title and project_id.",
    {
      tasks: z
        .array(
          z.object({
            title: z.string().describe("Task title"),
            project_id: z.string().describe("Project ID"),
            content: z.string().optional().describe("Task content"),
            start_date: z.string().optional().describe("Start date ISO"),
            due_date: z.string().optional().describe("Due date ISO"),
            priority: z.number().optional().describe("Priority 0/1/3/5"),
          }),
        )
        .describe("Array of tasks to create"),
    },
    async ({ tasks }) => {
      // Validate all tasks first
      for (let i = 0; i < tasks.length; i++) {
        const t = tasks[i];
        if (!t.title || !t.project_id) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Validation error: task at index ${i} missing required title or project_id.`,
              },
            ],
          };
        }
      }

      const results: string[] = [];
      const client = getClient();
      for (const t of tasks) {
        const task = await client.createTask({
          title: t.title,
          projectId: t.project_id,
          content: t.content,
          startDate: t.start_date,
          dueDate: t.due_date,
          priority: t.priority,
        });
        results.push(formatTask(task));
      }
      return {
        content: [
          {
            type: "text",
            text: `Created ${results.length} tasks:\n${results.join("\n---\n")}`,
          },
        ],
      };
    },
  );

  server.tool(
    "create_subtask",
    "Create a subtask under a parent task",
    {
      subtask_title: z.string().describe("Subtask title"),
      parent_task_id: z.string().describe("Parent task ID"),
      project_id: z.string().describe("Project ID"),
      content: z.string().optional().describe("Subtask content"),
      priority: z
        .number()
        .optional()
        .describe("Priority: 0=None, 1=Low, 3=Medium, 5=High"),
    },
    async ({ subtask_title, parent_task_id, project_id, content, priority }) => {
      const task = await getClient().createTask({
        title: subtask_title,
        projectId: project_id,
        parentId: parent_task_id,
        content,
        priority,
      });
      return {
        content: [
          { type: "text", text: `Subtask created:\n${formatTask(task)}` },
        ],
      };
    },
  );
}
