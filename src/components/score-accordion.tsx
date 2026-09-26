import type { ReactNode } from "react";

export function ScoreAccordion({ title, summary, children }: { title: string; summary: ReactNode; children?: ReactNode }) {
  return <details className="card score-accordion"><summary><b>{title}</b> · {summary}</summary>{children}</details>;
}
