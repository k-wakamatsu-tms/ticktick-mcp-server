import { describe, it, expect, vi, beforeEach } from "vitest";
import { TickTickClient } from "../src/ticktick/client.js";

const BASE_URL = "https://api.ticktick.com/open/v1";
const TOKEN = "test_access_token";

function mockFetch(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
    json: () => Promise.resolve(body),
  });
}

function mockFetchNoContent() {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 204,
    text: () => Promise.resolve(""),
  });
}

function mockFetchError(status: number, text: string) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    text: () => Promise.resolve(text),
  });
}

describe("TickTickClient", () => {
  let client: TickTickClient;

  beforeEach(() => {
    client = new TickTickClient(TOKEN);
  });

  describe("request basics", () => {
    it("sends correct Authorization header", async () => {
      const fetchSpy = mockFetch([]);
      vi.stubGlobal("fetch", fetchSpy);

      await client.getProjects();

      expect(fetchSpy).toHaveBeenCalledWith(
        `${BASE_URL}/project`,
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            Authorization: `Bearer ${TOKEN}`,
            "Content-Type": "application/json",
          }),
        }),
      );
    });

    it("throws on non-ok response", async () => {
      vi.stubGlobal("fetch", mockFetchError(401, "Unauthorized"));

      await expect(client.getProjects()).rejects.toThrow(
        "TickTick API error 401: Unauthorized",
      );
    });

    it("handles 204 No Content", async () => {
      vi.stubGlobal("fetch", mockFetchNoContent());

      const result = await client.deleteProject("proj_1");
      expect(result).toBeUndefined();
    });

    it("handles empty text response", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          text: () => Promise.resolve(""),
        }),
      );

      const result = await client.getProjects();
      expect(result).toEqual({});
    });
  });

  describe("projects", () => {
    it("getProjects calls correct endpoint", async () => {
      const projects = [{ id: "p1", name: "Work" }];
      vi.stubGlobal("fetch", mockFetch(projects));

      const result = await client.getProjects();
      expect(result).toEqual(projects);
    });

    it("getProject calls correct endpoint", async () => {
      const project = { id: "p1", name: "Work" };
      const fetchSpy = mockFetch(project);
      vi.stubGlobal("fetch", fetchSpy);

      const result = await client.getProject("p1");
      expect(result).toEqual(project);
      expect(fetchSpy).toHaveBeenCalledWith(
        `${BASE_URL}/project/p1`,
        expect.anything(),
      );
    });

    it("getProjectWithData calls /data endpoint", async () => {
      const data = { project: { id: "p1" }, tasks: [] };
      const fetchSpy = mockFetch(data);
      vi.stubGlobal("fetch", fetchSpy);

      const result = await client.getProjectWithData("p1");
      expect(result).toEqual(data);
      expect(fetchSpy).toHaveBeenCalledWith(
        `${BASE_URL}/project/p1/data`,
        expect.anything(),
      );
    });

    it("createProject sends correct body", async () => {
      const created = { id: "p2", name: "New" };
      const fetchSpy = mockFetch(created);
      vi.stubGlobal("fetch", fetchSpy);

      const result = await client.createProject({
        name: "New",
        color: "#FF0000",
        viewMode: "kanban",
        kind: "TASK",
      });

      expect(result).toEqual(created);
      expect(fetchSpy).toHaveBeenCalledWith(
        `${BASE_URL}/project`,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            name: "New",
            color: "#FF0000",
            viewMode: "kanban",
            kind: "TASK",
          }),
        }),
      );
    });

    it("deleteProject calls DELETE", async () => {
      const fetchSpy = mockFetchNoContent();
      vi.stubGlobal("fetch", fetchSpy);

      await client.deleteProject("p1");
      expect(fetchSpy).toHaveBeenCalledWith(
        `${BASE_URL}/project/p1`,
        expect.objectContaining({ method: "DELETE" }),
      );
    });
  });

  describe("tasks", () => {
    it("getTask calls correct endpoint", async () => {
      const task = { id: "t1", title: "Do thing" };
      const fetchSpy = mockFetch(task);
      vi.stubGlobal("fetch", fetchSpy);

      const result = await client.getTask("p1", "t1");
      expect(result).toEqual(task);
      expect(fetchSpy).toHaveBeenCalledWith(
        `${BASE_URL}/project/p1/task/t1`,
        expect.anything(),
      );
    });

    it("createTask sends required fields only", async () => {
      const task = { id: "t2", title: "New task" };
      const fetchSpy = mockFetch(task);
      vi.stubGlobal("fetch", fetchSpy);

      await client.createTask({ title: "New task", projectId: "p1" });

      expect(fetchSpy).toHaveBeenCalledWith(
        `${BASE_URL}/task`,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ title: "New task", projectId: "p1" }),
        }),
      );
    });

    it("createTask sends all optional fields", async () => {
      const fetchSpy = mockFetch({ id: "t2" });
      vi.stubGlobal("fetch", fetchSpy);

      await client.createTask({
        title: "Full task",
        projectId: "p1",
        content: "Details",
        startDate: "2026-01-28",
        dueDate: "2026-02-01",
        priority: 5,
        parentId: "t1",
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        `${BASE_URL}/task`,
        expect.objectContaining({
          body: JSON.stringify({
            title: "Full task",
            projectId: "p1",
            content: "Details",
            startDate: "2026-01-28",
            dueDate: "2026-02-01",
            priority: 5,
            parentId: "t1",
          }),
        }),
      );
    });

    it("updateTask sends only provided fields", async () => {
      const fetchSpy = mockFetch({ id: "t1" });
      vi.stubGlobal("fetch", fetchSpy);

      await client.updateTask({
        taskId: "t1",
        projectId: "p1",
        title: "Updated",
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        `${BASE_URL}/task/t1`,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ projectId: "p1", title: "Updated" }),
        }),
      );
    });

    it("updateTask omits undefined fields from body", async () => {
      const fetchSpy = mockFetch({ id: "t1" });
      vi.stubGlobal("fetch", fetchSpy);

      await client.updateTask({ taskId: "t1", projectId: "p1" });

      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body).toEqual({ projectId: "p1" });
      expect(body).not.toHaveProperty("title");
      expect(body).not.toHaveProperty("content");
    });

    it("completeTask calls correct endpoint", async () => {
      const fetchSpy = mockFetchNoContent();
      vi.stubGlobal("fetch", fetchSpy);

      await client.completeTask("p1", "t1");
      expect(fetchSpy).toHaveBeenCalledWith(
        `${BASE_URL}/project/p1/task/t1/complete`,
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("deleteTask calls DELETE", async () => {
      const fetchSpy = mockFetchNoContent();
      vi.stubGlobal("fetch", fetchSpy);

      await client.deleteTask("p1", "t1");
      expect(fetchSpy).toHaveBeenCalledWith(
        `${BASE_URL}/project/p1/task/t1`,
        expect.objectContaining({ method: "DELETE" }),
      );
    });
  });
});
