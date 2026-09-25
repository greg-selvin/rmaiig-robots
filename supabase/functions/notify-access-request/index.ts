import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const workspaceId = "c02ee290-4f87-4d1f-98c1-24c502126086";

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return Response.json({ error: "Sign in to continue" }, { status: 401 });

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RESEND_FROM_EMAIL");
  if (!url || !anonKey || !serviceKey || !resendKey || !from) {
    return Response.json({ error: "Access notification provider is not configured" }, { status: 503 });
  }

  const authClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user?.email) return Response.json({ error: "Sign in to continue" }, { status: 401 });

  const body: unknown = await request.json().catch(() => null);
  const requestId = typeof body === "object" && body !== null && "request_id" in body && typeof body.request_id === "string" ? body.request_id : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId)) {
    return Response.json({ error: "Invalid access request" }, { status: 400 });
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: accessRequest, error: requestError } = await admin.from("access_requests")
    .select("id,email,status,notification_sent_at")
    .eq("id", requestId)
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (requestError) return Response.json({ error: "Could not load access request" }, { status: 500 });
  if (!accessRequest) return Response.json({ error: "Access request not found" }, { status: 404 });
  if (accessRequest.status !== "pending") return Response.json({ status: accessRequest.status, email_sent: false });
  if (accessRequest.notification_sent_at) return Response.json({ status: "pending", email_sent: true });

  const { data: admins, error: adminsError } = await admin.from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspaceId)
    .eq("role", "admin");
  if (adminsError) return Response.json({ error: "Could not load administrators" }, { status: 500 });
  const emails = await Promise.all((admins ?? []).map(async ({ user_id }) => {
    const result = await admin.auth.admin.getUserById(user_id);
    if (result.error) throw result.error;
    return result.data.user.email;
  }));
  const recipients = [...new Set(emails.filter((email): email is string => Boolean(email)))];
  if (!recipients.length) return Response.json({ error: "No administrator email is available" }, { status: 409 });

  const reviewUrl = "https://rmaiig-robots.vercel.app/?view=settings";
  const safeEmail = escapeHtml(accessRequest.email);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `access-request/${accessRequest.id}`,
    },
    signal: AbortSignal.timeout(10_000),
    body: JSON.stringify({
      from,
      to: recipients,
      subject: "New RMAIIG Robots access request",
      html: `<p>A new user requested access to the RMAIIG Robots workspace.</p><p>Email: <strong>${safeEmail}</strong></p><p><a href="${reviewUrl}">Review and approve or deny the request</a></p>`,
      text: `A new user requested access to the RMAIIG Robots workspace. Email: ${accessRequest.email}. Review and approve or deny: ${reviewUrl}`,
    }),
  });
  if (!response.ok) {
    await admin.from("access_requests").update({ notification_error: "delivery_failed" }).eq("id", accessRequest.id);
    return Response.json({ error: "Email provider rejected the notification" }, { status: 502 });
  }

  const { error: updateError } = await admin.from("access_requests").update({
    notification_sent_at: new Date().toISOString(),
    notification_error: null,
  }).eq("id", accessRequest.id);
  if (updateError) return Response.json({ error: "Email was sent but its status could not be recorded" }, { status: 500 });
  return Response.json({ status: "pending", email_sent: true });
});
