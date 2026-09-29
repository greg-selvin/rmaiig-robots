import { describe, expect, it } from "vitest";
import { countStageUsage, initialPipelineStage } from "./pipeline-stages";

describe("countStageUsage", () => {
  it("counts vendor cards across meetups and every opportunity that blocks stage deletion", () => {
    const usage = countStageUsage(
      [{ id: "research", position: 1 }, { id: "contacted", position: 2 }, { id: "empty", position: 3 }],
      [
        { stage_id: "research", vendor_id: "vendor-1", meetup_id: "meetup-1" },
        { stage_id: "contacted", vendor_id: "vendor-1", meetup_id: "meetup-1" },
        { stage_id: "research", vendor_id: "vendor-1", meetup_id: "meetup-2" },
        { stage_id: "research", vendor_id: "vendor-2", meetup_id: "meetup-1" },
        { stage_id: null, vendor_id: "vendor-3", meetup_id: "meetup-1" },
      ],
      [
        { stage_id: "research", distributor_id: "di-1", meetup_id: "meetup-1" },
        { stage_id: "contacted", distributor_id: "di-1", meetup_id: "meetup-2" },
      ],
    );

    expect(usage).toEqual({
      research: { cards: 3, opportunities: 3, distributors: 1 },
      contacted: { cards: 2, opportunities: 1, distributors: 1 },
      empty: { cards: 0, opportunities: 0, distributors: 0 },
    });
  });
});

describe("initialPipelineStage", () => {
  it("prefers Researching and falls back to the first active stage when Researching is removed", () => {
    const stages = [
      { id: "later", name: "Contacted", position: 3, archived: false },
      { id: "archived", name: "Researching", position: 1, archived: true },
      { id: "first", name: "Planning", position: 2, archived: false },
    ];
    expect(initialPipelineStage(stages)?.id).toBe("first");
    expect(initialPipelineStage([...stages, { id: "research", name: "Researching", position: 4, archived: false }])?.id).toBe("research");
    expect(initialPipelineStage(stages.map(stage => ({ ...stage, archived: true })))).toBeUndefined();
  });
});
