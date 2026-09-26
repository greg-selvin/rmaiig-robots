import { describe, expect, it, vi } from "vitest";
import { resetRankingsFilters } from "./rankings-filters";

describe("resetRankingsFilters", () => {
  it("restores the default ranking view and clears every filter", () => {
    const actions = {
      setRankingTab: vi.fn(),
      setMeetupId: vi.fn(),
      setSearch: vi.fn(),
      setCountry: vi.fn(),
      setState: vi.fn(),
      setSort: vi.fn(),
      setVisibleCount: vi.fn(),
    };

    resetRankingsFilters(actions, "meetup-1");

    expect(actions.setRankingTab).toHaveBeenCalledWith("vendors");
    expect(actions.setMeetupId).toHaveBeenCalledWith("meetup-1");
    expect(actions.setSearch).toHaveBeenCalledWith("");
    expect(actions.setCountry).toHaveBeenCalledWith("");
    expect(actions.setState).toHaveBeenCalledWith("");
    expect(actions.setSort).toHaveBeenCalledWith("priority");
    expect(actions.setVisibleCount).toHaveBeenCalledWith(100);
  });
});
