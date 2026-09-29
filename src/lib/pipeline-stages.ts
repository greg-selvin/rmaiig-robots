export type StageUsage = { cards: number; opportunities: number; distributors: number };

type Stage = { id: string; position: number };
type Opportunity = { stage_id: string | null; vendor_id: string; meetup_id: string | null };
type DistributorOutreach = { stage_id: string | null; distributor_id: string; meetup_id: string | null };

export function countStageUsage(stages: Stage[], opportunities: Opportunity[], distributors: DistributorOutreach[] = []) {
  const usage = Object.fromEntries(stages.map(stage => [stage.id, { cards: 0, opportunities: 0, distributors: 0 }])) as Record<string, StageUsage>;
  const stagesById = new Map(stages.map(stage => [stage.id, stage]));
  const cardsByVendorAndMeetup = new Map<string, Stage>();

  for (const opportunity of opportunities) {
    const stage = opportunity.stage_id ? stagesById.get(opportunity.stage_id) : undefined;
    if (!stage) continue;
    usage[stage.id].opportunities += 1;
    const cardKey = JSON.stringify([opportunity.vendor_id, opportunity.meetup_id]);
    const currentStage = cardsByVendorAndMeetup.get(cardKey);
    if (!currentStage || currentStage.position < stage.position) cardsByVendorAndMeetup.set(cardKey, stage);
  }

  for (const stage of cardsByVendorAndMeetup.values()) usage[stage.id].cards += 1;
  for (const distributor of distributors) {
    const stage = distributor.stage_id ? stagesById.get(distributor.stage_id) : undefined;
    if (!stage) continue;
    usage[stage.id].cards += 1;
    usage[stage.id].distributors += 1;
  }
  return usage;
}

export function initialPipelineStage<T extends { name: string; position: number; archived: boolean }>(stages: T[]) {
  const activeStages = stages.filter(stage => !stage.archived).sort((left, right) => left.position - right.position);
  return activeStages.find(stage => stage.name === "Researching") || activeStages[0];
}
