import { z } from "zod";

export const sourceRowSchema = z.object({
  source_row: z.number().int().positive(),
  source_rank: z.number().int().positive(),
  company: z.string().trim().min(1),
  robots: z.string(),
  country: z.string(),
});

export type SourceRow = z.infer<typeof sourceRowSchema>;

export const normalizeName = (value: string) =>
  value.normalize("NFKC").trim().toLocaleLowerCase("en").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

const countries: Record<string, string> = {
  USA: "US", IND: "IN", KOR: "KR", TWN: "TW", CHN: "CN", GER: "DE",
  CHE: "CH", JPN: "JP", TUR: "TR", AUS: "AU", DNK: "DK", RUS: "RU",
  FRA: "FR", GR: "GR", UK: "GB", POL: "PL", ITA: "IT", CZE: "CZ",
  AUT: "AT", CAN: "CA", ESP: "ES", UAE: "AE", SGP: "SG", ISR: "IL",
  NOR: "NO", HUN: "HU", SAU: "SA", VNM: "VN",
};
export function countryCode(source: string): string | null {
  return countries[source.trim().toUpperCase()] ?? null;
}

export function parseRobotNames(raw: string): { names: string[]; warning: string | null } {
  const text = raw.trim();
  if (!text) return { names: [], warning: null };
  const parts = text.split(",").map((value) => value.trim()).filter(Boolean);
  const uncertain = parts.some((part) =>
    /^\d+(?:\.\d+)?$/.test(part) ||
    /\betc\.?\b/i.test(part) ||
    (parts.length > 1 && part.length < 2)
  ) || text.includes(";") || text.includes("/");
  if (uncertain) return { names: [], warning: "Ambiguous combined robot names; manual review required" };
  return { names: [...new Map(parts.map((part) => [normalizeName(part), part])).values()], warning: null };
}

export function previewImport(rows: SourceRow[], existingVendors = new Set<string>(), existingRobots = new Set<string>()) {
  const seenVendors = new Set(existingVendors);
  const seenRobots = new Set(existingRobots);
  const warnings: { source_row: number; company: string; warning: string }[] = [];
  let insertedVendors = 0, updatedVendors = 0, insertedRobots = 0, skipped = 0;
  for (const row of rows) {
    const vendorKey = normalizeName(row.company);
    if (!countryCode(row.country)) warnings.push({ source_row: row.source_row, company: row.company, warning: "Unknown country code" });
    if (seenVendors.has(vendorKey)) updatedVendors++;
    else { seenVendors.add(vendorKey); insertedVendors++; }
    const parsed = parseRobotNames(row.robots);
    if (parsed.warning) warnings.push({ source_row: row.source_row, company: row.company, warning: parsed.warning });
    for (const name of parsed.names) {
      const key = vendorKey + ":" + normalizeName(name);
      if (seenRobots.has(key)) skipped++;
      else { seenRobots.add(key); insertedRobots++; }
    }
  }
  return { insertedVendors, updatedVendors, insertedRobots, skipped, warnings };
}
