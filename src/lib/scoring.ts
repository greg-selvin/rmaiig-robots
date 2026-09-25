export type Rating = { criterion_key: string; ai_rating: number | null; manual_rating: number | null };
export type Criterion = { criterion_key: string; weight: number };

export function validateWeights(criteria: Criterion[]): boolean {
  return criteria.length > 0 &&
    criteria.every(({ weight }) => Number.isInteger(weight) && weight >= 0 && weight <= 100) &&
    criteria.reduce((sum, criterion) => sum + criterion.weight, 0) === 100;
}
export function effectiveRating(rating: Rating | undefined): number | null {
  return rating?.manual_rating ?? rating?.ai_rating ?? null;
}
export function calculateScore(criteria: Criterion[], ratings: Rating[], threshold = 60) {
  if (!validateWeights(criteria)) throw new Error("Criterion weights must total 100%");
  const byKey = new Map(ratings.map((rating) => [rating.criterion_key, rating]));
  let availableWeight = 0, weightedRating = 0;
  for (const criterion of criteria) {
    const rating = effectiveRating(byKey.get(criterion.criterion_key));
    if (rating === null) continue;
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error("Rating must be 1–5");
    availableWeight += criterion.weight;
    weightedRating += criterion.weight * rating / 5;
  }
  const score = availableWeight === 0 ? null : Math.round(10000 * weightedRating / availableWeight) / 100;
  return { score, coverage: availableWeight, eligible: availableWeight >= threshold, provisional: availableWeight < threshold };
}
export function priorityScore(excitement: ReturnType<typeof calculateScore>, participation: ReturnType<typeof calculateScore>) {
  return excitement.eligible && participation.eligible && excitement.score !== null && participation.score !== null
    ? Math.round(excitement.score * participation.score) / 100
    : null;
}
export function topVendorOpportunity<T extends { vendor_id: string; priority_score: number | null }>(opportunities: T[]): T[] {
  const result = new Map<string, T>();
  for (const opportunity of opportunities) {
    const prior = result.get(opportunity.vendor_id);
    if (!prior || (opportunity.priority_score ?? -1) > (prior.priority_score ?? -1)) result.set(opportunity.vendor_id, opportunity);
  }
  return [...result.values()].sort((a,b) => (b.priority_score ?? -1) - (a.priority_score ?? -1));
}
