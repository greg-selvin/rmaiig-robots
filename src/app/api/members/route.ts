import { z } from "zod";
import { adminClient, authorizedRole } from "@/lib/server";

const workspaceId = "c02ee290-4f87-4d1f-98c1-24c502126086";
const schema = z.object({
  email: z.email(),
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  role: z.enum(["admin", "member", "viewer"]),
});
const nameSchema = z.object({
  user_id: z.uuid(),
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
});

export async function GET() {
  const auth = await authorizedRole();
  if (auth?.role !== "admin") return Response.json({ error: "Admin required" }, { status: 403 });
  try {
    const db = adminClient();
    const { data: members, error: memberError } = await db.from("workspace_members")
      .select("user_id")
      .eq("workspace_id", workspaceId);
    if (memberError) throw memberError;
    const memberIds = new Set((members || []).map(member => member.user_id));
    const emails = new Map<string, string>();
    for (let page = 1; page <= 10 && emails.size < memberIds.size; page++) {
      const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      for (const user of data.users) {
        if (memberIds.has(user.id) && user.email) emails.set(user.id, user.email);
      }
      if (data.users.length < 1000) break;
    }
    return Response.json({ members: [...memberIds].map(user_id => ({ user_id, email: emails.get(user_id) || null })) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not load member emails" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await authorizedRole();
  if (auth?.role !== "admin") return Response.json({ error: "Admin required" }, { status: 403 });
  const input = nameSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: "Enter a first and last name" }, { status: 400 });
  try {
    const db = adminClient();
    const { data: member, error: memberError } = await db.from("workspace_members")
      .select("user_id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", input.data.user_id)
      .maybeSingle();
    if (memberError) throw memberError;
    if (!member) return Response.json({ error: "Workspace member not found" }, { status: 404 });
    const { error } = await db.from("profiles").upsert({
      id: input.data.user_id,
      first_name: input.data.first_name,
      last_name: input.data.last_name,
      display_name: `${input.data.first_name} ${input.data.last_name}`,
    });
    if (error) throw error;
    return Response.json({ user_id: input.data.user_id });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not update member name" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await authorizedRole();
  if (auth?.role !== "admin") return Response.json({ error: "Admin required" }, { status: 403 });
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: "Enter a valid email, first and last name, and role" }, { status: 400 });
  try {
    const db = adminClient();
    const email = input.data.email.trim().toLowerCase();
    async function findUser() {
      for (let page = 1; page <= 10; page++) {
        const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) throw error;
        const match = data.users.find(user => user.email?.toLowerCase() === email);
        if (match) return match;
        if (data.users.length < 1000) return null;
      }
      return null;
    }
    let user = await findUser();
    if (!user) {
      const { data, error } = await db.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { first_name: input.data.first_name, last_name: input.data.last_name, full_name: `${input.data.first_name} ${input.data.last_name}` },
      });
      if (error) {
        user = await findUser();
        if (!user) throw error;
      } else if (data.user) {
        user = data.user;
      } else {
        throw new Error("Auth did not return the new user");
      }
    }
    if (!user.email_confirmed_at) {
      const { data, error } = await db.auth.admin.updateUserById(user.id, { email_confirm: true });
      if (error) throw error;
      user = data.user;
    }
    const userId = user.id;
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
