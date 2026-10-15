import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { normalizeName } from "./import";

export function robotSaveErrorMessage(cause: unknown) {
  if (cause && typeof cause === "object" && "message" in cause && typeof cause.message === "string" && cause.message.trim()) return cause.message;
  return "An unexpected error occurred. Check your connection and try again.";
}

export class ExistingRobotError extends Error {
  constructor(public robotId: string) {
    super("This robot already exists for this vendor. Open its profile, or choose Finish setup to save the selected organization associations and Meetup setup.");
  }
}

export async function createRobot(db: SupabaseClient<Database>, draft: {
  workspaceId: string;
  vendorId: string;
  name: string;
  productUrl: string;
  description: string;
  organizationIds: string[];
  savedRobotId?: string;
}, onRobotSaved: (id: string) => void) {
  let robotId = draft.savedRobotId;
  let step = "save the robot";
  try {
    if (!robotId) {
      const { data: existing, error: lookupError } = await db.from("robots").select("id").eq("workspace_id", draft.workspaceId).eq("vendor_id", draft.vendorId).eq("normalized_name", normalizeName(draft.name)).maybeSingle();
      if (lookupError) throw lookupError;
      if (existing) throw new ExistingRobotError(existing.id);
      const { data: robot, error } = await db.from("robots").insert({ workspace_id: draft.workspaceId, vendor_id: draft.vendorId, name: draft.name.trim(), normalized_name: normalizeName(draft.name), product_url: draft.productUrl.trim() || null, description: draft.description.trim() || null, research_status: "queued" }).select("id").single();
      if (error) throw error;
      robotId = robot.id;
      onRobotSaved(robotId);
    }
    step = "save the organization associations";
    const organizationIds = [...new Set(draft.organizationIds)].filter(id => id !== draft.vendorId);
    if (organizationIds.length) {
      const { error } = await db.from("robot_company_links").upsert(organizationIds.map(vendorId => ({ workspace_id: draft.workspaceId, robot_id: robotId!, vendor_id: vendorId })), { onConflict: "robot_id,vendor_id", ignoreDuplicates: true });
      if (error) throw error;
    }
    step = "set up the Meetups";
    const [{ data: meetups, error: meetupError }, { data: stage, error: stageError }] = await Promise.all([
      db.from("meetups").select("id").eq("workspace_id", draft.workspaceId),
      db.from("pipeline_stages").select("id").eq("workspace_id", draft.workspaceId).eq("archived", false).order("position").limit(1).maybeSingle(),
    ]);
    if (meetupError || stageError) throw meetupError || stageError;
    if (meetups?.length && stage) {
      const { error } = await db.from("opportunities").upsert(meetups.map(meetup => ({ workspace_id: draft.workspaceId, vendor_id: draft.vendorId, robot_id: robotId!, meetup_id: meetup.id, stage_id: stage.id })), { onConflict: "vendor_id,robot_id,meetup_id", ignoreDuplicates: true });
      if (error) throw error;
    }
    return robotId;
  } catch (cause) {
    if (cause instanceof ExistingRobotError) throw cause;
    throw new Error(`${robotId ? "The robot is saved, but setup is incomplete. Choose Finish setup to retry. Could not" : "Could not"} ${step}: ${robotSaveErrorMessage(cause)}`);
  }
}
