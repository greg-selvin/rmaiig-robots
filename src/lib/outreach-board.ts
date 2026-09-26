export type OutreachStage = { id: string; position: number };
export type OutreachNote = { vendor_id: string | null; follow_up_date: string | null };

export function groupVendorOutreach<T extends { id: string; vendor_id: string; stage_id: string | null; vendor: unknown }>(opportunities: T[], stages: OutreachStage[], notes: OutreachNote[]) {
  const groups = new Map<string, T[]>();
  for (const opportunity of opportunities) groups.set(opportunity.vendor_id, [...(groups.get(opportunity.vendor_id) || []), opportunity]);
  return [...groups.entries()].map(([vendorId, robots]) => ({
    id: vendorId,
    vendor: robots[0].vendor,
    robots,
    stage: robots.map(robot => stages.find(stage => stage.id === robot.stage_id)).filter((stage): stage is OutreachStage => Boolean(stage)).sort((left, right) => right.position - left.position)[0],
    notes: notes.filter(note => note.vendor_id === vendorId),
  }));
}
