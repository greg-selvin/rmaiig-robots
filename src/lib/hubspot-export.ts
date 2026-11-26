import { escapeHtml } from "./html";
import { resolvedCategories, type ExportCategory, type HubspotExportOptions } from "./hubspot-export-options";
import type { ExportFile } from "./export-zip";

export type ExportRow = Record<string, unknown>;
export type ExportData = Record<string, ExportRow[]>;

export const categoryTables: Record<ExportCategory, string[]> = {
  companies: ["vendors", "organization_roles", "organization_types", "ecosystem_roles", "vendor_locations", "distributor_vendor_links"],
  contacts: ["contacts"],
  outreach: ["opportunities", "distributor_outreach", "pipeline_stages", "distributor_robot_selections"],
  comments: ["record_notes", "interactions", "distributor_interactions"],
  tasks: ["record_notes", "interactions", "distributor_interactions", "opportunities", "distributor_outreach"],
  robots: ["robots", "robot_company_links"],
  meetups: ["meetups"],
  research: ["research_sources", "ratings", "scoring_models", "scoring_criteria"],
  history: ["stage_history", "audit_events", "import_batches"],
  settings: ["workspaces", "workspace_members", "access_requests", "email_templates", "research_jobs"],
};

export function exportTables(categories: ExportCategory[]) {
  return [...new Set([
    ...resolvedCategories(categories).flatMap(category => categoryTables[category]),
    "robots", "robot_company_links", "meetups", "opportunities", "distributor_outreach", "pipeline_stages", "workspace_members",
    ...(categories.includes("contacts") && categories.includes("outreach") ? ["interactions", "distributor_interactions"] : []),
  ])];
}

export function csvCell(value: unknown) {
  let text = value === null || value === undefined ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
  if (/^[\s\u0000-\u001f]*[=+@-]/u.test(text) || /^[\t\r]/u.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function csvText(headers: string[], rows: unknown[][]) {
  return "\ufeff" + [headers, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

function value(row: ExportRow | undefined, key: string): string {
  const item = row?.[key];
  return item === null || item === undefined ? "" : typeof item === "object" ? JSON.stringify(item) : String(item);
}

function details(row: ExportRow) {
  return Object.entries(row).filter(([, item]) => item !== null && item !== undefined && item !== "")
    .map(([key, item]) => `${key.replaceAll("_", " ")}: ${typeof item === "object" ? JSON.stringify(item, null, 2) : String(item)}`).join("\n");
}

function activityDate(input: string, fallback: string) {
  const date = new Date(input || fallback);
  return (Number.isNaN(date.getTime()) ? new Date(fallback) : date).toISOString().replace("T", " ").slice(0, 19);
}

export function buildHubspotExport(data: ExportData, options: HubspotExportOptions, exportedAt = new Date().toISOString()) {
  const selected = new Set(resolvedCategories(options.categories));
  const rows = (table: string) => data[table] || [];
  const byId = (table: string) => new Map(rows(table).map(row => [value(row, "id"), row]));
  const companies = byId("vendors");
  const robots = byId("robots");
  const opportunities = byId("opportunities");
  const outreach = byId("distributor_outreach");
  const meetups = byId("meetups");
  const profiles = byId("profiles");
  const stages = byId("pipeline_stages");
  const files: ExportFile[] = [];
  const warnings: unknown[][] = [];
  const counts: Record<string, number> = {};
  const noteRows: unknown[][] = [];
  const taskRows: unknown[][] = [];
  const companyRows: unknown[][] = [];
  const contactRows: unknown[][] = [];
  const dealRows: unknown[][] = [];
  const contactAssociations: unknown[][] = [];
  const dealAssociations: unknown[][] = [];
  const contactDealAssociations = new Map<string, unknown[]>();
  const exportedContacts = new Set<string>();
  const companyKey = (id: string) => `rmaiig:company:${id}`;
  const dealKey = (table: string, id: string) => `rmaiig:${table}:${id}`;
  let referenceUsed = false;
  const referenceKey = "rmaiig:workspace-reference";
  const companyTarget = (id: string) => {
    if (companies.has(id)) return companyKey(id);
    referenceUsed = true;
    return referenceKey;
  };
  const robotCompanies = (robotId: string) => [...new Set([
    value(robots.get(robotId), "vendor_id"),
    ...rows("robot_company_links").filter(link => value(link, "robot_id") === robotId).map(link => value(link, "vendor_id")),
  ].filter(id => companies.has(id)))];
  function targets(row: ExportRow) {
    const opportunity = opportunities.get(value(row, "opportunity_id"));
    const independent = outreach.get(value(row, "outreach_id"));
    const ids = [...new Set([
      value(row, "vendor_id"), value(row, "distributor_id"), value(row, "organization_id"),
      value(opportunity, "vendor_id"), value(independent, "distributor_id"),
      ...robotCompanies(value(row, "robot_id")),
    ].filter(id => companies.has(id)))];
    const deals = selected.has("outreach") ? [
      ...(opportunity ? [dealKey("opportunities", value(opportunity, "id"))] : []),
      ...(independent ? [dealKey("distributor_outreach", value(independent, "id"))] : []),
    ] : [];
    return { company: ids.length ? companyTarget(ids[0]) : companyTarget(""), deal: deals[0] || "", companyIds: ids };
  }
  function note(table: string, row: ExportRow, title: string, text = details(row), explicitCompany?: string) {
    const target = targets(row);
    const actor = profiles.get(value(row, "created_by") || value(row, "team_member_id") || value(row, "actor_id"));
    const author = value(row, "author_name") || value(actor, "display_name") || [value(actor, "first_name"), value(actor, "last_name")].filter(Boolean).join(" ") || value(row, "created_by") || value(row, "team_member_id") || value(row, "actor_id") || "Not recorded";
    const sourceId = value(row, "id") || value(row, "user_id") || JSON.stringify(row);
    const prefix = `${title.slice(0, 200)}\nSource: ${table}/${sourceId.slice(0, 300)}\nOriginal author: ${author.slice(0, 300)}\nRobot: ${value(robots.get(value(row, "robot_id")), "name").slice(0, 200)}\n`;
    const contactId = table === "contacts" ? value(row, "id") : value(row, "contact_id");
    const chars = Array.from(text);
    const parts = Math.max(1, Math.ceil(chars.length / 8000));
    for (let part = 0; part < parts; part++) {
      const body = prefix + (parts > 1 ? `Part ${part + 1} of ${parts}\n` : "") + chars.slice(part * 8000, (part + 1) * 8000).join("");
      noteRows.push([`<p>${escapeHtml(body).replaceAll("\n", "<br>")}</p>`, activityDate(value(row, "occurred_at") || value(row, "changed_at") || value(row, "created_at"), exportedAt), explicitCompany || target.company, target.deal, exportedContacts.has(contactId) ? `rmaiig:contact:${contactId}` : ""]);
    }
    if (parts > 1) warnings.push([table, sourceId, `Full text split into ${parts} numbered notes to fit HubSpot limits`]);
  }
  function addCsv(name: string, headers: string[], items: unknown[][]) {
    counts[name] = items.length;
    if (!items.length) return;
    const header = csvText(headers, []);
    let content = header;
    let bytes = Buffer.byteLength(content);
    let part = 1;
    for (const row of items) {
      const line = row.map(csvCell).join(",") + "\r\n";
      const size = Buffer.byteLength(line);
      if (size > 15_000_000) throw new Error(`A row in ${name} exceeds the import file size limit`);
      if (bytes + size > 15_000_000 && content !== header) {
        files.push({ name: `hubspot/${name}-${String(part++).padStart(3, "0")}.csv`, content });
        content = header;
        bytes = Buffer.byteLength(header);
      }
      content += line;
      bytes += size;
    }
    files.push({ name: `hubspot/${name}-${String(part).padStart(3, "0")}.csv`, content });
  }

  for (const company of rows("vendors")) {
    const id = value(company, "id");
    const roles = rows("organization_roles").filter(role => value(role, "organization_id") === id).map(role => value(role, "role_key"));
    companyRows.push([companyKey(id), value(company, "name"), value(company, "website_url"), value(company, "description").slice(0, 8000)]);
    note("vendors", company, `Organization profile: ${value(company, "name")}`, details(company) + `\nEcosystem roles: ${roles.join(", ")}`, companyKey(id));
  }
  for (const table of ["vendor_locations", "distributor_vendor_links", "organization_roles"]) {
    for (const row of rows(table)) note(table, row, `Organization ${table.replaceAll("_", " ")}`);
  }

  if (selected.has("contacts")) {
    const emails = new Set<string>();
    for (const contact of rows("contacts")) {
      const id = value(contact, "id");
      const email = value(contact, "business_email").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || emails.has(email)) {
        note("contacts", contact, `Contact profile: ${value(contact, "name") || email || id}`);
        warnings.push(["contacts", id, emails.has(email) ? "Shared email: this distinct source contact is preserved as a company note and in the archive" : "Missing or invalid email: preserved as a company note and in the archive; no email invented"]);
        continue;
      }
      emails.add(email);
      exportedContacts.add(id);
      note("contacts", contact, `Contact profile: ${value(contact, "name") || email || id}`);
      const name = value(contact, "name").trim().split(/\s+/);
      const key = `rmaiig:contact:${id}`;
      contactRows.push([key, email, name[0] || "", name.slice(1).join(" "), value(contact, "job_title"), value(contact, "business_phone")]);
      contactAssociations.push([key, companyTarget(value(contact, "vendor_id"))]);
    }
  }

  if (selected.has("outreach")) {
    for (const table of ["opportunities", "distributor_outreach"]) {
      for (const row of rows(table)) {
        const id = value(row, "id");
        const companyId = value(row, "vendor_id") || value(row, "distributor_id");
        const robot = robots.get(value(row, "robot_id"));
        const meetup = meetups.get(value(row, "meetup_id"));
        const sourceStage = value(row, "stage_id");
        const stageName = value(stages.get(sourceStage), "name") || value(row, "stage_name_snapshot") || "Unassigned";
        const key = dealKey(table, id);
        const name = [value(companies.get(companyId), "name") || "Unknown organization", value(robot, "name") || "Organization outreach", value(meetup, "name") || value(row, "meetup_name_snapshot")].filter(Boolean).join(" · ");
        dealRows.push([key, name, options.pipeline, options.stageMapping[sourceStage] || options.defaultStage, `Source stage: ${stageName}\nRobot: ${value(robot, "name")} (${value(row, "robot_id")})\nMeetup: ${value(meetup, "name") || value(row, "meetup_name_snapshot")}\n${details(row)}`.slice(0, 8000)]);
        dealAssociations.push([key, companyTarget(companyId)]);
        note(table, { ...row, ...(table === "opportunities" ? { opportunity_id: id } : { outreach_id: id }) }, `Outreach history: ${name}`, `Original stage: ${stageName}\n${details(row)}`);
      }
    }
    for (const row of rows("distributor_robot_selections")) note("distributor_robot_selections", row, "Selected outreach robot");
  }

  if (selected.has("comments")) {
    for (const table of ["record_notes", "interactions", "distributor_interactions"]) {
      for (const row of rows(table)) note(table, row, value(row, "subject") || `Original ${value(row, "interaction_type") || "comment"}`);
    }
  }

  if (selected.has("contacts") && selected.has("outreach")) {
    for (const table of ["interactions", "distributor_interactions"]) {
      for (const row of rows(table)) {
        const contactId = value(row, "contact_id");
        const target = targets(row);
        if (exportedContacts.has(contactId) && target.deal) {
          const key = `rmaiig:contact:${contactId}`;
          contactDealAssociations.set(`${key}|${target.deal}`, [key, target.deal]);
        }
      }
    }
  }

  if (selected.has("tasks")) {
    for (const table of ["record_notes", "interactions", "distributor_interactions", "opportunities", "distributor_outreach"]) {
      for (const row of rows(table)) {
        const date = value(row, "follow_up_date") || value(row, "next_action_date");
        if (!date) continue;
        const companyId = value(row, "vendor_id") || value(row, "distributor_id");
        const meetupName = value(meetups.get(value(row, "meetup_id")), "name") || value(row, "meetup_name_snapshot") || "Past Meetup";
        const legacyBody = [
          table === "opportunities" ? `Outreach history: ${meetupName} · ${value(robots.get(value(row, "robot_id")), "name")}` : `DI Outreach history: ${meetupName}`,
          value(row, "outreach_summary").trim() && `Outreach summary: ${value(row, "outreach_summary").trim()}`,
          value(row, "next_action").trim() && `Next action: ${value(row, "next_action").trim()}`,
          `Next action due: ${date}`,
          value(row, "outcome").trim() && `Outcome: ${value(row, "outcome").trim()}`,
        ].filter(Boolean).join("\n");
        if (["opportunities", "distributor_outreach"].includes(table) && rows("record_notes").some(note => note.is_legacy && value(note, "author_name") === "Imported from Outreach" && value(note, "vendor_id") === companyId && value(note, "follow_up_date") === date && value(note, "body") === legacyBody)) {
          warnings.push([table, value(row, "id"), "Exact legacy outreach follow-up already represented by its migrated comment; no second task created"]);
          continue;
        }
        const target = targets(row);
        const due = new Date(date);
        if (Number.isNaN(due.getTime())) {
          warnings.push([table, value(row, "id"), "Invalid follow-up date: preserved in source archive and reference note"]);
          note(table, row, "Follow-up with invalid date");
          continue;
        }
        const taskTarget = selected.has("outreach") && ["opportunities", "distributor_outreach"].includes(table) ? dealKey(table, value(row, "id")) : target.deal;
        const contactId = value(row, "contact_id");
        if (details(row).length > 29000 && !selected.has("comments") && !selected.has("outreach")) note(table, row, "Full follow-up details");
        taskRows.push([`Follow up: ${(value(row, "next_action") || value(row, "subject") || value(row, "body") || value(row, "summary") || value(row, "id")).slice(0, 180)}`, date.slice(0, 10), row.follow_up_completed ? "Completed" : "Not started", `Source: ${table}/${value(row, "id")}\n${details(row)}`.slice(0, 30000), target.company, taskTarget, exportedContacts.has(contactId) ? `rmaiig:contact:${contactId}` : ""]);
      }
    }
  }

  if (selected.has("robots")) {
    for (const robot of rows("robots")) {
      const ids = robotCompanies(value(robot, "id"));
      for (const company of ids.length ? ids : [""]) note("robots", robot, `Robot profile: ${value(robot, "name")}`, details(robot) + `\nAssociated organizations: ${ids.map(id => `${value(companies.get(id), "name")} (${id})`).join(", ")}`, companyTarget(company));
    }
    for (const row of rows("robot_company_links")) note("robot_company_links", row, "Robot organization association");
  }

  if (selected.has("meetups")) {
    for (const meetup of rows("meetups")) {
      const linked = [...rows("opportunities"), ...rows("distributor_outreach")].filter(row => value(row, "meetup_id") === value(meetup, "id"));
      const ids = [...new Set(linked.map(row => value(row, "vendor_id") || value(row, "distributor_id")).filter(id => companies.has(id)))];
      for (const company of ids.length ? ids : [""]) note("meetups", meetup, `Meetup: ${value(meetup, "name")}`, details(meetup), companyTarget(company));
    }
  }

  for (const category of ["research", "history", "settings"] as const) {
    if (!selected.has(category)) continue;
    for (const table of categoryTables[category]) {
      for (const row of rows(table)) {
        let target = row;
        if (table === "audit_events") {
          const entityId = value(row, "entity_id");
          target = { ...row, ...(companies.has(entityId) ? { vendor_id: entityId } : robots.has(entityId) ? { robot_id: entityId } : opportunities.has(entityId) ? { opportunity_id: entityId } : outreach.has(entityId) ? { outreach_id: entityId } : {}) };
        }
        note(table, target, `RMAIIG ${table.replaceAll("_", " ")}`, details(row));
      }
    }
  }

  if (referenceUsed) companyRows.push([referenceKey, "RMAIIG workspace reference", "", "Reference container for workspace settings and records without an organization. This is not a business prospect."]);
  addCsv("01-companies", ["RMAIIG Company ID", "Company name", "Website URL", "Description"], companyRows);
  addCsv("02-contacts", ["RMAIIG Contact ID", "Email", "First name", "Last name", "Job title", "Phone number"], contactRows);
  addCsv("03-deals", ["RMAIIG Deal ID", "Deal name", "Pipeline", "Deal stage", "Deal description"], dealRows);
  addCsv("04-contact-companies", ["RMAIIG Contact ID", "RMAIIG Company ID"], contactAssociations);
  addCsv("05-deal-companies", ["RMAIIG Deal ID", "RMAIIG Company ID"], dealAssociations);
  addCsv("05b-contact-deals", ["RMAIIG Contact ID", "RMAIIG Deal ID"], [...contactDealAssociations.values()]);
  addCsv("06-notes", ["Note body", "Activity date", "RMAIIG Company ID", "RMAIIG Deal ID", "RMAIIG Contact ID"], noteRows);
  addCsv("07-tasks", ["Task title", "Due date", "Task status", "Task notes", "RMAIIG Company ID", "RMAIIG Deal ID", "RMAIIG Contact ID"], taskRows);

  const archiveTables = new Set([...selected].flatMap(category => categoryTables[category]));
  for (const table of archiveTables) {
    files.push({ name: `archive/${table}.json`, content: JSON.stringify(rows(table), null, 2) });
  }
  files.push({ name: "archive/profiles.json", content: JSON.stringify(rows("profiles"), null, 2) });
  files.push({ name: "reports/exceptions.csv", content: csvText(["Source table", "Source ID", "Handling"], warnings) });
  files.push({ name: "manifest.json", content: JSON.stringify({ format: "rmaiig-hubspot-basic-v1", exportedAt, requestedCategories: options.categories, includedCategories: [...selected], sourceCounts: Object.fromEntries([...archiveTables].map(table => [table, rows(table).length])), outputRows: counts, exceptions: warnings.length, pipeline: options.pipeline, defaultStage: options.defaultStage, stageMapping: options.stageMapping, snapshot: "Paginated reads during export; not a transaction snapshot. Avoid editing while exporting." }, null, 2) });
  files.push({ name: "START-HERE.txt", content: importInstructions(options, counts) });
  files.push({ name: "reports/property-setup.csv", content: csvText(["Object", "Property label", "Field type", "Require unique values"], [["Company", "RMAIIG Company ID", "Single-line text", "Yes"], ["Contact", "RMAIIG Contact ID", "Single-line text", "Yes"], ["Deal", "RMAIIG Deal ID", "Single-line text", "Yes"]]) });
  return { files, counts, warnings };
}

function importInstructions(options: HubspotExportOptions, counts: Record<string, number>) {
  return `RMAIIG Robots → HubSpot basic import

1. Review reports/exceptions.csv and manifest.json. Keep this ZIP as your migration receipt. Export while workspace editing is paused. This export does not send emails, connect to HubSpot, or change source data.
2. In HubSpot create the three single-line text properties in reports/property-setup.csv, with unique values required. Source UUIDs are NOT HubSpot Record IDs. These custom properties are used for associations and repeat imports. No Enterprise objects or custom association labels are used.
3. Confirm the existing pipeline "${options.pipeline}" and the configured destination stages. Default destination stage: "${options.defaultStage}". Source stages, owners, collaborators, robot IDs, and Meetup details are preserved in descriptions/notes. HubSpot users are not created or assigned automatically. If your account cannot create unique properties, stop and use a HubSpot Record ID crosswalk before importing association files.
4. Import hubspot/ files in numerical order. Every numbered part is a separate file; empty file groups are omitted. In Advanced imports, select Companies for 01, Contacts for 02, Deals for 03. Map each RMAIIG ID column to its custom property and select it as the unique identifier. Map the remaining headers to their matching default HubSpot properties. Description → company Description; Deal description → deal Description. Review existing HubSpot records by email/domain first to avoid collisions; pilot before the full import. Keep contacts non-marketing.
5. For 04 choose Contacts + Companies and update existing records only. For 05 choose Deals + Companies and update existing records only. Map both ID columns to the corresponding object's unique property. For 05b choose Contacts + Deals and update existing records only, mapping both RMAIIG IDs. These files only establish associations.
6. For 06 choose Notes + Companies${counts["03-deals"] ? " + Deals" : ""}${counts["02-contacts"] ? " + Contacts" : ""}; create new Notes and update existing Companies${counts["03-deals"] ? "/Deals" : ""} only. Map Note body and Activity date to Note properties, and ID columns to the associated objects. Where a deal ID is blank, the note belongs to the company only. Skip completely empty Deal ID or Contact ID columns if those objects were not exported. For 07 do the same with Tasks, mapping Task title, Due date, Task status, Task notes, and association IDs.
7. Select year-month-day dates and UTC for activity times. Due dates are calendar dates. Original source timestamps remain in notes/archive. Original authors are written into note text; they are not impersonated as HubSpot users. Long text is split into numbered notes without truncation. HTML is escaped. CSV cells that could execute spreadsheet formulas are prefixed with an apostrophe; originals are retained in archive JSON.
8. Verify imported counts against manifest.json, sample company timelines and deal associations, and retain HubSpot import receipts/IDs. NEVER blindly re-import 06 or 07: HubSpot creates new notes/tasks on each import and cannot update them through CSV. Retry only confirmed failed rows. Source IDs in note/task text identify the original record.

Basic-plan representations
- Robots and Meetups are readable notes on associated companies, not custom objects. A shared robot/Meetup can produce a reference note on several companies. Relationship tables are represented as notes with original IDs; they are not native company-to-company associations.
- Every selected source table is also preserved in archive/*.json. Archive and reports files are reference material, not HubSpot import files.
- Contacts without valid unique email addresses remain complete company notes and archive records; no fake email is created. Distinct contacts sharing an email are listed in exceptions.
- Legacy comments are retained as distinct source records. Older outreach fields already migrated into comments remain in outreach history notes. Follow-ups duplicated by that legacy migration are reported rather than creating another task.
- Ratings, evidence, multiple locations, settings, templates, and history are reference notes. Unassociated records go on the explicitly named RMAIIG workspace reference company.
- Organizations are automatically included as association targets. Other unchecked categories are not exported as profiles/history; necessary IDs and names may still appear as context.

Official import guidance:
https://knowledge.hubspot.com/import-and-export/set-up-your-import-file
https://knowledge.hubspot.com/import-and-export/import-objects
`;
}
