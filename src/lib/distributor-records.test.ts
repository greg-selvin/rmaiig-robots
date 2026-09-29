import { describe, expect, it } from "vitest";
import { currentDistributorOutreach, linkedRobots } from "./distributor-records";

describe("Distributor / Integrator records", () => {
  it("derives robots from every currently linked Vendor without changing robot ownership", () => {
    const robots = [{ id: "r1", vendor_id: "v1" }, { id: "r2", vendor_id: "v2" }, { id: "r3", vendor_id: "v3" }];
    const links = [{ distributor_id: "di1", vendor_id: "v1" }, { distributor_id: "di1", vendor_id: "v2" }, { distributor_id: "di2", vendor_id: "v3" }];
    expect(linkedRobots(robots, links, "di1").map(robot => robot.id)).toEqual(["r1", "r2"]);
    expect(linkedRobots(robots, links.filter(link => link.vendor_id !== "v1"), "di1").map(robot => robot.id)).toEqual(["r2"]);
    expect(linkedRobots(robots, links, "di3")).toEqual([]);
    expect(robots[0].vendor_id).toBe("v1");
  });

  it("keeps the no Meetup record separate from deleted Meetup history", () => {
    const outreach = [
      { id: "past", distributor_id: "di1", meetup_id: null, meetup_name_snapshot: "Past Meetup" },
      { id: "none", distributor_id: "di1", meetup_id: null, meetup_name_snapshot: null },
      { id: "current", distributor_id: "di1", meetup_id: "meetup1", meetup_name_snapshot: null },
    ];
    expect(currentDistributorOutreach(outreach, "di1", "")?.id).toBe("none");
    expect(currentDistributorOutreach(outreach, "di1", "meetup1")?.id).toBe("current");
  });
});
