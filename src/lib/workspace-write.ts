import type { Database } from "./database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function saveWorkspaceRecord(
  db: SupabaseClient<Database>,
  table: string,
  record: Record<string, unknown>,
  workspaceId: string,
) {
  const values = { ...record };
  const id = values.id;
  delete values.id;
  delete values.workspace_id;
  if (typeof id === "string" && id.length > 0) {
    return db.from(table as "vendors").update(values as never).eq("id", id).eq("workspace_id", workspaceId);
  }
  return db.from(table as "vendors").insert({ ...values, workspace_id: workspaceId } as never);
}
