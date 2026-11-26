import { z } from "zod";

export const exportCategories = [
  { key: "companies", label: "Organizations", detail: "Companies, classifications, roles, locations, and organization links" },
  { key: "contacts", label: "Contacts", detail: "People, company associations, primary-contact indicators, and contact notes" },
  { key: "outreach", label: "Outreach and opportunities", detail: "Deals for both outreach workflows, including robot and Meetup context" },
  { key: "comments", label: "Comments and interactions", detail: "Individual timeline notes with original authors, dates, and full text" },
  { key: "tasks", label: "Follow-up tasks", detail: "Due dates and completion status from comments, interactions, and outreach" },
  { key: "robots", label: "Robot profiles", detail: "Company notes containing every robot and its organization associations" },
  { key: "meetups", label: "Meetups", detail: "Meetup details preserved as company notes" },
  { key: "research", label: "Research and ratings", detail: "Sources, evidence, ratings, rationale, and scoring definitions" },
  { key: "history", label: "History", detail: "Stage changes, audit events, and original import history" },
  { key: "settings", label: "Workspace reference", detail: "Templates, workspace settings, membership, access requests, and research jobs" },
] as const;

export type ExportCategory = typeof exportCategories[number]["key"];
export const exportCategoryKeys = exportCategories.map(category => category.key);
export const hubspotExportSchema = z.object({
  categories: z.array(z.enum(exportCategoryKeys as [ExportCategory, ...ExportCategory[]])).min(1).max(exportCategories.length),
  pipeline: z.string().trim().min(1).max(200).default("Sales Pipeline"),
  defaultStage: z.string().trim().min(1).max(200).default("Appointment scheduled"),
  stageMapping: z.record(z.string().max(100), z.string().trim().min(1).max(200)).default({}),
});
export type HubspotExportOptions = z.infer<typeof hubspotExportSchema>;

export function resolvedCategories(selected: ExportCategory[]): ExportCategory[] {
  return [...new Set<ExportCategory>(["companies", ...selected])];
}
