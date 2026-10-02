export type DistributorVendorLink = { distributor_id: string; vendor_id: string };
export type DistributorOutreachRecord = { distributor_id: string; meetup_id: string | null; meetup_name_snapshot?: string | null };

export function linkedRobots<T extends { vendor_id: string; vendor_ids?: string[] }>(robots: T[], links: DistributorVendorLink[], distributorId: string): T[] {
  const vendorIds = new Set(links.filter(link => link.distributor_id === distributorId).map(link => link.vendor_id));
  return robots.filter(robot => (robot.vendor_ids || [robot.vendor_id]).some(vendorId => vendorIds.has(vendorId)));
}

export function currentDistributorOutreach<T extends DistributorOutreachRecord>(outreach: T[], distributorId: string, meetupId: string): T | undefined {
  return outreach.find(record => record.distributor_id === distributorId && record.meetup_id === (meetupId || null) && (meetupId || !record.meetup_name_snapshot));
}
