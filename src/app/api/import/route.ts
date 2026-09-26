import { authorizedRole } from "@/lib/server";
import { rowsFromUpload, runImport, runJsonImport } from "@/lib/import-runner";
import { parseJsonImport } from "@/lib/json-import";

export async function POST(request:Request) {
  const auth=await authorizedRole();
  if(auth?.role!=="admin")return Response.json({error:"Admin required"},{status:403});
  if(!process.env.SUPABASE_SECRET_KEY)return Response.json({error:"Server key is not configured"},{status:503});
  try {
    const form=await request.formData();
    const file=form.get("file"),dryRun=form.get("dry_run")!=="false";
    if(!(file instanceof File))return Response.json({error:"File required"},{status:400});
    if(file.size>5_000_000)return Response.json({error:"File exceeds 5 MB"},{status:413});
    const buffer=Buffer.from(await file.arrayBuffer());
    const result=file.name.toLowerCase().endsWith(".json")
      ? await runJsonImport(parseJsonImport(buffer.toString("utf8")),file.name,dryRun,auth.user.id)
      : await runImport(await rowsFromUpload(file.name,buffer),file.name,dryRun,auth.user.id);
    return Response.json(result);
  } catch(e){return Response.json({error:e instanceof Error?e.message:"Import failed"},{status:400});}
}
