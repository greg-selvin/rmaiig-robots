import { describe, expect, it } from "vitest";
import { parseJsonImport } from "./json-import";

const minimal = (vendor: Record<string, unknown> = {}) => JSON.stringify({
  format: "rmaiig-robots-import/v1",
  vendors: [{ name: "Example Robotics", ...vendor }],
});

describe("versioned JSON imports", () => {
  it("accepts vendors with empty or omitted contacts and keeps arrays omitted when absent", () => {
    expect(parseJsonImport(minimal({ contacts: [] })).vendors[0].contacts).toEqual([]);
    expect(parseJsonImport(minimal()).vendors[0].contacts).toBeUndefined();
  });

  it("normalizes valid country codes and rejects unknown codes", () => {
    expect(parseJsonImport(minimal({ iso_country_code: "US" })).vendors[0].iso_country_code).toBe("USA");
    expect(() => parseJsonImport(minimal({ iso_country_code: "ZZZ" }))).toThrow(/known ISO/);
  });

  it("requires reachable contact details when contact records are supplied", () => {
    expect(() => parseJsonImport(minimal({ contacts: [{ name: "No route" }] }))).toThrow(/Contact needs an email/);
    expect(parseJsonImport(minimal({ contacts: [{ contact_form_url: "https://example.com/contact" }] })).vendors[0].contacts).toHaveLength(1);
  });

  it("rejects unknown properties, malformed JSON, and unsupported formats", () => {
    expect(() => parseJsonImport("{" )).toThrow("Invalid JSON file");
    expect(() => parseJsonImport(minimal({ surprise: true }))).toThrow(/Unrecognized key/);
    expect(() => parseJsonImport(JSON.stringify({ format: "v2", vendors: [{ name: "Example" }] }))).toThrow(/Invalid JSON import/);
  });

  it("requires meetup identity for participation ratings", () => {
    const invalid = { robots: [{ name: "R1", participation: [{ criterion_key: "meetup_fit" }] }] };
    expect(() => parseJsonImport(minimal(invalid))).toThrow(/meetup_id or meetup_name/);
    const valid = { robots: [{ name: "R1", participation: [{ criterion_key: "meetup_fit", meetup_name: "Boulder Meetup" }] }] };
    expect(parseJsonImport(minimal(valid)).vendors[0].robots?.[0].participation?.[0].meetup_name).toBe("Boulder Meetup");
  });
});
