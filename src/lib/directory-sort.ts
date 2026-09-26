export type SortDirection = "ascending" | "descending";

export function sortDirectoryRows<T>(rows: T[], valueFor: (row: T) => string | null | undefined, direction: SortDirection): T[] {
  const multiplier = direction === "ascending" ? 1 : -1;
  return [...rows].sort((left, right) => {
    const leftValue = (valueFor(left) || "").trim();
    const rightValue = (valueFor(right) || "").trim();
    return leftValue.localeCompare(rightValue, undefined, { sensitivity: "base", numeric: true }) * multiplier;
  });
}
