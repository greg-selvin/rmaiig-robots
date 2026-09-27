export type RankingSortField = "priority" | "excitement" | "participation" | "coverage";

type RankedOpportunity = {
  priority_score: number | null;
  excitement: { score: number | null; coverage: number };
  participation: { score: number | null; coverage: number };
};

export function sortRankedOpportunities<T extends RankedOpportunity>(
  opportunities: T[],
  field: RankingSortField,
  direction: "ascending" | "descending",
): T[] {
  const scoreFor = (opportunity: T) => {
    if (field === "priority") return opportunity.priority_score;
    if (field === "excitement") return opportunity.excitement.score;
    if (field === "participation") return opportunity.participation.score;
    return opportunity.excitement.coverage + opportunity.participation.coverage;
  };

  return [...opportunities].sort((left, right) => {
    const leftScore = scoreFor(left);
    const rightScore = scoreFor(right);
    if (leftScore === null) return rightScore === null ? 0 : 1;
    if (rightScore === null) return -1;
    return direction === "ascending" ? leftScore - rightScore : rightScore - leftScore;
  });
}
