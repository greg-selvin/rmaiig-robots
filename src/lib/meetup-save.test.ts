import { describe, expect, it, vi } from "vitest";
import { saveMeetupAndRefresh } from "./meetup-save";

describe("saveMeetupAndRefresh", () => {
  it("refreshes the Meetup, collapses the editor, and reports success", async () => {
    const events: string[] = [];
    const result = await saveMeetupAndRefresh({
      update: async () => { events.push("update"); },
      refresh: async () => { events.push("refresh"); },
      collapse: () => { events.push("collapse"); },
      onSuccess: () => { events.push("success"); },
      onFailure: vi.fn(),
    });

    expect(result).toBe(true);
    expect(events).toEqual(["update", "refresh", "collapse", "success"]);
  });

  it("reports save errors and keeps the editor open", async () => {
    const collapse = vi.fn();
    const refresh = vi.fn();
    const onFailure = vi.fn();
    const result = await saveMeetupAndRefresh({
      update: async () => { throw new Error("Permission denied"); },
      refresh,
      collapse,
      onSuccess: vi.fn(),
      onFailure,
    });

    expect(result).toBe(false);
    expect(refresh).not.toHaveBeenCalled();
    expect(collapse).not.toHaveBeenCalled();
    expect(onFailure).toHaveBeenCalledWith("Permission denied");
  });
});
