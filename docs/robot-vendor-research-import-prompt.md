# Standalone prompt: research vendors and robots for import

Copy everything between **PROMPT START** and **PROMPT END** into the other AI. Upload separately:

1. Your vendor and robot roster (the source of truth for which vendors and robot names to include).
2. Optionally, `examples/robots-import.v1.json` as a shape example. It is fictional; do not copy its example vendor, person, product claims, URLs, or ratings into the result.

Before sending, replace `TARGET_MEETUP` below with an existing meetup name or UUID if you want opportunity-specific participation ratings. Otherwise leave it blank.

---

## PROMPT START

You are preparing a complete, evidence-backed vendor and robot import for the RMAIIG Robots workspace. I have uploaded the source roster separately. I may also have uploaded a fictional example JSON file to illustrate the shape. Use the roster as the sole authority for which vendors and robots belong in this deliverable. Use the example only to understand JSON nesting and field spelling.

Target meetup for participation ratings: `TARGET_MEETUP`

### Coverage and research

Read every row in the uploaded roster. Produce exactly one vendor object for every distinct vendor/company in it, including vendors whose robot field is blank. Deduplicate vendors by case-insensitive, Unicode-normalized name, ignoring punctuation and repeated whitespace. Preserve the roster's original company spelling and any source row/rank values. Include every robot/model the roster clearly identifies under its vendor. Do not create vendors or robots that are absent from the roster. If a robot cell contains an ambiguous combined name or cannot be safely split, preserve the original text in `original_robot_text`, set the vendor or robot `parsing_review_status` to `needs_review` as applicable, and do not invent robot records from it.

Research every vendor and every identifiable robot. Fill as many fields as reliable research supports, not just the minimum required fields. Prefer official company, product, contact, and event pages; use credible independent sources when official sources do not cover a field. Use current information and record the date you accessed each source. Keep each claim tied to one or more source records at the vendor or robot level. Do not invent facts, people, contact details, capabilities, specifications, events, prices, availability, or URLs. Omit unknown values, or use `null` for an unknown nullable scalar. Do not use `null` as a substitute for an unsupported rating rationale.

Search for at least one usable public contact method for every vendor: `business_email`, `business_phone`, `contact_form_url`, or `profile_url`. If an individual is not identified, a vendor contact form is acceptable. Never guess email addresses. Mark email status honestly; inferred email is never confirmed. If no usable public method can be verified, set `contacts` to an empty array. Do not fabricate a contact or make the import file invalid because a vendor has no published contact route.

### Required output

Return exactly one JSON document, with no Markdown fence or commentary, in this top-level format:

```json
{
  "format": "rmaiig-robots-import/v1",
  "vendors": [
    {
      "name": "Vendor name from the uploaded roster",
      "contacts": [
        { "contact_form_url": "https://vendor.example/contact" }
      ],
      "robots": [
        { "name": "Robot name from the uploaded roster" }
      ]
    }
  ]
}
```

The uploaded example is optional guidance. This prompt contains the format and merge rules; do not require access to any repository, local path, website documentation file, or other attachment. The final output must be one complete import JSON file covering the whole roster. Do not return a sample, partial vendor batch, summary, or placeholder records. If response length is a constraint, create a downloadable `.json` file with the complete document instead of shortening it.

### Format and field names

Top level:

- `format`: required exact string `rmaiig-robots-import/v1`.
- `vendors`: required non-empty array.

Each vendor object:

- Required: `name` (non-empty string), `contacts` (non-empty array with at least one usable contact method per contact object), and each included robot's `name` (non-empty string).
- Optional vendor fields: `id`, `original_source_name`, `source_row`, `source_rank`, `original_robot_text`, `original_import_data`, `country`, `iso_country_code`, `headquarters_city`, `headquarters_region`, `us_state_code`, `headquarters_postal_code`, `website_url`, `contact_url`, `product_urls`, `description`, `public_event_history`, `strategic_fit`, `research_status`, `last_researched_at`, `manual_notes`, `parsing_review_status`, `locations`, `vendor_sources`, `robots`.
- `original_import_data` may preserve the relevant original roster values as a JSON object.

Each contact in `contacts`:

- Optional fields: `id`, `name`, `job_title`, `department`, `business_email`, `business_phone`, `contact_form_url`, `profile_url`, `location`, `preferred`, `contact_type`, `verification_status`, `email_status`, `source_url`, `verified_at`, `notes`.
- At least one of `business_email`, `business_phone`, `contact_form_url`, or `profile_url` must contain a usable value.
- `email_status` is one of `confirmed`, `inferred`, `unverified`, `invalid`, or `unknown`.

Each location in `locations`:

- Optional fields: `id`, `location_type`, `country`, `iso_country_code`, `region`, `us_state_code`, `city`, `postal_code`, `source_url`, `verified_at`, `is_primary`.

Each robot in `robots`:

- Required: `name`.
- Optional robot fields: `id`, `original_imported_text`, `product_url`, `description`, `development_status`, `commercial_availability`, `mobility`, `manipulation`, `interaction_capabilities`, `demonstration_capabilities`, `image_urls`, `research_status`, `last_researched_at`, `manual_notes`, `parsing_review_status`, `sources`, `excitement`, `participation`.

Each object in `vendor_sources` or a robot's `sources`:

- Required: `url` (valid URL).
- Optional fields: `id`, `title`, `publisher`, `accessed_at`, `evidence_summary`, `supported_fields`, `confidence`, `is_official`, `citation_metadata`.
- `supported_fields` is an array of field names supported by that source. `confidence`, when supplied, is from 0 to 1. `citation_metadata` is a JSON object.

Each rating in a robot's `excitement` or `participation` array:

- Required: `criterion_key`.
- Optional: `ai_rating`, `ai_rationale`, `ai_confidence`, `manual_rating`, `manual_rationale`, `needs_review`, `researched_at`, `source_urls`.
- Ratings are integers 1–5 or `null`; confidence is from 0 to 1. `source_urls` is an array of URLs that must also appear in that vendor's `vendor_sources` or that robot's `sources`.
- For this research task, populate AI fields only: `ai_rating`, `ai_rationale`, `ai_confidence`, `needs_review`, `researched_at`, and `source_urls`. Never set `manual_rating` or `manual_rationale`; omit them.
- Do not calculate or include derived score or priority fields. The application computes those from active workspace criteria.

Use ISO 8601 timestamps for `last_researched_at`, `verified_at`, `accessed_at`, and rating `researched_at`. Use three-letter ISO 3166-1 alpha-3 values for `iso_country_code`; use two-letter state abbreviations for `us_state_code` when applicable. URLs must be complete valid URLs. For nullable scalar fields, omit unknown fields or set them to `null`. For arrays, omit them if there is no evidence or no data; use `[]` only when you intentionally mean an empty scalar list such as `product_urls` or `image_urls`.

### Merge and identity rules

The importer supports both new records and updates. Shape the file to follow these rules:

- Vendor identity: use `id` only if I supplied a known workspace ID; otherwise matching uses normalized vendor `name` (case and punctuation-insensitive) in the workspace.
- Robot identity: use `id` only if I supplied a known ID; otherwise matching uses normalized robot `name` under its vendor.
- Contact identity: use `id` only if I supplied a known ID. Otherwise matching uses normalized `business_email`, then `profile_url`, then `contact_form_url`. If none matches, the importer adds a contact.
- Location identity: use `id` only if I supplied a known ID. Otherwise matching uses `location_type` and the supplied city/country fields.
- Source identity: matching uses source `id` when supplied, otherwise its URL within its vendor or robot.
- Rating identity: matching uses `criterion_key` for the robot's excitement rating or the robot's opportunity-specific participation rating.
- Never invent IDs. Unknown supplied IDs are invalid.
- Omitted properties mean preserve the existing value. An explicit `null` clears a nullable scalar.
- Supplied scalar arrays, including `product_urls` and `image_urls`, replace the existing array; `[]` therefore clears that scalar array.
- Object arrays (`contacts`, `locations`, `vendor_sources`, `robots`, robot `sources`, and ratings) upsert only the objects supplied. Omitting an object array or supplying it empty does not delete existing records absent from the file. The import format does not delete vendors, robots, or contacts.
- Omit `robots` if none are provided; an empty `robots` array also makes no deletions.
- Do not use empty strings to clear data; use `null` for nullable scalar fields.

### AI scoring rubric

Include a defensible AI rating for each criterion on every identifiable robot when reliable evidence supports it. Missing evidence is not a low score: use `null` for `ai_rating`, explain the evidence gap in `ai_rationale`, set a low `ai_confidence`, and set `needs_review` true. Cite supporting source URLs. Do not fill manual-rating fields.

Use these exact active criterion keys and meanings:

**Excitement**

- `live_impact`: How impressive its movements and capabilities appear in person.
- `attendee_interaction`: Whether attendees can speak with it, direct it, or hand it objects.
- `sophistication`: Mobility, manipulation, dexterity, autonomy, perception, and conversation.
- `distinctiveness`: What makes this robot noticeably different.
- `demo_range`: Whether it can perform several interesting actions.
- `audience_appeal`: Likely effect on attendance and word of mouth.

**Participation**

- `manufacturer_benefit`: Recruiting, publicity, customer exposure, or research relationships.
- `geographic_feasibility`: Distance, transport complexity, and nearby teams.
- `demo_readiness`: Reliability, safety, transportability, and preparation.
- `event_history`: Evidence of conferences, universities, or community events.
- `accessibility`: Ability to reach someone who could approve participation.
- `meetup_fit`: Alignment of an in-person technical Meetup with manufacturer goals.

Participation ratings belong to a robot's opportunity for one existing meetup, so each needs either `meetup_id` or `meetup_name` in the rating object. If `TARGET_MEETUP` above is a UUID, use `meetup_id`; if it is a name, use that exact name as `meetup_name`. If it is blank, omit participation rating objects. You may still put sourced participation-relevant facts in the vendor/robot research fields.

### Research targets

For vendors, research as many supported fields as evidence allows: official website and contact page, country and headquarters/location information, product URLs, a concise description, public event history, and strategic fit for an in-person robotics meetup. For contacts, find public outreach routes and source each detail. For robots, research product page, description, development stage, commercial availability, mobility, manipulation, interaction, and demonstrable capabilities. Add images only when a real, publicly accessible image URL is available. Add location records when reliable source information supports them.

Use `strategic_fit` for evidence-based potential relevance to a hands-on technical robotics meetup; distinguish documented facts from reasoned fit. Do not imply confirmed availability or willingness to participate without direct evidence. Participation ratings are estimates, not probabilities or commitments.

### Final validation before returning the file

1. The output has one vendor object for every distinct vendor in the uploaded roster and no extras.
2. Each contact has a real usable public method; when none can be verified for a vendor, its `contacts` array is empty. No guessed emails or fabricated sources.
3. All clear robot names from the roster are represented under the correct vendor; ambiguous source text is preserved and flagged.
4. Every rating uses an exact criterion key listed above. Every numeric AI rating has rationale, confidence, and supporting source URLs. No manual ratings are populated.
5. Every rating source URL exists in that vendor's or robot's source array.
6. Every participation rating includes the supplied target meetup reference, if participation ratings were requested.
7. The whole result is valid JSON, uses only the fields in this prompt, and starts with `"format": "rmaiig-robots-import/v1"`.

## PROMPT END
