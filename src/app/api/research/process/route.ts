import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { adminClient } from "@/lib/server";
import { researchSchema } from "@/lib/research-schema";
import { countryCode, countryName, isUsCountry, stateCode } from "@/lib/geo-codes";

const workspaceId="c02ee290-4f87-4d1f-98c1-24c502126086";
export const maxDuration=300;
export async function GET(request:Request) { return processResearch(request); }
export async function POST(request:Request) { return processResearch(request); }
async function processResearch(request:Request) {
  if(!process.env.CRON_SECRET||request.headers.get("authorization")!==`Bearer ${process.env.CRON_SECRET}`)return Response.json({error:"Unauthorized"},{status:401});
  if(!process.env.OPENAI_API_KEY)return Response.json({error:"OpenAI key is not configured"},{status:503});
  const db=adminClient();
  const max=Math.min(10,Math.max(1,Number(process.env.RESEARCH_BATCH_SIZE||5)),Math.max(1,Number(process.env.RESEARCH_CONCURRENCY||2)));
  const limit=Math.max(0,Number(process.env.RESEARCH_MAX_JOBS_PER_DAY||25));
  const today=new Date();today.setUTCHours(0,0,0,0);
  const {count}=await db.from("research_jobs").select("id",{count:"exact",head:true}).eq("workspace_id",workspaceId).gte("started_at",today.toISOString());
  const allowed=Math.min(max,Math.max(0,limit-(count||0)));
  if(!allowed)return Response.json({processed:0,reason:"Daily limit reached"});
  await db.from("research_jobs").update({status:"queued",scheduled_at:new Date().toISOString(),error:"Requeued after interrupted worker"}).eq("workspace_id",workspaceId).eq("status","researching").lt("started_at",new Date(Date.now()-30*60*1000).toISOString());
  const {data:jobs,error}=await db.from("research_jobs").select("*").eq("workspace_id",workspaceId).eq("status","queued").lte("scheduled_at",new Date().toISOString()).order("scheduled_at").limit(allowed);
  if(error)return Response.json({error:error.message},{status:500});
  const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
  const results=[];
  for(const job of jobs||[]) {
    const {data:vendor}=await db.from("vendors").select("*").eq("id",job.vendor_id!).single();
    if(!vendor)continue;
    await db.from("research_jobs").update({status:"researching",started_at:new Date().toISOString(),attempts:job.attempts+1}).eq("id",job.id);
    try {
      const response=await client.responses.parse({
        model:process.env.OPENAI_MODEL||"gpt-5.6-terra",
        tools:[{type:"web_search"}],
        include:["web_search_call.action.sources"],
        text:{format:zodTextFormat(researchSchema,"robot_research")},
        input:`Research the humanoid robot manufacturer ${vendor.name} (${vendor.country}) and models listed as ${vendor.original_robot_text||"unknown"}. Search current public sources. Return only verifiable facts, with URLs for each finding. Prioritize official manufacturer and event pages. Public professional contacts only. Never infer an email as confirmed. Return country_code and each location country_code as ISO 3166-1 alpha-3; use the application data for valid codes. Return state_code as a two-letter US state abbreviation when applicable. Return separate ratings for each identifiable robot, using the robot_name field. For each of six excitement and six participation criteria, provide a rating only if sources support it; otherwise null. Criterion keys: excitement live_impact, attendee_interaction, sophistication, distinctiveness, demo_range, audience_appeal; participation manufacturer_benefit, geographic_feasibility, demo_readiness, event_history, accessibility, meetup_fit. Participation concerns an in-person Meetup in Boulder, Colorado.`,
      });
      const parsed=researchSchema.parse(response.output_parsed);
      const sourceIds=new Map<string,string>();
      const cited=response.output.flatMap(item=>item.type==="message"?item.content.flatMap(part=>part.type==="output_text"?part.annotations:[]):[]);
      const searchSources=response.output.flatMap(item=>item.type==="web_search_call"&&item.action&&"sources" in item.action?(item.action.sources||[]):[]);
      for(const source of parsed.sources){
        const metadata={inline_citations:cited.filter(c=>"url" in c&&c.url===source.url),search_sources:searchSources.filter(s=>"url" in s&&s.url===source.url)};
        const {data}=await db.from("research_sources").upsert({workspace_id:workspaceId,vendor_id:vendor.id,url:source.url,title:source.title,publisher:source.publisher,evidence_summary:source.summary,is_official:source.is_official,supported_fields:source.supported_fields,citation_metadata:JSON.parse(JSON.stringify(metadata))},{onConflict:"vendor_id,url"}).select("id").single();
        if(data)sourceIds.set(source.url,data.id);
      }
      for(const source of searchSources){
        if(!("url" in source)||!source.url||sourceIds.has(source.url))continue;
        const {data}=await db.from("research_sources").upsert({workspace_id:workspaceId,vendor_id:vendor.id,url:source.url,title:"title" in source?String(source.title||source.url):source.url,publisher:new URL(source.url).hostname,evidence_summary:"Consulted by hosted web search",citation_metadata:JSON.parse(JSON.stringify(source))},{onConflict:"vendor_id,url"}).select("id").single();
        if(data)sourceIds.set(source.url,data.id);
      }
      const officialWebsite=parsed.website_url&&parsed.sources.some(s=>s.url.startsWith(new URL(parsed.website_url!).origin)&&s.is_official)?parsed.website_url:null;
      await db.from("vendors").update({website_url:officialWebsite||vendor.website_url,iso_country_code:countryCode(parsed.country_code)||vendor.iso_country_code,country:countryName(parsed.country_code)||vendor.country,research_status:"completed",last_researched_at:new Date().toISOString()}).eq("id",vendor.id);
      for(const location of parsed.locations){
        await db.from("vendor_locations").insert({workspace_id:workspaceId,vendor_id:vendor.id,location_type:location.type,country:countryName(location.country_code),iso_country_code:countryCode(location.country_code),us_state_code:isUsCountry(location.country_code)?stateCode(location.state_code):null,city:location.city,source_url:location.source_url,verified_at:new Date().toISOString()});
        if(location.type==="headquarters"&&isUsCountry(location.country_code))await db.from("vendors").update({us_state_code:stateCode(location.state_code),headquarters_city:location.city}).eq("id",vendor.id);
      }
      for(const contact of parsed.contacts)await db.from("contacts").insert({workspace_id:workspaceId,vendor_id:vendor.id,name:contact.name,job_title:contact.title,business_email:contact.email_status==="confirmed"?contact.business_email:null,email_status:contact.business_email?contact.email_status:"unknown",contact_form_url:contact.contact_url,source_url:contact.source_url,verification_status:"source_checked",verified_at:new Date().toISOString()});
      const {data:robots}=await db.from("robots").select("id,name").eq("vendor_id",vendor.id);
      for(const robot of robots||[]) {
        const finding=parsed.robots.find(r=>r.name.toLowerCase()===robot.name.toLowerCase());
        if(finding)await db.from("robots").update({product_url:finding.product_url,description:finding.description,development_status:finding.development_status,research_status:"completed",last_researched_at:new Date().toISOString()}).eq("id",robot.id);
        for(const facet of parsed.excitement.filter(f=>f.robot_name.toLowerCase()===robot.name.toLowerCase()))await db.from("ratings").upsert({workspace_id:workspaceId,kind:"excitement",robot_id:robot.id,criterion_key:facet.criterion_key,ai_rating:facet.rating,ai_rationale:facet.rationale,ai_confidence:facet.confidence,source_ids:facet.source_urls.map(url=>sourceIds.get(url)).filter((v):v is string=>!!v),researched_at:new Date().toISOString()},{onConflict:"robot_id,criterion_key"});
        const {data:opportunities}=await db.from("opportunities").select("id").eq("robot_id",robot.id);
        for(const opportunity of opportunities||[])for(const facet of parsed.participation.filter(f=>f.robot_name.toLowerCase()===robot.name.toLowerCase()))await db.from("ratings").upsert({workspace_id:workspaceId,kind:"participation",opportunity_id:opportunity.id,criterion_key:facet.criterion_key,ai_rating:facet.rating,ai_rationale:facet.rationale,ai_confidence:facet.confidence,source_ids:facet.source_urls.map(url=>sourceIds.get(url)).filter((v):v is string=>!!v),researched_at:new Date().toISOString()},{onConflict:"opportunity_id,criterion_key"});
      }
      await db.from("research_jobs").update({status:"completed",finished_at:new Date().toISOString(),usage:response.usage as never}).eq("id",job.id);
      results.push({id:job.id,status:"completed"});
    } catch(e) {
      const message=e instanceof Error?e.message:"Research failed";
      await db.from("research_jobs").update({status:job.attempts>=2?"failed":"queued",error:message.slice(0,500),scheduled_at:new Date(Date.now()+Math.min(3600000,60000*2**job.attempts)).toISOString()}).eq("id",job.id);
      results.push({id:job.id,status:"failed"});
    }
  }
  return Response.json({processed:results.length,results});
}
