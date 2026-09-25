import { z } from "zod";
import { adminClient, authorizedRole, userClient } from "@/lib/server";

const workspaceId = "c02ee290-4f87-4d1f-98c1-24c502126086";
const profileSchema = z.object({
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
});
const decisionSchema = z.object({
  id: z.uuid(),
  decision: z.enum(["approved", "denied"]),
});

async function deliverNotification(client: Awaited<ReturnType<typeof userClient>>, db: ReturnType<typeof adminClient>, requestId: string) {
  try {
    const { data, error } = await client.functions.invoke("notify-access-request", { body: { request_id: requestId } });
    if (error) throw error;
    return { email_sent: Boolean(data?.email_sent), notification: data?.notification ?? "unknown" };
  } catch (error) {
    console.error("Access request email notification failed", error);
    await db.from("access_requests").update({ notification_error: "failed" }).eq("id", requestId);
    return { email_sent: false, notification: "failed" };
  }
}

export async function POST() {
  const client = await userClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user?.email) return Response.json({ error: "Sign in before requesting workspace access" }, { status: 401 });
  const { data: member, error: memberError } = await client.from("workspace_members").select("role").eq("workspace_id", workspaceId).eq("user_id", user.id).maybeSingle();
  if (memberError) return Response.json({ error: memberError.message }, { status: 500 });
  if (member) return Response.json({ status: "approved", email_sent: false });

  try {
    const db = adminClient();
    const { data: existing, error: requestError } = await db.from("access_requests").select("id,status,notification_sent_at,requested_at").eq("workspace_id", workspaceId).eq("user_id", user.id).maybeSingle();
    if (requestError) throw requestError;
    if (existing?.status === "pending") {
      if (existing.notification_sent_at) return Response.json({ status: "pending", email_sent: true });
      const notification = await deliverNotification(client, db, existing.id);
      return Response.json({ status: "pending", ...notification });
    }
    if (existing?.status === "denied") return Response.json({ status: "denied", email_sent: false });
    if (existing?.status === "approved") return Response.json({ status: "approved", email_sent: false });

    let requestId = existing?.id;
    if (existing) {
      const { error } = await db.from("access_requests").update({ email: user.email, status: "pending", requested_at: new Date().toISOString(), notification_sent_at: null, notification_error: null, reviewed_at: null, reviewed_by: null }).eq("id", existing.id);
      if (error) throw error;
    } else {
      const { data, error } = await db.from("access_requests").insert({ workspace_id: workspaceId, user_id: user.id, email: user.email, status: "pending" }).select("id,requested_at").single();
      if (error?.code === "23505") return Response.json({ status: "pending", email_sent: false });
      if (error) throw error;
      requestId = data.id;
    }

    if (!requestId) throw new Error("Access request ID is missing");
    const notification = await deliverNotification(client, db, requestId);
    return Response.json({ status: "pending", ...notification }, { status: 201 });
  } catch (error) {
    console.error("Could not record access request", error);
    return Response.json({ error: "Could not record your workspace access request" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const payload: unknown = await request.json().catch(() => null);
  const auth = await authorizedRole();
  if (!auth) return Response.json({ error: "Sign in to continue" }, { status: 401 });

  const profileInput = profileSchema.safeParse(payload);
  if (profileInput.success) {
    const db = adminClient();
    const { error } = await db.from("access_requests").update(profileInput.data).eq("workspace_id", workspaceId).eq("user_id", auth.user.id).eq("status", "pending");
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ status: "saved" });
  }

  const decisionInput = decisionSchema.safeParse(payload);
  if (!decisionInput.success) return Response.json({ error: "Invalid access request update" }, { status: 400 });
  if (auth.role !== "admin") return Response.json({ error: "Admin required" }, { status: 403 });
  const db = adminClient();
  const { error } = await db.rpc("review_access_request", {
    p_request_id: decisionInput.data.id,
    p_decision: decisionInput.data.decision,
    p_reviewer: auth.user.id,
  });
  if (error) return Response.json({ error: error.message }, { status: 409 });
  return Response.json({ status: decisionInput.data.decision });
}
