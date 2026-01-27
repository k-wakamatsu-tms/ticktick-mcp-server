import type { Task, Project } from "./types.js";

const PRIORITY_LABELS: Record<number, string> = {
  0: "None",
  1: "Low",
  3: "Medium",
  5: "High",
};

const STATUS_LABELS: Record<number, string> = {
  0: "Active",
  2: "Completed",
};

export function formatTask(task: Task): string {
  const lines: string[] = [
    `Title: ${task.title}`,
    `ID: ${task.id}`,
    `Project ID: ${task.projectId}`,
    `Priority: ${PRIORITY_LABELS[task.priority] ?? String(task.priority)}`,
    `Status: ${STATUS_LABELS[task.status] ?? String(task.status)}`,
  ];
  if (task.content) lines.push(`Content: ${task.content}`);
  if (task.dueDate) lines.push(`Due: ${task.dueDate}`);
  if (task.startDate) lines.push(`Start: ${task.startDate}`);
  if (task.parentId) lines.push(`Parent ID: ${task.parentId}`);
  if (task.items && task.items.length > 0) {
    lines.push(`Checklist:`);
    for (const item of task.items) {
      const check = item.status === 1 ? "[x]" : "[ ]";
      lines.push(`  ${check} ${item.title}`);
    }
  }
  return lines.join("\n");
}

export function formatTaskList(tasks: Task[]): string {
  if (tasks.length === 0) return "No tasks found.";
  return tasks.map(formatTask).join("\n---\n");
}

export function formatProject(project: Project): string {
  const lines: string[] = [
    `Name: ${project.name}`,
    `ID: ${project.id}`,
  ];
  if (project.color) lines.push(`Color: ${project.color}`);
  if (project.viewMode) lines.push(`View Mode: ${project.viewMode}`);
  if (project.kind) lines.push(`Kind: ${project.kind}`);
  if (project.closed) lines.push(`Closed: true`);
  return lines.join("\n");
}

export function formatProjectList(projects: Project[]): string {
  if (projects.length === 0) return "No projects found.";
  return projects.map(formatProject).join("\n---\n");
}
