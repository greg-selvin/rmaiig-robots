import { describe, expect, it } from "vitest";
import { countryCode, countryLabel, countryName, countryRecord, isUsCountry, stateCode } from "./geo-codes";

describe("geographic code helpers", () => {
  it("resolves alpha-2, alpha-3, common aliases, and country names", () => {
    expect(countryCode("us")).toBe("USA");
    expect(countryCode("GBR")).toBe("GBR");
    expect(countryCode("UK")).toBe("GBR");
    expect(countryCode("GER")).toBe("DEU");
    expect(countryCode("United States of America")).toBe("USA");
    expect(countryCode("Cote d'Ivoire")).toBe("CIV");
    expect(countryCode("not a country")).toBeNull();
    expect(countryCode(null)).toBeNull();
  });

  it("returns consistent records, labels, and US checks", () => {
    expect(countryRecord("CAN")).toEqual({ name: "Canada", alpha2: "CA", alpha3: "CAN" });
    expect(countryName("MX")).toBe("Mexico");
    expect(countryLabel("DE")).toBe("Germany (DEU)");
    expect(countryLabel("Atlantis")).toBe("Atlantis");
    expect(isUsCountry("US")).toBe(true);
    expect(isUsCountry("CAN")).toBe(false);
  });

  it("normalizes US state codes and rejects unknown values", () => {
    expect(stateCode("co")).toBe("CO");
    expect(stateCode("US-CA")).toBe("CA");
    expect(stateCode("XX")).toBeNull();
    expect(stateCode(null)).toBeNull();
  });
});
