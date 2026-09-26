import { z } from "zod";
import { countryCode } from "./geo-codes";

const nullableText = z.string().nullable().optional();
const countryCodeSchema = z.string().trim().min(2).max(100).nullable().transform((value,ctx)=>{if(!value)return null;const code=countryCode(value);if(!code){ctx.addIssue({code:"custom",message:"Use a known ISO alpha-2 or alpha-3 code, or a country name"});return z.NEVER;}return code;});
const sourceSchema = z.object({
  id: z.string().uuid().optional(), url: z.url(), title: nullableText, publisher: nullableText,
  accessed_at: z.iso.datetime().optional(), evidence_summary: nullableText,
  supported_fields: z.array(z.string()).nullable().optional(), confidence: z.number().min(0).max(1).nullable().optional(),
  is_official: z.boolean().optional(), citation_metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});
const ratingSchema = z.object({
  criterion_key: z.string().trim().min(1), ai_rating: z.number().int().min(1).max(5).nullable().optional(),
  ai_rationale: nullableText, ai_confidence: z.number().min(0).max(1).nullable().optional(),
  manual_rating: z.number().int().min(1).max(5).nullable().optional(), manual_rationale: nullableText,
  needs_review: z.boolean().optional(), researched_at: z.iso.datetime().nullable().optional(), source_urls: z.array(z.url()).optional(),
});
const contactSchema = z.object({
  id: z.string().uuid().optional(), name: nullableText, job_title: nullableText, department: nullableText,
  business_email: z.email().nullable().optional(), business_phone: nullableText, contact_form_url: z.url().nullable().optional(),
  profile_url: z.url().nullable().optional(), location: nullableText, preferred: z.boolean().optional(), contact_type: nullableText,
  verification_status: z.string().optional(), email_status: z.enum(["confirmed","inferred","unverified","invalid","unknown"]).optional(),
  source_url: z.url().nullable().optional(), verified_at: z.iso.datetime().nullable().optional(), notes: nullableText,
}).superRefine((contact, ctx) => {
  if (!contact.business_email && !contact.business_phone && !contact.contact_form_url && !contact.profile_url) {
    ctx.addIssue({ code: "custom", message: "Contact needs an email, phone, contact form URL, or profile URL" });
  }
});
const locationSchema = z.object({
  id: z.string().uuid().optional(), location_type: z.string().optional(), country: nullableText,
  iso_country_code: countryCodeSchema.optional(), region: nullableText,
  us_state_code: z.string().length(2).nullable().optional(), city: nullableText, postal_code: nullableText,
  source_url: z.url().nullable().optional(), verified_at: z.iso.datetime().nullable().optional(), is_primary: z.boolean().optional(),
});
const participationSchema = ratingSchema.extend({ meetup_id: z.string().uuid().optional(), meetup_name: z.string().trim().min(1).optional() })
  .refine((rating) => Boolean(rating.meetup_id || rating.meetup_name), "Participation rating needs meetup_id or meetup_name");
const robotSchema = z.object({
  id: z.string().uuid().optional(), name: z.string().trim().min(1), original_imported_text: nullableText,
  product_url: z.url().nullable().optional(), description: nullableText, development_status: nullableText,
  commercial_availability: nullableText, mobility: nullableText, manipulation: nullableText,
  interaction_capabilities: nullableText, demonstration_capabilities: nullableText, image_urls: z.array(z.url()).nullable().optional(),
  research_status: z.string().optional(), last_researched_at: z.iso.datetime().nullable().optional(), manual_notes: nullableText,
  parsing_review_status: z.enum(["clear","needs_review","reviewed"]).optional(), sources: z.array(sourceSchema).optional(),
  excitement: z.array(ratingSchema).optional(), participation: z.array(participationSchema).optional(),
});
export const vendorImportSchema = z.object({
  id: z.string().uuid().optional(), name: z.string().trim().min(1), original_source_name: nullableText,
  source_row: z.number().int().positive().nullable().optional(), source_rank: z.number().int().positive().nullable().optional(),
  original_robot_text: nullableText, original_import_data: z.unknown().nullable().optional(), country: nullableText,
  iso_country_code: countryCodeSchema.optional(), headquarters_city: nullableText, headquarters_region: nullableText,
  us_state_code: z.string().length(2).nullable().optional(), headquarters_postal_code: nullableText,
  website_url: z.url().nullable().optional(), contact_url: z.url().nullable().optional(), product_urls: z.array(z.url()).nullable().optional(),
  description: nullableText, public_event_history: nullableText, strategic_fit: nullableText, research_status: z.string().optional(),
  last_researched_at: z.iso.datetime().nullable().optional(), manual_notes: nullableText,
  parsing_review_status: z.enum(["clear","needs_review","reviewed"]).optional(),
  contacts: z.array(contactSchema).optional(), locations: z.array(locationSchema).optional(),
  vendor_sources: z.array(sourceSchema).optional(), robots: z.array(robotSchema).optional(),
}).strict();
export const jsonImportSchema = z.object({ format: z.literal("rmaiig-robots-import/v1"), vendors: z.array(vendorImportSchema).min(1) }).strict();
export type JsonVendorImport = z.infer<typeof vendorImportSchema>;
export type JsonImport = z.infer<typeof jsonImportSchema>;

export function parseJsonImport(text: string): JsonImport {
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error("Invalid JSON file"); }
  const parsed = jsonImportSchema.safeParse(value);
  if (!parsed.success) throw new Error(`Invalid JSON import: ${parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).slice(0, 8).join("; ")}`);
  return parsed.data;
}
