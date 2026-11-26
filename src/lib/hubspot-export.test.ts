import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse } from "csv-parse/sync";
import { describe, expect, it } from "vitest";
import { buildHubspotExport, csvText, type ExportData } from "./hubspot-export";
import { hubspotExportSchema, exportCategoryKeys } from "./hubspot-export-options";
import { exportZip } from "./export-zip";

const options = hubspotExportSchema.parse({ categories: exportCategoryKeys, stageMapping: { s1: "Qualified to buy" } });
const data: ExportData = {
  vendors: [{ id: "v1", name: "Robot, Inc.", description: 'A "robot" company\nSecond line', website_url: "https://example.com" }, { id: "v2", name: "Partner" }],
  organization_roles: [{ organization_id: "v1", role_key: "vendor" }, { organization_id: "v1", role_key: "distributor" }],
  robots: [{ id: "r1", name: "Shared robot", vendor_id: "v1", is_disqualified: true }],
  robot_company_links: [{ robot_id: "r1", vendor_id: "v2" }],
  opportunities: [{ id: "o1", vendor_id: "v1", robot_id: "r1", meetup_id: "m1", stage_id: "s1", next_action: "Call", next_action_date: "2026-11-30" }],
  distributor_outreach: [{ id: "d1", distributor_id: "v2", stage_id: "old", stage_name_snapshot: "Archived stage" }],
  meetups: [{ id: "m1", name: "Boulder", description: "Meetup details" }, { id: "m2", name: "Unlinked Meetup" }],
  pipeline_stages: [{ id: "s1", name: "Research" }],
  contacts: [{ id: "c1", name: "Ada Example", business_email: "ada@example.com", vendor_id: "v1", preferred: true, notes: "Primary contact" }, { id: "c2", name: "No email", vendor_id: "v1" }, { id: "c3", name: "Shared address", business_email: "ada@example.com", vendor_id: "v2" }],
  record_notes: [{ id: "n1", robot_id: "r1", body: 'First line\n"quoted", café 🦾 <script>bad</script>', author_name: "Greg", created_at: "2026-10-01T12:30:00Z", follow_up_date: "2026-12-01", follow_up_completed: true }],
  interactions: [{ id: "i1", opportunity_id: "o1", contact_id: "c1", full_notes: "Historical email", interaction_type: "email", occurred_at: "2026-10-02T14:00:00Z", team_member_id: "u1" }],
  distributor_interactions: [{ id: "di1", outreach_id: "d1", full_notes: "Distributor call" }],
  profiles: [{ id: "u1", display_name: "Original author" }],
  stage_history: [{ id: "h1", opportunity_id: "o1", from_stage_name: "New", to_stage_name: "Research", changed_at: "2026-10-02T15:00:00Z" }],
  ratings: [{ id: "rating1", robot_id: "r1", manual_rating: 5, manual_rationale: "Excellent" }],
  email_templates: [{ id: "t1", body: "Template text" }],
};

function exportedRows(result: ReturnType<typeof buildHubspotExport>, prefix: string) {
  return result.files.filter(file => file.name.startsWith(`hubspot/${prefix}`)).flatMap(file => parse(file.content, { columns: true, bom: true }) as Record<string, string>[]);
}

describe("HubSpot basic export", () => {
  it("generates both workflows, stable association IDs, stage mappings, full comments and source attribution", () => {
    const result = buildHubspotExport(data, options, "2026-11-25T12:00:00Z");
    const companies = exportedRows(result, "01");
    expect(companies.find(row => row["Company name"] === "Robot, Inc.")?.Description).toBe(data.vendors[0].description);
    expect(companies.some(row => row["RMAIIG Company ID"] === "rmaiig:workspace-reference")).toBe(true);
    const deals = exportedRows(result, "03");
    expect(deals).toHaveLength(2);
    expect(deals[0]["Deal stage"]).toBe("Qualified to buy");
    expect(deals[1]["Deal stage"]).toBe("Appointment scheduled");
    expect(deals[1]["Deal description"]).toContain("Archived stage");
    expect(exportedRows(result, "04")).toEqual([{ "RMAIIG Contact ID": "rmaiig:contact:c1", "RMAIIG Company ID": "rmaiig:company:v1" }]);
    expect(exportedRows(result, "05-deal").map(row => row["RMAIIG Deal ID"])).toEqual(["rmaiig:opportunities:o1", "rmaiig:distributor_outreach:d1"]);
    expect(exportedRows(result, "05b")).toEqual([{ "RMAIIG Contact ID": "rmaiig:contact:c1", "RMAIIG Deal ID": "rmaiig:opportunities:o1" }]);
    const notes = exportedRows(result, "06");
    const comment = notes.find(row => row["Note body"].includes("record_notes/n1"))!;
    expect(comment["Note body"]).toContain("Greg");
    expect(comment["Note body"]).toContain("café 🦾 &lt;script&gt;bad&lt;/script&gt;");
    expect(comment["Activity date"]).toBe("2026-10-01 12:30:00");
    const interaction = notes.find(row => row["Note body"].includes("interactions/i1"))!;
    expect(interaction["Note body"]).toContain("Original author");
    expect(interaction["RMAIIG Deal ID"]).toBe("rmaiig:opportunities:o1");
    expect(interaction["RMAIIG Contact ID"]).toBe("rmaiig:contact:c1");
    expect(notes.filter(row => row["Note body"].includes("Robot profile: Shared robot"))).toHaveLength(2);
    expect(exportedRows(result, "07").find(row => row["Task notes"].includes("record_notes/n1"))?.["Task status"]).toBe("Completed");
    expect(result.files.find(file => file.name === "archive/record_notes.json")?.content).toContain("<script>bad</script>");
    expect(result.warnings).toHaveLength(2);
  });

  it("includes required company targets while respecting unchecked categories", () => {
    const result = buildHubspotExport(data, { ...options, categories: ["comments"] });
    expect(exportedRows(result, "01").length).toBeGreaterThan(0);
    expect(exportedRows(result, "02")).toEqual([]);
    expect(exportedRows(result, "03")).toEqual([]);
    expect(exportedRows(result, "07")).toEqual([]);
    expect(exportedRows(result, "06").every(row => row["RMAIIG Deal ID"] === "")).toBe(true);
    expect(result.files.some(file => file.name === "archive/email_templates.json")).toBe(false);
    expect(exportedRows(result, "06").some(row => row["Note body"].includes("Robot profile:"))).toBe(false);
  });

  it("splits long unicode comments into numbered notes without losing text", () => {
    const body = "🦾<&\n".repeat(5000);
    const result = buildHubspotExport({ vendors: data.vendors, record_notes: [{ id: "long", vendor_id: "v1", body }] }, { ...options, categories: ["comments"] });
    const notes = exportedRows(result, "06").filter(row => row["Note body"].includes("record_notes/long"));
    expect(notes.length).toBeGreaterThan(1);
    expect(notes.every(row => row["Note body"].length < 65536)).toBe(true);
    expect(notes.every(row => !row["Note body"].includes("\ufffd"))).toBe(true);
    expect(result.files.find(file => file.name === "archive/record_notes.json")?.content).toBe(JSON.stringify([{ id: "long", vendor_id: "v1", body }], null, 2));
  });

  it("does not suppress distinct follow-ups just because the dates match", () => {
    const result = buildHubspotExport({ ...data, record_notes: [{ id: "legacy", vendor_id: "v1", is_legacy: true, author_name: "Imported from Outreach", body: "A different action", follow_up_date: "2026-11-30" }] }, options);
    expect(exportedRows(result, "07")).toHaveLength(2);
  });

  it("suppresses only an exactly reproduced legacy outreach follow-up", () => {
    const result = buildHubspotExport({ ...data, record_notes: [{ id: "legacy", vendor_id: "v1", is_legacy: true, author_name: "Imported from Outreach", body: "Outreach history: Boulder · Shared robot\nNext action: Call\nNext action due: 2026-11-30", follow_up_date: "2026-11-30", follow_up_completed: true }] }, options);
    expect(exportedRows(result, "07")).toHaveLength(1);
    expect(exportedRows(result, "07")[0]["Task status"]).toBe("Completed");
    expect(result.warnings.some(row => String(row[2]).includes("Exact legacy"))).toBe(true);
  });

  it("quotes multiline CSV and neutralizes spreadsheet formulas", () => {
    const rows = parse(csvText(["Value"], [['=HYPERLINK("bad")'], ["\t+cmd"], ['Café, "robot"\nline']]), { columns: true, bom: true });
    expect(rows).toEqual([{ Value: '\'=HYPERLINK("bad")' }, { Value: "'\t+cmd" }, { Value: 'Café, "robot"\nline' }]);
  });

  it("produces a ZIP that independent Python tooling can read and CRC-verify", () => {
    const directory = mkdtempSync(join(tmpdir(), "hubspot-zip-test-"));
    try {
      const path = join(directory, "export.zip");
      writeFileSync(path, exportZip([{ name: "notes/café.csv", content: "🦾,line\r\n" }, { name: "START-HERE.txt", content: "Instructions" }]));
      execFileSync("python3", ["-c", "import zipfile,sys; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; assert z.read('notes/café.csv').decode('utf-8') == '🦾,line\\r\\n'; z.extract('START-HERE.txt',sys.argv[2])", path, directory]);
      expect(readFileSync(join(directory, "START-HERE.txt"), "utf8")).toBe("Instructions");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
