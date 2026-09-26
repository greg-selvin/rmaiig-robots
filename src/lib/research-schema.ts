import { z } from "zod";
import { countryCode } from "./geo-codes";

const countryCodeSchema=z.string().regex(/^[A-Z]{2,3}$/i).nullable().transform(value=>value?countryCode(value):null);
export const researchSchema = z.object({
  vendor_name: z.string().nullable(),
  website_url: z.url().nullable(),
  country_code: countryCodeSchema,
  locations: z.array(z.object({
    type: z.string(), country_code: countryCodeSchema,
    state_code: z.string().length(2).nullable(), city: z.string().nullable(),
    source_url: z.url(),
  })),
  robots: z.array(z.object({
    name: z.string(), product_url: z.url().nullable(),
    description: z.string().nullable(), development_status: z.string().nullable(),
  })),
  contacts: z.array(z.object({
    name: z.string().nullable(), title: z.string().nullable(),
    business_email: z.email().nullable(), email_status: z.enum(["confirmed","inferred","unverified","unknown"]),
    contact_url: z.url().nullable(), source_url: z.url(),
  })),
  sources: z.array(z.object({
    url: z.url(), title: z.string(), publisher: z.string(),
    summary: z.string(), is_official: z.boolean(), supported_fields: z.array(z.string()),
  })),
  excitement: z.array(z.object({ robot_name: z.string(), criterion_key: z.string(), rating: z.number().int().min(1).max(5).nullable(), rationale: z.string(), confidence: z.number().min(0).max(1), source_urls: z.array(z.url()) })),
  participation: z.array(z.object({ robot_name: z.string(), criterion_key: z.string(), rating: z.number().int().min(1).max(5).nullable(), rationale: z.string(), confidence: z.number().min(0).max(1), source_urls: z.array(z.url()) })),
});
