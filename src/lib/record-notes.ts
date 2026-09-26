export type RecordNote = {
  id: string;
  workspace_id: string;
  vendor_id: string | null;
  robot_id: string | null;
  body: string;
  interaction_type: "note" | "email" | "call" | "meeting";
  follow_up_date: string | null;
  created_by: string | null;
  author_name: string;
  created_at: string;
  updated_at: string;
  is_legacy: boolean;
};

export function newestFirstNotes<T extends { id: string; created_at: string }>(notes: T[]): T[] {
  return [...notes].sort((left, right) => right.created_at.localeCompare(left.created_at) || right.id.localeCompare(left.id));
}
