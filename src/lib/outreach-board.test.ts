import { describe, expect, it } from "vitest";
import { clampOutreachPanelWidth, groupVendorOutreach, vendorDetailsSelection } from "./outreach-board";

describe("groupVendorOutreach", () => {
  it("creates one vendor card with all robot opportunities and the most advanced stage", () => {
    const cards = groupVendorOutreach([
      { id: "opp-1", vendor_id: "vendor-1", stage_id: "research", vendor: { name: "Robotics Co" } },
      { id: "opp-2", vendor_id: "vendor-1", stage_id: "contacted", vendor: { name: "Robotics Co" } },
      { id: "opp-3", vendor_id: "vendor-2", stage_id: "research", vendor: { name: "Other Co" } },
    ], [{ id: "research", position: 1 }, { id: "contacted", position: 2 }], [{ vendor_id: "vendor-1", follow_up_date: "2026-10-01" }]);

    expect(cards).toHaveLength(2);
    expect(cards[0]).toMatchObject({ id: "vendor-1", stage: { id: "contacted" }, robots: [{ id: "opp-1" }, { id: "opp-2" }], notes: [{ follow_up_date: "2026-10-01" }] });
  });

  it("opens Vendor details using the grouped card ID", () => {
    const [card] = groupVendorOutreach([
      { id: "opp-1", vendor_id: "vendor-1", stage_id: "research", vendor: { name: "Robotics Co" } },
    ], [{ id: "research", position: 1 }], []);

    expect(vendorDetailsSelection(card)).toEqual({ kind: "vendor", id: "vendor-1" });
  });

  it("keeps the resizable panel within its supported width", () => {
    expect(clampOutreachPanelWidth(200)).toBe(280);
    expect(clampOutreachPanelWidth(420)).toBe(420);
    expect(clampOutreachPanelWidth(800)).toBe(640);
  });
});
