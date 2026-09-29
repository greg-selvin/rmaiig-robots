import { describe, expect, it } from "vitest";
import { outreachUiKey, readOutreachSelection } from "./outreach-ui-state";

describe("Outreach view state", () => {
  it("separates cards by user, Meetup, and vendor", () => {
    expect(outreachUiKey("u1", "m1", "card:v1")).not.toBe(outreachUiKey("u2", "m1", "card:v1"));
    expect(outreachUiKey("u1", "m1", "card:v1")).not.toBe(outreachUiKey("u1", "m2", "card:v1"));
    expect(outreachUiKey("u1", "m1", "card:v1")).not.toBe(outreachUiKey("u1", "m1", "card:v2"));
  });

  it("restores valid details and ignores stale storage shapes", () => {
    expect(readOutreachSelection('{"kind":"vendor","id":"v1"}')).toEqual({ kind: "vendor", id: "v1" });
    expect(readOutreachSelection('{"kind":"robot","id":"r1"}')).toEqual({ kind: "robot", id: "r1" });
    expect(readOutreachSelection('{"kind":"other","id":"v1"}')).toBeNull();
    expect(readOutreachSelection("{broken")).toBeNull();
  });
});
