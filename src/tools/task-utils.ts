import type { TickTickClient } from "../ticktick/client.js";
import type { Task } from "../ticktick/types.js";

/** Collect all tasks from all non-closed projects */
export async function getAllTasks(client: TickTickClient): Promise<Task[]> {
  const projects = await client.getProjects();
  const allTasks: Task[] = [];
  for (const project of projects) {
    if (project.closed) continue;
    const data = await client.getProjectWithData(project.id);
    allTasks.push(...data.tasks);
  }
  return allTasks;
}

/** Get the start of a day in UTC */
export function startOfDayUTC(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/** Get the start of the next day in UTC */
export function startOfNextDayUTC(date: Date): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() + 1,
    ),
  );
}
