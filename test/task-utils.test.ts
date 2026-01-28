import { describe, it, expect } from "vitest";
import { startOfDayUTC, startOfNextDayUTC } from "../src/tools/task-utils.js";

describe("startOfDayUTC", () => {
  it("returns midnight UTC for given date", () => {
    const date = new Date("2024-03-15T14:30:00Z");
    const result = startOfDayUTC(date);
    expect(result.toISOString()).toBe("2024-03-15T00:00:00.000Z");
  });

  it("handles dates near midnight", () => {
    const date = new Date("2024-03-15T23:59:59Z");
    const result = startOfDayUTC(date);
    expect(result.toISOString()).toBe("2024-03-15T00:00:00.000Z");
  });

  it("handles first day of month", () => {
    const date = new Date("2024-03-01T10:00:00Z");
    const result = startOfDayUTC(date);
    expect(result.toISOString()).toBe("2024-03-01T00:00:00.000Z");
  });
});

describe("startOfNextDayUTC", () => {
  it("returns midnight UTC of next day", () => {
    const date = new Date("2024-03-15T14:30:00Z");
    const result = startOfNextDayUTC(date);
    expect(result.toISOString()).toBe("2024-03-16T00:00:00.000Z");
  });

  it("handles end of month", () => {
    const date = new Date("2024-03-31T14:30:00Z");
    const result = startOfNextDayUTC(date);
    expect(result.toISOString()).toBe("2024-04-01T00:00:00.000Z");
  });

  it("handles end of year", () => {
    const date = new Date("2024-12-31T14:30:00Z");
    const result = startOfNextDayUTC(date);
    expect(result.toISOString()).toBe("2025-01-01T00:00:00.000Z");
  });
});
