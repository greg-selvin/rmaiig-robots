export type StoredOutreachSelection = { kind: "vendor" | "robot"; id: string };

export function outreachUiKey(userId: string, meetupId: string, part: string) {
  return `rmaiig-outreach-ui:${userId}:${meetupId || "none"}:${part}`;
}

export function readOutreachSelection(value: string | null): StoredOutreachSelection | null {
  if (!value) return null;
  try {
    const selection: unknown = JSON.parse(value);
    if (selection && typeof selection === "object" && "kind" in selection && "id" in selection && (selection.kind === "vendor" || selection.kind === "robot") && typeof selection.id === "string" && selection.id) return { kind: selection.kind, id: selection.id };
  } catch {}
  return null;
}
