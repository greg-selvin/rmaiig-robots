# HubSpot export

Administrators can open **Administration → Export to HubSpot**, check the desired categories, and click **Download HubSpot ZIP**. All ten categories start selected. Organizations are included automatically as association targets. The export reads the database again; it does not export the limited record arrays currently displayed by the app.

For outreach, enter the exact existing HubSpot pipeline and destination stage names. Each source stage can map to a different destination; blank mappings use the default destination stage. Defaults are suggestions for HubSpot's standard sales pipeline and must be checked against the destination account. No HubSpot connection or import is performed by this application.

## ZIP contents

| Import group | Objects and behavior |
| --- | --- |
| 01 companies | Every organization, plus an explicitly named workspace reference container when needed |
| 02 contacts | Contacts with a valid unique email; missing/shared emails become complete company notes and exceptions |
| 03 deals | One per robot opportunity or independent organization outreach record |
| 04 contact-companies | Existing-record associations using source ID properties |
| 05 deal-companies | Existing-record associations using source ID properties |
| 05b contact-deals | Distinct contact/deal associations evidenced by interactions |
| 06 notes | Separate comments/interactions, profiles, research, histories, and reference records from the selected categories |
| 07 tasks | Dated follow-ups with original completion status |

Empty import groups are omitted. CSVs use UTF-8 with a BOM, quoted fields, and CRLF record separators. Files split before 15 MB. Values that could execute spreadsheet formulas receive an apostrophe prefix; unmodified originals remain in the JSON archive.

`START-HERE.txt` gives the exact import order and mapping procedure. `reports/property-setup.csv` lists three custom single-line text properties with unique values: **RMAIIG Company ID**, **RMAIIG Contact ID**, and **RMAIIG Deal ID**. Source UUIDs must never be mapped to HubSpot Record ID. Destination accounts unable to create unique properties need a HubSpot Record ID crosswalk before association imports.

`manifest.json` records selections, included dependencies, source counts, output row counts, stage mappings, and the export timestamp. `reports/exceptions.csv` identifies contact fallbacks, long-text splitting, invalid follow-up dates, and exact migrated follow-up duplicates. `archive/*.json` preserves every field of the selected source tables, including source IDs and original timestamps. Lookup records may be read to resolve names and relationships without exporting their full profiles when their category is unchecked. Profile names are archived for attribution; authentication credentials, sessions, and keys are never queried.

## Basic subscription representations

- Organizations use Companies regardless of organization type. Their classifications, all ecosystem roles, multiple locations, company metrics, and original import information remain in profile/reference notes.
- Robots become company notes, including robots without opportunities and disqualified robots. Shared robots receive profile notes on their associated companies. Robot/company and distributor/vendor junctions remain readable relationship notes containing original IDs.
- Meetups become notes on participating companies. Unassociated Meetups and workspace reference records use the dedicated reference container.
- Current source stage, owner/collaborator IDs, robot/Meetup context, and original outreach fields remain in deal descriptions and full notes. No HubSpot owner assignment, extra pipeline, custom object, or custom association label is created automatically.
- Comments retain individual identity, full text, original author, original dates, edit metadata, type, and follow-up state. Original authors appear in text rather than being impersonated as HubSpot users. HTML is escaped. Text is split into numbered notes in Unicode-safe chunks, keeping note bodies below HubSpot's size limit. Calls/emails/meetings are represented as notes so incomplete historical activity metadata does not require invention.
- Existing legacy notes are retained as distinct source records. A follow-up task is suppressed only if the original outreach fields exactly reproduce a migrated `Imported from Outreach` comment for the same organization and due date. The migrated comment supplies its current completion status. Same-date tasks with different text remain separate.
- Ratings, rationale, evidence, sources, scoring definitions, templates, settings, membership, access requests, import history, research jobs, and audit history become reference notes when selected, with the original structured fields in the archive. This does not recreate application permissions or HubSpot's native audit/property history.
- Image and source URLs are preserved as links. Remote images/files are not downloaded into this ZIP.

Notes and tasks are create-only imports in HubSpot. Retain import receipts and retry only confirmed failed rows; a repeated activity import creates duplicates. A fresh export is not an incremental synchronization protocol. Export while editing is paused: pages are deterministically ordered and counts are reconciled, but updates within a stable record count cannot be detected and reads are not a transaction snapshot.

## Access and limits

`POST /api/export/hubspot` uses the existing authenticated Supabase client and requires the workspace admin role. Workspace tables are explicitly filtered to the authorized workspace, global classification catalogs are read separately, and profiles are restricted to referenced member/author/owner IDs under RLS. Neither a client-provided workspace nor a service-role bypass is accepted. The response uses private/no-store caching and a ZIP attachment filename. Invalid selections, cross-origin requests, database errors, short pages, and changing counts fail without producing a partial ZIP.

Source data is limited to 75 MB per request, and the final compressed response is limited to 4 MB to stay below the hosting response ceiling. Larger selections must be exported in smaller category groups. Repeated groups include company targets; import those using their unique source IDs, and avoid importing the same notes/tasks twice.

## Verification

Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `git diff --check`. Regression coverage includes role/origin restrictions, selection validation, stable source associations, contact fallbacks, both outreach workflows, stage mappings, source authors/timestamps, long Unicode comments, exact legacy task handling, formula-safe CSV round trips, independent Python ZIP/CRC validation, and pagination beyond UI limits.

The local browser smoke test uses synthetic data and checks empty selection, checkbox selection, outgoing category payload, and the ZIP download feedback. It does not establish a successful import into a real HubSpot account. Before production release, compare repository migrations with production using `supabase_rmaiig` as required by AGENTS.md. This feature adds no schema migration.

HubSpot references: [Import file requirements](https://knowledge.hubspot.com/import-and-export/set-up-your-import-file), [Multiple-object imports](https://knowledge.hubspot.com/import-and-export/import-objects).
