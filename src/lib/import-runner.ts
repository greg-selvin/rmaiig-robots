import { parse } from "csv-parse/sync";
import ExcelJS from "exceljs";
import { adminClient } from "./server";
import { countryCode, normalizeName, parseRobotNames, previewImport, sourceRowSchema, type SourceRow } from "./import";
import type { JsonImport, JsonVendorImport } from "./json-import";
import { previewJsonImport } from "./json-import-plan";

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

const workspace = workspaceId;
const defined = <T extends Record<string, unknown>>(value:T) => Object.fromEntries(Object.entries(value).filter(([,v])=>v!==undefined));

export async function runJsonImport(input:JsonImport,sourceName:string,dryRun:boolean,actorId:string|null=null) {
  const db=adminClient();
  const {data:vendors,error:vendorError}=await db.from("vendors").select("id,name,normalized_name").eq("workspace_id",workspace).limit(10000);
  const {data:robots,error:robotError}=await db.from("robots").select("id,vendor_id,name,normalized_name").eq("workspace_id",workspace).limit(10000);
  if(vendorError||robotError)throw new Error(vendorError?.message||robotError?.message);
  if(dryRun)return previewJsonImport(input,vendors||[],robots||[]);
  const vendorById=new Map((vendors||[]).map(v=>[v.id,v]));
  const vendorByName=new Map((vendors||[]).map(v=>[v.normalized_name,v]));
  const seenVendors=new Set<string>();
  let insertedVendors=0,updatedVendors=0,insertedRobots=0,updatedRobots=0,contacts=0,ratings=0;
  const warnings:string[]=[];
  for(const entry of input.vendors) {
    const match=entry.id?vendorById.get(entry.id):vendorByName.get(normalizeName(entry.name));
    if(entry.id&&!match)throw new Error(`Unknown vendor id ${entry.id}`);
    const key=match?.id||normalizeName(entry.name);
    if(seenVendors.has(key))throw new Error(`Duplicate vendor in file: ${entry.name}`);
    seenVendors.add(key);
    if(match)updatedVendors++;else insertedVendors++;
    if(!countryCode(entry.country||" ")&&!entry.iso_country_code)warnings.push(`${entry.name}: country is not mapped to an ISO code`);
    const {contacts:contactEntries=[],locations,vendor_sources:vendorSources,robots:robotEntries,...vendorFields}=entry;
    const vendorPayload={...defined(vendorFields as Record<string,unknown>),name:entry.name,normalized_name:normalizeName(entry.name),workspace_id:workspace};
    let vendorId=match?.id;
    if(match) {
      const {error}=await db.from("vendors").update(vendorPayload as never).eq("id",match.id).eq("workspace_id",workspace);
      if(error)throw new Error(`${entry.name}: ${error.message}`);
    } else {
      const {data,error}=await db.from("vendors").insert(vendorPayload as never).select("id").single();
      if(error||!data)throw new Error(`${entry.name}: ${error?.message||"vendor insert failed"}`);
      vendorId=data.id;
    }
    if(!vendorId)throw new Error(`${entry.name}: vendor id was not resolved`);
    for(const contact of contactEntries) {
      contacts++;
      const {id:contactId,...fields}=contact;
      let query=db.from("contacts").select("id").eq("workspace_id",workspace).eq("vendor_id",vendorId);
      if(contactId)query=query.eq("id",contactId);
      else if(contact.business_email)query=query.ilike("business_email",contact.business_email);
      else if(contact.profile_url)query=query.eq("profile_url",contact.profile_url);
      else if(contact.contact_form_url)query=query.eq("contact_form_url",contact.contact_form_url);
      const {data:found,error:findError}=await query.limit(1).maybeSingle();
      if(findError)throw new Error(`${entry.name} contact lookup: ${findError.message}`);
      if(contactId&&!found)throw new Error(`${entry.name}: unknown contact id ${contactId}`);
      const payload={...defined(fields as Record<string,unknown>),workspace_id:workspace,vendor_id:vendorId};
      const result=found?await db.from("contacts").update(payload as never).eq("id",found.id):await db.from("contacts").insert(payload as never);
      if(result.error)throw new Error(`${entry.name} contact: ${result.error.message}`);
    }
    for(const location of locations||[]) {
      const {id:locationId,...fields}=location;
      let query=db.from("vendor_locations").select("id").eq("workspace_id",workspace).eq("vendor_id",vendorId);
      if(locationId)query=query.eq("id",locationId);
      else {
        query=query.eq("location_type",location.location_type||"headquarters");
        if(location.city)query=query.ilike("city",location.city);
        if(location.iso_country_code)query=query.eq("iso_country_code",location.iso_country_code);
      }
      const {data:found,error:findError}=await query.limit(1).maybeSingle();
      if(findError)throw new Error(`${entry.name} location lookup: ${findError.message}`);
      if(locationId&&!found)throw new Error(`${entry.name}: unknown location id ${locationId}`);
      const payload={...defined(fields as Record<string,unknown>),location_type:location.location_type||"headquarters",workspace_id:workspace,vendor_id:vendorId};
      const result=found?await db.from("vendor_locations").update(payload as never).eq("id",found.id):await db.from("vendor_locations").insert(payload as never);
      if(result.error)throw new Error(`${entry.name} location: ${result.error.message}`);
    }
    const vendorSourceIds=await saveSources(vendorSources||[],vendorId,null);
    const entryRobotNames=new Set<string>();
    for(const robot of robotEntries||[]) {
      const robotKey=normalizeName(robot.name);
      if(entryRobotNames.has(robotKey))throw new Error(`Duplicate robot in ${entry.name}: ${robot.name}`);
      entryRobotNames.add(robotKey);
      await importRobot(robot,entry,vendorId,vendorSourceIds);
    }
    const {data:jobs,error:jobsError}=await db.from("research_jobs").select("id").eq("vendor_id",vendorId).limit(1);
    if(jobsError)throw new Error(`${entry.name}: ${jobsError.message}`);
    if(!jobs?.length) {
      const {error}=await db.from("research_jobs").insert({workspace_id:workspace,vendor_id:vendorId,status:"queued"});
      if(error)throw new Error(`${entry.name}: ${error.message}`);
    }
  }
  const {error:batchError}=await db.from("import_batches").insert({workspace_id:workspace,source_name:sourceName,dry_run:false,inserted_vendors:insertedVendors,updated_vendors:updatedVendors,inserted_robots:insertedRobots,skipped:0,warnings:warnings as never,created_by:actorId});
  if(batchError)throw new Error(batchError.message);
  return {dryRun:false,insertedVendors,updatedVendors,insertedRobots,updatedRobots,contacts,ratings,warnings};

  async function saveSources(sources:NonNullable<JsonVendorImport["vendor_sources"]>,vendorId:string,robotId:string|null):Promise<Map<string,string>> {
    const ids=new Map<string,string>();
    for(const source of sources) {
      const {id,...fields}=source;
      let query=db.from("research_sources").select("id").eq("workspace_id",workspace).eq("url",source.url);
      query=robotId?query.eq("robot_id",robotId):query.eq("vendor_id",vendorId).is("robot_id",null);
      if(id)query=db.from("research_sources").select("id").eq("workspace_id",workspace).eq("id",id);
      const {data:found,error}=await query.limit(1).maybeSingle();
      if(error)throw new Error(`Source lookup ${source.url}: ${error.message}`);
      if(id&&!found)throw new Error(`Unknown source id ${id}`);
      const payload={...defined(fields as Record<string,unknown>),workspace_id:workspace,vendor_id:vendorId,robot_id:robotId};
      const result=found?await db.from("research_sources").update(payload as never).eq("id",found.id).select("id").single():await db.from("research_sources").insert(payload as never).select("id").single();
      if(result.error||!result.data)throw new Error(`Source ${source.url}: ${result.error?.message||"write failed"}`);
      ids.set(source.url,result.data.id);
    }
    return ids;
  }

  async function importRobot(robot:NonNullable<JsonVendorImport["robots"]>[number],vendor:JsonVendorImport,vendorId:string,vendorSourceIds:Map<string,string>) {
    let foundRobot: {id:string}|null=null;
    if(robot.id) {
      const {data,error}=await db.from("robots").select("id").eq("id",robot.id).eq("vendor_id",vendorId).eq("workspace_id",workspace).maybeSingle();
      if(error)throw new Error(`${vendor.name}/${robot.name}: ${error.message}`);
      if(!data)throw new Error(`${vendor.name}: unknown robot id ${robot.id}`);
      foundRobot=data;
    } else {
      const {data,error}=await db.from("robots").select("id").eq("vendor_id",vendorId).eq("normalized_name",normalizeName(robot.name)).maybeSingle();
      if(error)throw new Error(`${vendor.name}/${robot.name}: ${error.message}`);
      foundRobot=data;
    }
    const {sources,excitement,participation,...fields}=robot;
    if(foundRobot)updatedRobots++;else insertedRobots++;
    const payload={...defined(fields as Record<string,unknown>),name:robot.name,normalized_name:normalizeName(robot.name),workspace_id:workspace,vendor_id:vendorId};
    const robotWrite=foundRobot?await db.from("robots").update(payload as never).eq("id",foundRobot.id).select("id").single():await db.from("robots").insert(payload as never).select("id").single();
    if(robotWrite.error||!robotWrite.data)throw new Error(`${vendor.name}/${robot.name}: ${robotWrite.error?.message||"robot write failed"}`);
    const robotId=robotWrite.data.id;
    if(!foundRobot) {
      const {data:meetups,error:meetupError}=await db.from("meetups").select("id").eq("workspace_id",workspace);
      const {data:stage,error:stageError}=await db.from("pipeline_stages").select("id").eq("workspace_id",workspace).eq("name","Researching").single();
      if(meetupError||stageError||!stage)throw new Error(meetupError?.message||stageError?.message||"Researching stage is missing");
      for(const meetup of meetups||[]) {
        const {error}=await db.from("opportunities").upsert({workspace_id:workspace,vendor_id:vendorId,robot_id:robotId,meetup_id:meetup.id,stage_id:stage.id},{onConflict:"robot_id,meetup_id",ignoreDuplicates:true});
        if(error)throw new Error(error.message);
      }
    }
    const robotSourceIds=await saveSources(sources||[],vendorId,robotId);
    await saveRatings(excitement||[],"excitement",robotId,null,vendorSourceIds,robotSourceIds);
    for(const rating of participation||[]) {
      let meetupQuery=db.from("meetups").select("id").eq("workspace_id",workspace);
      meetupQuery=rating.meetup_id?meetupQuery.eq("id",rating.meetup_id):meetupQuery.ilike("name",rating.meetup_name!);
      const {data:meetup,error}=await meetupQuery.limit(1).maybeSingle();
      if(error||!meetup)throw new Error(`${vendor.name}/${robot.name}: meetup not found (${rating.meetup_name||rating.meetup_id})`);
      const {data:opportunity,error:opError}=await db.from("opportunities").select("id").eq("robot_id",robotId).eq("meetup_id",meetup.id).maybeSingle();
      if(opError||!opportunity)throw new Error(`${vendor.name}/${robot.name}: opportunity not found for meetup ${meetup.id}`);
      await saveRatings([rating],"participation",null,opportunity.id,vendorSourceIds,robotSourceIds);
    }
  }

  async function saveRatings(entries:NonNullable<NonNullable<JsonVendorImport["robots"]>[number]["excitement"]>,kind:"excitement"|"participation",robotId:string|null,opportunityId:string|null,vendorSourceIds:Map<string,string>,robotSourceIds:Map<string,string>) {
    if(!entries.length)return;
    const {data:criteria,error:criteriaError}=await db.from("scoring_criteria").select("criterion_key,model_id").eq("workspace_id",workspace);
    const {data:models,error:modelError}=await db.from("scoring_models").select("id,kind,is_active").eq("workspace_id",workspace).eq("kind",kind).eq("is_active",true);
    if(criteriaError||modelError)throw new Error(criteriaError?.message||modelError?.message);
    const activeIds=new Set((models||[]).map(model=>model.id));
    const valid=new Set((criteria||[]).filter(c=>activeIds.has(c.model_id)).map(c=>c.criterion_key));
    for(const rating of entries) {
      if(!valid.has(rating.criterion_key))throw new Error(`Unknown active ${kind} criterion: ${rating.criterion_key}`);
      const keyColumn=kind==="excitement"?"robot_id":"opportunity_id";
      const keyValue=kind==="excitement"?robotId:opportunityId;
      let query=db.from("ratings").select("id").eq("workspace_id",workspace).eq("kind",kind).eq("criterion_key",rating.criterion_key);
      query=query.eq(keyColumn,keyValue!);
      const {data:found,error}=await query.maybeSingle();
      if(error)throw new Error(`Rating lookup: ${error.message}`);
      const {source_urls,...ratingFields}=rating;
      const source_ids=(source_urls||[]).map(url=>robotSourceIds.get(url)||vendorSourceIds.get(url)).filter((value):value is string=>Boolean(value));
      if((source_urls||[]).length!==source_ids.length)throw new Error(`Rating references undeclared source URL for ${rating.criterion_key}`);
      const payload={...defined(ratingFields as Record<string,unknown>),...(source_urls===undefined?{}:{source_ids}),workspace_id:workspace,kind,robot_id:robotId,opportunity_id:opportunityId,criterion_key:rating.criterion_key};
      const result=found?await db.from("ratings").update(payload as never).eq("id",found.id):await db.from("ratings").insert(payload as never);
      if(result.error)throw new Error(`Rating ${rating.criterion_key}: ${result.error.message}`);
      ratings++;
    }
  }
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
    if(!jobs?.length)await db.from("research_jobs").insert({workspace_id:workspaceId,vendor_id:vendor.id,status:"queued",scheduled_at:new Date(Date.now()+(countryCode(row.country)==="USA"?0:86400000)).toISOString()});
  }
  const {error:batchError}=await db.from("import_batches").insert({
    workspace_id:workspaceId,source_name:sourceName,dry_run:false,
    inserted_vendors:preview.insertedVendors,updated_vendors:preview.updatedVendors,
    inserted_robots:preview.insertedRobots,skipped:preview.skipped,warnings:preview.warnings as never,created_by:actorId,
  });
  if(batchError)throw new Error(batchError.message);
  return {dryRun:false,...preview};
}
