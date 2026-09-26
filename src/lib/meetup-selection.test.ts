import { describe, expect, it } from "vitest";
import { meetupDeleteConfirmation, nextMeetupSelection, opportunitiesForMeetup } from "./meetup-selection";

describe("meetup selection", () => {
  it("keeps a valid selected meetup", () => {
    expect(nextMeetupSelection("meetup-2", [{ id: "meetup-1" }, { id: "meetup-2" }], [])).toBe("meetup-2");
  });

  it("selects unassigned opportunities when a meetup was deleted", () => {
    expect(nextMeetupSelection("deleted-meetup", [{ id: "meetup-1" }], [{ meetup_id: null }])).toBe("");
  });

  it("falls back to the first meetup when no unassigned opportunities remain", () => {
    expect(nextMeetupSelection("deleted-meetup", [{ id: "meetup-1" }], [{ meetup_id: "meetup-1" }])).toBe("meetup-1");
  });

  it("filters unassigned opportunities without dropping their other fields", () => {
    const opportunities = [{ id: "one", meetup_id: null }, { id: "two", meetup_id: "meetup-1" }];
    expect(opportunitiesForMeetup(opportunities, "")).toEqual([{ id: "one", meetup_id: null }]);
    expect(opportunitiesForMeetup(opportunities, "meetup-1")).toEqual([{ id: "two", meetup_id: "meetup-1" }]);
  });

  it("explains that deleting a meetup preserves linked opportunity history", () => {
    expect(meetupDeleteConfirmation("Boulder Meetup", 1)).toBe("Delete Boulder Meetup? 1 linked opportunity and their history will be kept without a Meetup.");
    expect(meetupDeleteConfirmation("Robotics Night", 0)).toBe("Delete Robotics Night? 0 linked opportunities and their history will be kept without a Meetup.");
  });
});
