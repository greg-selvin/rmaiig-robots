import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { exportTables, type ExportData, type ExportRow } from "./hubspot-export";
import type { ExportCategory } from "./hubspot-export-options";

export const exportWorkspaceId = "c02ee290-4f87-4d1f-98c1-24c502126086";
const globalTables = new Set(["organization_types", "ecosystem_roles"]);
const compositeKeys: Record<string, string[]> = {
  organization_roles: ["organization_id", "role_key"],
  robot_company_links: ["robot_id", "vendor_id"],
  distributor_vendor_links: ["distributor_id", "vendor_id"],
  distributor_robot_selections: ["outreach_id", "robot_id"],
  workspace_members: ["user_id"],
  organization_types: ["key"],
  ecosystem_roles: ["key"],
};

export async function readExportData(client: SupabaseClient<Database>, categories: ExportCategory[]) {
  const result: ExportData = {};
  let totalBytes = 0;
  for (const table of exportTables(categories)) {
    const records: ExportRow[] = [];
    let expected: number | null = null;
    for (let offset = 0; ; offset += 200) {
      let query = client.from(table as "vendors").select("*", { count: "exact" });
      if (!globalTables.has(table)) query = query.eq(table === "workspaces" ? "id" : "workspace_id", exportWorkspaceId);
      for (const key of compositeKeys[table] || ["id"]) query = query.order(key, { ascending: true });
      const { data, error, count } = await query.range(offset, offset + 199);
      if (error) throw new Error(`Could not export ${table}: ${error.message}`);
      if (count === null) throw new Error(`Could not verify the ${table} record count`);
      if (expected !== null && count !== expected) throw new Error(`${table} changed during export. Please retry while editing is paused.`);
      expected = count;
      const page = (data || []) as ExportRow[];
      totalBytes += Buffer.byteLength(JSON.stringify(page));
      if (totalBytes > 75_000_000) throw new Error("This selection is too large for one download. Export fewer categories at a time.");
      records.push(...page);
      if (records.length >= expected) break;
      if (page.length !== 200) throw new Error(`The database returned an incomplete ${table} page. No partial ZIP was created.`);
    }
    if (records.length !== expected) throw new Error(`Could not reconcile ${table}. Please retry.`);
    result[table] = records;
  }
  const ids = new Set((result.workspace_members || []).map(row => String(row.user_id)));
  for (const records of Object.values(result)) {
    for (const row of records) {
      for (const key of ["created_by", "team_member_id", "actor_id", "owner_id", "reviewer_id"]) if (row[key]) ids.add(String(row[key]));
      if (Array.isArray(row.collaborator_ids)) for (const id of row.collaborator_ids) ids.add(String(id));
    }
  }
  result.profiles = [];
  const profileIds = [...ids];
  for (let offset = 0; offset < profileIds.length; offset += 100) {
    const { data, error } = await client.from("profiles").select("id,first_name,last_name,display_name").in("id", profileIds.slice(offset, offset + 100));
    if (error) throw new Error("Could not export author names");
    result.profiles.push(...(data || []));
  }
  return result;
}
