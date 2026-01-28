import { describe, it, expect } from "vitest";
import {
  formatTask,
  formatTaskList,
  formatProject,
  formatProjectList,
} from "../src/ticktick/formatters.js";
import type { Task, Project } from "../src/ticktick/types.js";

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task_1",
    projectId: "proj_1",
    title: "Test Task",
    priority: 0,
    status: 0,
    sortOrder: 0,
    ...overrides,
  };
}

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "proj_1",
    name: "Test Project",
    sortOrder: 0,
    ...overrides,
  };
}

describe("formatTask", () => {
  it("formats a minimal task", () => {
    const result = formatTask(makeTask());
    expect(result).toContain("Title: Test Task");
    expect(result).toContain("ID: task_1");
    expect(result).toContain("Project ID: proj_1");
    expect(result).toContain("Priority: None");
    expect(result).toContain("Status: Active");
  });

  it("maps priority labels correctly", () => {
    expect(formatTask(makeTask({ priority: 1 }))).toContain("Priority: Low");
    expect(formatTask(makeTask({ priority: 3 }))).toContain("Priority: Medium");
    expect(formatTask(makeTask({ priority: 5 }))).toContain("Priority: High");
  });

  it("maps status labels correctly", () => {
    expect(formatTask(makeTask({ status: 0 }))).toContain("Status: Active");
    expect(formatTask(makeTask({ status: 2 }))).toContain("Status: Completed");
  });

  it("falls back to numeric value for unknown priority", () => {
    expect(formatTask(makeTask({ priority: 99 }))).toContain("Priority: 99");
  });

  it("falls back to numeric value for unknown status", () => {
    expect(formatTask(makeTask({ status: 99 as any }))).toContain("Status: 99");
  });

  it("includes optional fields when present", () => {
    const task = makeTask({
      content: "Some description",
      dueDate: "2026-02-01T00:00:00Z",
      startDate: "2026-01-28T00:00:00Z",
      parentId: "parent_1",
    });
    const result = formatTask(task);
    expect(result).toContain("Content: Some description");
    expect(result).toContain("Due: 2026-02-01T00:00:00Z");
    expect(result).toContain("Start: 2026-01-28T00:00:00Z");
    expect(result).toContain("Parent ID: parent_1");
  });

  it("excludes optional fields when absent", () => {
    const result = formatTask(makeTask());
    expect(result).not.toContain("Content:");
    expect(result).not.toContain("Due:");
    expect(result).not.toContain("Start:");
    expect(result).not.toContain("Parent ID:");
    expect(result).not.toContain("Checklist:");
  });

  it("formats checklist items", () => {
    const task = makeTask({
      items: [
        { id: "i1", title: "Item done", status: 1, sortOrder: 0 },
        { id: "i2", title: "Item pending", status: 0, sortOrder: 1 },
      ],
    });
    const result = formatTask(task);
    expect(result).toContain("Checklist:");
    expect(result).toContain("[x] Item done");
    expect(result).toContain("[ ] Item pending");
  });

  it("does not show checklist for empty items array", () => {
    const task = makeTask({ items: [] });
    const result = formatTask(task);
    expect(result).not.toContain("Checklist:");
  });
});

describe("formatTaskList", () => {
  it("returns message when no tasks", () => {
    expect(formatTaskList([])).toBe("No tasks found.");
  });

  it("formats single task without separator", () => {
    const result = formatTaskList([makeTask()]);
    expect(result).toContain("Title: Test Task");
    expect(result).not.toContain("---");
  });

  it("separates multiple tasks with ---", () => {
    const tasks = [
      makeTask({ id: "t1", title: "Task 1" }),
      makeTask({ id: "t2", title: "Task 2" }),
    ];
    const result = formatTaskList(tasks);
    expect(result).toContain("Title: Task 1");
    expect(result).toContain("Title: Task 2");
    expect(result).toContain("---");
  });
});

describe("formatProject", () => {
  it("formats a minimal project", () => {
    const result = formatProject(makeProject());
    expect(result).toContain("Name: Test Project");
    expect(result).toContain("ID: proj_1");
  });

  it("includes optional fields when present", () => {
    const project = makeProject({
      color: "#F18181",
      viewMode: "kanban",
      kind: "TASK",
      closed: true,
    });
    const result = formatProject(project);
    expect(result).toContain("Color: #F18181");
    expect(result).toContain("View Mode: kanban");
    expect(result).toContain("Kind: TASK");
    expect(result).toContain("Closed: true");
  });

  it("excludes optional fields when absent", () => {
    const result = formatProject(makeProject());
    expect(result).not.toContain("Color:");
    expect(result).not.toContain("View Mode:");
    expect(result).not.toContain("Kind:");
    expect(result).not.toContain("Closed:");
  });
});

describe("formatProjectList", () => {
  it("returns message when no projects", () => {
    expect(formatProjectList([])).toBe("No projects found.");
  });

  it("formats multiple projects with separator", () => {
    const projects = [
      makeProject({ id: "p1", name: "Project 1" }),
      makeProject({ id: "p2", name: "Project 2" }),
    ];
    const result = formatProjectList(projects);
    expect(result).toContain("Name: Project 1");
    expect(result).toContain("Name: Project 2");
    expect(result).toContain("---");
  });
});
