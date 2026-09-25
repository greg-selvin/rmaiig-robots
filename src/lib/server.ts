import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export async function userClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(values) { values.forEach(({name,value,options}) => cookieStore.set(name,value,options)); },
      },
    },
  );
}
export function adminClient() {
  const key=process.env.SUPABASE_SECRET_KEY;
  if(!key) throw new Error("SUPABASE_SECRET_KEY is not configured");
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!,key,{auth:{persistSession:false}});
}
export async function authorizedRole() {
  const client=await userClient();
  const {data:{user}}=await client.auth.getUser();
  if(!user)return null;
  const {data}=await client.from("workspace_members").select("role").eq("workspace_id","c02ee290-4f87-4d1f-98c1-24c502126086").eq("user_id",user.id).maybeSingle();
  return {user,role:data?.role||null,client};
}
