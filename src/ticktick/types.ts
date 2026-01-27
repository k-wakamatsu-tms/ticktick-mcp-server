/** TickTick API type definitions */

export interface ChecklistItem {
  id: string;
  title: string;
  status: number; // 0=Normal, 1=Completed
  completedTime?: string;
  isAllDay?: boolean;
  sortOrder: number;
  startDate?: string;
  timeZone?: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  content?: string;
  desc?: string;
  isAllDay?: boolean;
  startDate?: string;
  dueDate?: string;
  timeZone?: string;
  repeatFlag?: string;
  reminders?: string[];
  priority: number; // 0=None, 1=Low, 3=Medium, 5=High
  status: number; // 0=Normal/Active, 2=Completed
  completedTime?: string;
  sortOrder: number;
  items?: ChecklistItem[];
  parentId?: string;
}

export interface Project {
  id: string;
  name: string;
  color?: string;
  sortOrder: number;
  closed?: boolean;
  groupId?: string;
  viewMode?: string; // "list" | "kanban" | "timeline"
  permission?: string;
  kind?: string; // "TASK" | "NOTE"
}

export interface ProjectData {
  project: Project;
  tasks: Task[];
  columns?: unknown[];
}

export interface CreateTaskInput {
  title: string;
  projectId: string;
  content?: string;
  startDate?: string;
  dueDate?: string;
  priority?: number;
  parentId?: string;
}

export interface UpdateTaskInput {
  taskId: string;
  projectId: string;
  title?: string;
  content?: string;
  startDate?: string;
  dueDate?: string;
  priority?: number;
}

export interface CreateProjectInput {
  name: string;
  color?: string;
  viewMode?: string;
  kind?: string;
}

export interface BatchTaskInput {
  title: string;
  projectId: string;
  content?: string;
  startDate?: string;
  dueDate?: string;
  priority?: number;
}
