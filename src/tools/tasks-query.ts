import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TickTickClient } from "../ticktick/client.js";
import type { Task } from "../ticktick/types.js";
import { formatTaskList } from "../ticktick/formatters.js";
import {
  getAllTasks,
  startOfDayUTC,
  startOfNextDayUTC,
} from "./task-utils.js";

/** Check if a task is due on a specific date */
function isDueOnDate(task: Task, target: Date): boolean {
  if (!task.dueDate) return false;
  const due = new Date(task.dueDate);
  const dayStart = startOfDayUTC(target);
  const dayEnd = startOfNextDayUTC(target);
  return due >= dayStart && due < dayEnd;
}

/** Check if a task is due within a date range [start, end) */
function isDueInRange(task: Task, start: Date, end: Date): boolean {
  if (!task.dueDate) return false;
  const due = new Date(task.dueDate);
  return due >= start && due < end;
}

/** Check if a task is overdue */
function isOverdue(task: Task, now: Date): boolean {
  if (!task.dueDate) return false;
  const due = new Date(task.dueDate);
  return due < startOfDayUTC(now) && task.status !== 2;
}

/** Filter tasks from all projects using a predicate */
async function filterTasks(
  client: TickTickClient,
  predicate: (task: Task) => boolean,
): Promise<Task[]> {
  const tasks = await getAllTasks(client);
  return tasks.filter(predicate);
}

export function registerTaskQueryTools(
  server: McpServer,
  getClient: () => TickTickClient,
) {
  server.tool(
    "get_all_tasks",
    "Get all tasks from all non-closed projects",
    {},
    async () => {
      const tasks = await getAllTasks(getClient());
      return {
        content: [{ type: "text", text: formatTaskList(tasks) }],
      };
    },
  );

  server.tool(
    "search_tasks",
    "Search tasks by keyword in title, content, and subtask titles",
    {
      search_term: z
        .string()
        .describe("Search term (case-insensitive)"),
    },
    async ({ search_term }) => {
      const term = search_term.toLowerCase();
      const tasks = await filterTasks(getClient(), (task) => {
        if (task.title.toLowerCase().includes(term)) return true;
        if (task.content?.toLowerCase().includes(term)) return true;
        if (
          task.items?.some((item) =>
            item.title.toLowerCase().includes(term),
          )
        )
          return true;
        return false;
      });
      return {
        content: [{ type: "text", text: formatTaskList(tasks) }],
      };
    },
  );

  server.tool(
    "get_tasks_by_priority",
    "Get all tasks with a specific priority level",
    {
      priority: z
        .number()
        .describe("Priority level: 0=None, 1=Low, 3=Medium, 5=High"),
    },
    async ({ priority }) => {
      const tasks = await filterTasks(
        getClient(),
        (task) => task.priority === priority,
      );
      return {
        content: [{ type: "text", text: formatTaskList(tasks) }],
      };
    },
  );

  server.tool(
    "get_tasks_due_today",
    "Get all tasks due today",
    {},
    async () => {
      const now = new Date();
      const tasks = await filterTasks(getClient(), (task) =>
        isDueOnDate(task, now),
      );
      return {
        content: [{ type: "text", text: formatTaskList(tasks) }],
      };
    },
  );

  server.tool(
    "get_tasks_due_tomorrow",
    "Get all tasks due tomorrow",
    {},
    async () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      const tasks = await filterTasks(getClient(), (task) =>
        isDueOnDate(task, tomorrow),
      );
      return {
        content: [{ type: "text", text: formatTaskList(tasks) }],
      };
    },
  );

  server.tool(
    "get_tasks_due_in_days",
    "Get all tasks due in exactly N days from now",
    {
      days: z.number().min(0).describe("Number of days from now"),
    },
    async ({ days }) => {
      const now = new Date();
      const target = new Date(now);
      target.setUTCDate(target.getUTCDate() + days);
      const tasks = await filterTasks(getClient(), (task) =>
        isDueOnDate(task, target),
      );
      return {
        content: [{ type: "text", text: formatTaskList(tasks) }],
      };
    },
  );

  server.tool(
    "get_tasks_due_this_week",
    "Get all tasks due within the next 7 days",
    {},
    async () => {
      const now = new Date();
      const start = startOfDayUTC(now);
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 7);
      const tasks = await filterTasks(getClient(), (task) =>
        isDueInRange(task, start, end),
      );
      return {
        content: [{ type: "text", text: formatTaskList(tasks) }],
      };
    },
  );

  server.tool(
    "get_overdue_tasks",
    "Get all tasks past their due date",
    {},
    async () => {
      const now = new Date();
      const tasks = await filterTasks(getClient(), (task) =>
        isOverdue(task, now),
      );
      return {
        content: [{ type: "text", text: formatTaskList(tasks) }],
      };
    },
  );
}
