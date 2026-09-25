import { parse } from "csv-parse/sync";
import ExcelJS from "exceljs";
import { adminClient } from "./server";
import { countryCode, normalizeName, parseRobotNames, previewImport, sourceRowSchema, type SourceRow } from "./import";

const workspaceId="c02ee290-4f87-4d1f-98c1-24c502126086";
const headers=["# on TECHNOPHILoSOPH List","Company","Robot Name(s)","Country"];
export async function rowsFromUpload(fileName:string,buffer:Buffer):Promise<SourceRow[]> {
  let values:string[][];
  if(fileName.toLowerCase().endsWith(".csv")) values=parse(buffer,{skip_empty_lines:true,bom:true,relax_quotes:true}) as string[][];
  else if(fileName.toLowerCase().endsWith(".xlsx")) {
    const workbook=new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as never);
    const sheet=workbook.worksheets[0];
    if(!sheet)throw new Error("Workbook has no sheets");
    values=sheet.getRows(1,sheet.rowCount)?.map(row=>[1,2,3,4].map(i=>String(row.getCell(i).text||"")))||[];
  } else throw new Error("Upload a CSV or XLSX file");
  if(!headers.every((h,i)=>values[0]?.[i]?.trim()===h))throw new Error("Unexpected sheet headers");
  return values.slice(1).filter(v=>v.some(Boolean)).map((v,i)=>sourceRowSchema.parse({
    source_row:i+2,source_rank:Number(v[0]),company:v[1],robots:v[2]||"",country:v[3]||"",
  }));
}
export async function runImport(rows:SourceRow[],sourceName:string,dryRun:boolean,actorId:string|null=null) {
  const db=adminClient();
  const {data:vendors,error:vendorError}=await db.from("vendors").select("id,normalized_name").eq("workspace_id",workspaceId).limit(10000);
  const {data:robots,error:robotError}=await db.from("robots").select("vendor_id,normalized_name").eq("workspace_id",workspaceId).limit(10000);
  if(vendorError||robotError)throw new Error(vendorError?.message||robotError?.message);
  const names=new Set((vendors||[]).map(v=>v.normalized_name));
  const vendorNames=new Map((vendors||[]).map(v=>[v.id,v.normalized_name]));
  const robotNames=new Set((robots||[]).map(r=>`${vendorNames.get(r.vendor_id)}:${r.normalized_name}`));
  const preview=previewImport(rows,names,robotNames);
  if(dryRun)return {dryRun:true,...preview};
  const {data:meetups,error:meetupError}=await db.from("meetups").select("id").eq("workspace_id",workspaceId);
  const {data:initialStage,error:stageError}=await db.from("pipeline_stages").select("id").eq("workspace_id",workspaceId).eq("name","Researching").single();
  if(meetupError||stageError||!initialStage)throw new Error(meetupError?.message||stageError?.message||"Researching stage is missing");
  for(const row of rows) {
    const parsed=parseRobotNames(row.robots);
    const vendorKey=normalizeName(row.company);
    const {data:vendor,error}=await db.from("vendors").upsert({
      workspace_id:workspaceId,name:row.company,normalized_name:vendorKey,
      original_source_name:row.company,source_row:row.source_row,source_rank:row.source_rank,
      original_robot_text:row.robots,original_import_data:row as never,
      country:row.country,iso_country_code:countryCode(row.country),
      parsing_review_status:parsed.warning?"needs_review":"clear",
    },{onConflict:"workspace_id,normalized_name"}).select("id").single();
    if(error||!vendor)throw new Error(error?.message||"Vendor insert failed");
    for(const name of parsed.names){
      const key=normalizeName(name);
      const {data:robot,error:robotError}=await db.from("robots").upsert({
        workspace_id:workspaceId,vendor_id:vendor.id,name,normalized_name:key,original_imported_text:row.robots,
      },{onConflict:"vendor_id,normalized_name"}).select("id").single();
      if(robotError||!robot)throw new Error(robotError?.message||"Robot insert failed");
      for(const meetup of meetups||[]) {
        const {error:opportunityError}=await db.from("opportunities").upsert({
          workspace_id:workspaceId,vendor_id:vendor.id,robot_id:robot.id,meetup_id:meetup.id,stage_id:initialStage.id,
        },{onConflict:"robot_id,meetup_id",ignoreDuplicates:true});
        if(opportunityError)throw new Error(opportunityError.message);
      }
    }
    const {data:jobs}=await db.from("research_jobs").select("id").eq("vendor_id",vendor.id).limit(1);
    if(!jobs?.length)await db.from("research_jobs").insert({workspace_id:workspaceId,vendor_id:vendor.id,status:"queued",scheduled_at:new Date(Date.now()+(countryCode(row.country)==="US"?0:86400000)).toISOString()});
  }
  const {error:batchError}=await db.from("import_batches").insert({
    workspace_id:workspaceId,source_name:sourceName,dry_run:false,
    inserted_vendors:preview.insertedVendors,updated_vendors:preview.updatedVendors,
    inserted_robots:preview.insertedRobots,skipped:preview.skipped,warnings:preview.warnings as never,created_by:actorId,
  });
  if(batchError)throw new Error(batchError.message);
  return {dryRun:false,...preview};
}
