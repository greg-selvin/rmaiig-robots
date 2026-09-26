import { countryCode, normalizeName } from "./import";
import type { JsonImport } from "./json-import";

type ExistingVendor = { id: string; normalized_name: string };
type ExistingRobot = { vendor_id: string; normalized_name: string };

export function previewJsonImport(input: JsonImport, vendors: ExistingVendor[], robots: ExistingRobot[]) {
  const vendorById = new Map(vendors.map(vendor => [vendor.id, vendor]));
  const vendorByName = new Map(vendors.map(vendor => [vendor.normalized_name, vendor]));
  const seenVendors = new Set<string>();
  const warnings: string[] = [];
  let insertedVendors = 0, updatedVendors = 0, insertedRobots = 0, updatedRobots = 0, contacts = 0, ratings = 0;

  for (const entry of input.vendors) {
    const match = entry.id ? vendorById.get(entry.id) : vendorByName.get(normalizeName(entry.name));
    if (entry.id && !match) throw new Error(`Unknown vendor id ${entry.id}`);
    const key = match?.id || normalizeName(entry.name);
    if (seenVendors.has(key)) throw new Error(`Duplicate vendor in file: ${entry.name}`);
    seenVendors.add(key);
    if (match) updatedVendors++;
    else insertedVendors++;
    if (!countryCode(entry.country || " ") && !entry.iso_country_code) warnings.push(`${entry.name}: country is not mapped to an ISO code`);
    contacts += entry.contacts?.length || 0;

    const seenRobots = new Set<string>();
    for (const robot of entry.robots || []) {
      const robotKey = normalizeName(robot.name);
      if (seenRobots.has(robotKey)) throw new Error(`Duplicate robot in ${entry.name}: ${robot.name}`);
      seenRobots.add(robotKey);
      const robotMatch = robots.find(existing => existing.vendor_id === match?.id && existing.normalized_name === robotKey);
      if (robot.id && !robotMatch) warnings.push(`${entry.name}/${robot.name}: robot id lookup requires commit-time validation`);
      if (robotMatch) updatedRobots++;
      else insertedRobots++;
      ratings += (robot.excitement || []).length + (robot.participation || []).length;
    }
  }

  return { dryRun: true, insertedVendors, updatedVendors, insertedRobots, updatedRobots, contacts, ratings, warnings };
}
