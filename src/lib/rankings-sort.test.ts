import { describe, expect, it } from "vitest";
import { sortRankedOpportunities, type RankingSortField } from "./rankings-sort";

const opportunities = [
  { id: "middle", priority_score: 50, excitement: { score: 60, coverage: 40 }, participation: { score: 40, coverage: 50 } },
  { id: "high", priority_score: 80, excitement: { score: 90, coverage: 80 }, participation: { score: 70, coverage: 90 } },
  { id: "low", priority_score: 20, excitement: { score: 30, coverage: 10 }, participation: { score: 20, coverage: 20 } },
  { id: "missing", priority_score: null, excitement: { score: null, coverage: 0 }, participation: { score: null, coverage: 0 } },
];

function sortedIds(field: RankingSortField, direction: "ascending" | "descending") {
  return sortRankedOpportunities(opportunities, field, direction).map(opportunity => opportunity.id);
}

describe("sortRankedOpportunities", () => {
  it.each([
    ["priority", "descending", ["high", "middle", "low", "missing"]],
    ["priority", "ascending", ["low", "middle", "high", "missing"]],
    ["excitement", "descending", ["high", "middle", "low", "missing"]],
    ["excitement", "ascending", ["low", "middle", "high", "missing"]],
    ["participation", "descending", ["high", "middle", "low", "missing"]],
    ["participation", "ascending", ["low", "middle", "high", "missing"]],
    ["coverage", "descending", ["high", "middle", "low", "missing"]],
    ["coverage", "ascending", ["missing", "low", "middle", "high"]],
  ] as const)("sorts %s %s", (field, direction, expected) => {
    expect(sortedIds(field, direction)).toEqual(expected);
  });
});
