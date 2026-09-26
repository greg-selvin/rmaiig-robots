import { describe, expect, it } from "vitest";
import { parseJsonImport } from "./json-import";
import { previewJsonImport } from "./json-import-plan";

const input = (vendors: unknown[]) => parseJsonImport(JSON.stringify({ format: "rmaiig-robots-import/v1", vendors }));

describe("JSON import preview planning", () => {
  it("counts new records and ratings while allowing empty contacts", () => {
    const plan = previewJsonImport(input([{ name: "New Vendor", contacts: [], robots: [{ name: "New Robot", excitement: [{ criterion_key: "live_impact", ai_rating: 4 }] }] }]), [], []);
    expect(plan).toMatchObject({ insertedVendors: 1, updatedVendors: 0, insertedRobots: 1, updatedRobots: 0, contacts: 0, ratings: 1 });
  });

  it("matches existing vendors and robots by normalized names", () => {
    const plan = previewJsonImport(
      input([{ name: "Example-Vendor", robots: [{ name: "Robot One" }] }]),
      [{ id: "vendor-1", normalized_name: "example vendor" }],
      [{ vendor_id: "vendor-1", normalized_name: "robot one" }],
    );
    expect(plan).toMatchObject({ insertedVendors: 0, updatedVendors: 1, insertedRobots: 0, updatedRobots: 1 });
  });

  it("rejects unknown vendor IDs and duplicate vendors or robots", () => {
    const unknownId = "00000000-0000-4000-8000-000000000001";
    expect(() => previewJsonImport(input([{ id: unknownId, name: "Missing" }]), [], [])).toThrow(`Unknown vendor id ${unknownId}`);
    expect(() => previewJsonImport(input([{ name: "Vendor" }, { name: "vendor" }]), [], [])).toThrow("Duplicate vendor in file");
    expect(() => previewJsonImport(input([{ name: "Vendor", robots: [{ name: "R-1" }, { name: "r 1" }] }]), [], [])).toThrow("Duplicate robot in Vendor");
  });

  it("reports unknown countries and robot IDs that need commit-time validation", () => {
    const plan = previewJsonImport(input([{ name: "Vendor", country: "Atlantis", robots: [{ id: "00000000-0000-4000-8000-000000000002", name: "R1" }] }]), [], []);
    expect(plan.warnings).toEqual([
      "Vendor: country is not mapped to an ISO code",
      "Vendor/R1: robot id lookup requires commit-time validation",
    ]);
  });
});
