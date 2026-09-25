import { z } from "zod";
import { adminClient, authorizedRole } from "@/lib/server";

const workspaceId = "c02ee290-4f87-4d1f-98c1-24c502126086";
const schema = z.object({
  email: z.email(),
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  role: z.enum(["admin", "member", "viewer"]),
});

export async function POST(request: Request) {
  const auth = await authorizedRole();
  if (auth?.role !== "admin") return Response.json({ error: "Admin required" }, { status: 403 });
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: "Enter a valid email and role" }, { status: 400 });
  try {
    const db = adminClient();
    let userId: string | null = null;
    for (let page = 1; page <= 10; page++) {
      const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      userId = data.users.find(user => user.email?.toLowerCase() === input.data.email.toLowerCase())?.id ?? null;
      if (userId || data.users.length < 1000) break;
    }
    if (!userId) return Response.json({ error: "That user must create and confirm an account first" }, { status: 404 });
    const { error: profileError } = await db.from("profiles").upsert({
      id: userId,
      first_name: input.data.first_name,
      last_name: input.data.last_name,
      display_name: `${input.data.first_name} ${input.data.last_name}`,
    });
    if (profileError) throw profileError;
    const { error } = await db.from("workspace_members").upsert({
      workspace_id: workspaceId, user_id: userId, role: input.data.role,
    }, { onConflict: "workspace_id,user_id" });
    if (error) throw error;
    return Response.json({ user_id: userId, role: input.data.role });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not add member" }, { status: 500 });
  }
}
