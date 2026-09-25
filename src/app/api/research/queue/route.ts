import { z } from "zod";
import { authorizedRole } from "@/lib/server";

const schema=z.object({vendor_id:z.uuid(),robot_id:z.uuid().optional()});
const workspaceId="c02ee290-4f87-4d1f-98c1-24c502126086";
export async function POST(request:Request) {
  const auth=await authorizedRole();
  if(!auth?.role||auth.role==="viewer")return Response.json({error:"Forbidden"},{status:403});
  const body=schema.safeParse(await request.json().catch(()=>null));
  if(!body.success)return Response.json({error:"Invalid request"},{status:400});
  const {data:vendor}=await auth.client.from("vendors").select("id").eq("id",body.data.vendor_id).eq("workspace_id",workspaceId).maybeSingle();
  if(!vendor)return Response.json({error:"Vendor unavailable"},{status:404});
  const since=new Date(Date.now()-60*60*1000).toISOString();
  const {count}=await auth.client.from("research_jobs").select("id",{count:"exact",head:true}).eq("workspace_id",workspaceId).gte("created_at",since);
  if((count||0)>=20)return Response.json({error:"Hourly research queue limit reached"},{status:429});
  const {data,error}=await auth.client.from("research_jobs").insert({workspace_id:workspaceId,vendor_id:body.data.vendor_id,robot_id:body.data.robot_id||null,status:"queued"}).select("id").single();
  if(error)return Response.json({error:error.message},{status:400});
  return Response.json({id:data.id});
}
