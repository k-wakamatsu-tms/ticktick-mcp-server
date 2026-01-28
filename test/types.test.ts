import { describe, it, expectTypeOf } from "vitest";
import type {
  Task,
  Project,
  CreateTaskInput,
  UpdateTaskInput,
  CreateProjectInput,
  BatchTaskInput,
  ChecklistItem,
  ProjectData,
} from "../src/ticktick/types.js";

describe("Type definitions", () => {
  it("Task has required fields", () => {
    expectTypeOf<Task>().toHaveProperty("id");
    expectTypeOf<Task>().toHaveProperty("projectId");
    expectTypeOf<Task>().toHaveProperty("title");
    expectTypeOf<Task>().toHaveProperty("priority");
    expectTypeOf<Task>().toHaveProperty("status");
    expectTypeOf<Task>().toHaveProperty("sortOrder");
  });

  it("Task has optional fields", () => {
    expectTypeOf<Task>().toHaveProperty("content");
    expectTypeOf<Task>().toHaveProperty("dueDate");
    expectTypeOf<Task>().toHaveProperty("startDate");
    expectTypeOf<Task>().toHaveProperty("items");
    expectTypeOf<Task>().toHaveProperty("parentId");
  });

  it("Project has required fields", () => {
    expectTypeOf<Project>().toHaveProperty("id");
    expectTypeOf<Project>().toHaveProperty("name");
    expectTypeOf<Project>().toHaveProperty("sortOrder");
  });

  it("CreateTaskInput requires title and projectId", () => {
    expectTypeOf<CreateTaskInput>().toHaveProperty("title");
    expectTypeOf<CreateTaskInput>().toHaveProperty("projectId");
  });

  it("UpdateTaskInput requires taskId and projectId", () => {
    expectTypeOf<UpdateTaskInput>().toHaveProperty("taskId");
    expectTypeOf<UpdateTaskInput>().toHaveProperty("projectId");
  });

  it("ProjectData contains project and tasks", () => {
    expectTypeOf<ProjectData>().toHaveProperty("project");
    expectTypeOf<ProjectData>().toHaveProperty("tasks");
  });

  it("ChecklistItem has id, title, status, sortOrder", () => {
    expectTypeOf<ChecklistItem>().toHaveProperty("id");
    expectTypeOf<ChecklistItem>().toHaveProperty("title");
    expectTypeOf<ChecklistItem>().toHaveProperty("status");
    expectTypeOf<ChecklistItem>().toHaveProperty("sortOrder");
  });

  it("BatchTaskInput requires title and projectId", () => {
    expectTypeOf<BatchTaskInput>().toHaveProperty("title");
    expectTypeOf<BatchTaskInput>().toHaveProperty("projectId");
  });
});
