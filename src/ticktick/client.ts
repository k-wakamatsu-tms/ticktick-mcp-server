import type {
  Project,
  ProjectData,
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  CreateProjectInput,
} from "./types.js";

const BASE_URL = "https://api.ticktick.com/open/v1";

export class TickTickClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${BASE_URL}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
    };

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`TickTick API error ${res.status}: ${text}`);
    }

    if (res.status === 204) {
      return {} as T;
    }

    const text = await res.text();
    if (!text) {
      return {} as T;
    }
    return JSON.parse(text) as T;
  }

  // --- Projects ---

  async getProjects(): Promise<Project[]> {
    return this.request<Project[]>("GET", "/project");
  }

  async getProject(projectId: string): Promise<Project> {
    return this.request<Project>("GET", `/project/${projectId}`);
  }

  async getProjectWithData(projectId: string): Promise<ProjectData> {
    return this.request<ProjectData>("GET", `/project/${projectId}/data`);
  }

  async createProject(input: CreateProjectInput): Promise<Project> {
    return this.request<Project>("POST", "/project", {
      name: input.name,
      color: input.color,
      viewMode: input.viewMode,
      kind: input.kind,
    });
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.request<unknown>("DELETE", `/project/${projectId}`);
  }

  // --- Tasks ---

  async getTask(projectId: string, taskId: string): Promise<Task> {
    return this.request<Task>(
      "GET",
      `/project/${projectId}/task/${taskId}`,
    );
  }

  async createTask(input: CreateTaskInput): Promise<Task> {
    const body: Record<string, unknown> = {
      title: input.title,
      projectId: input.projectId,
    };
    if (input.content !== undefined) body.content = input.content;
    if (input.startDate !== undefined) body.startDate = input.startDate;
    if (input.dueDate !== undefined) body.dueDate = input.dueDate;
    if (input.priority !== undefined) body.priority = input.priority;
    if (input.parentId !== undefined) body.parentId = input.parentId;
    return this.request<Task>("POST", "/task", body);
  }

  async updateTask(input: UpdateTaskInput): Promise<Task> {
    const body: Record<string, unknown> = {
      projectId: input.projectId,
    };
    if (input.title !== undefined) body.title = input.title;
    if (input.content !== undefined) body.content = input.content;
    if (input.startDate !== undefined) body.startDate = input.startDate;
    if (input.dueDate !== undefined) body.dueDate = input.dueDate;
    if (input.priority !== undefined) body.priority = input.priority;
    return this.request<Task>("POST", `/task/${input.taskId}`, body);
  }

  async completeTask(projectId: string, taskId: string): Promise<void> {
    await this.request<unknown>(
      "POST",
      `/project/${projectId}/task/${taskId}/complete`,
    );
  }

  async deleteTask(projectId: string, taskId: string): Promise<void> {
    await this.request<unknown>(
      "DELETE",
      `/project/${projectId}/task/${taskId}`,
    );
  }
}
