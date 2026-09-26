# Vendor and robot import format

The import format is versioned JSON. It imports one vendor and its related records as a unit, including zero or more robots. It supports inserts and partial updates.

```json
{
  "format": "rmaiig-robots-import/v1",
  "vendors": [
    {
      "name": "Example Robotics",
      "contacts": [{ "contact_form_url": "https://example.com/contact" }],
      "robots": [{ "name": "Example One" }]
    }
  ]
}
```

The complete example is [examples/robots-import.v1.json](../examples/robots-import.v1.json).

## Required fields

- Top level: `format` must be `rmaiig-robots-import/v1`; `vendors` is an array.
- Every vendor: `name`. `contacts` is optional and may be an empty array when no usable public contact method is known.
- Every contact: at least one usable way to reach or identify the contact: `business_email`, `business_phone`, `contact_form_url`, or `profile_url`. A name and title are helpful but not required.
- Every robot: `name`.

Search for a public contact method when preparing outreach data. A public contact form is sufficient when no individual contact is known. If no usable method can be verified, omit `contacts` or set it to `[]`; never fabricate contact data or label an inferred email as confirmed.

## Matching and updates

- Match a vendor by `id` when provided; otherwise by normalized `name` within the workspace.
- Match a robot by `id` when provided; otherwise by normalized `name` under its matched vendor.
- A supplied ID must identify a record in the current workspace and, for a robot, under the vendor in that import entry. Unknown or mismatched IDs are errors rather than inserts.
- Contact `id` may be supplied to update a known contact. Without it, match by normalized email, then `profile_url`, then `contact_form_url`; otherwise create a new contact.
- Location `id` may be supplied; without it, locations match by `location_type` and the supplied city/country fields.
- Omitted properties mean “leave the existing value unchanged.” Explicit `null` clears a nullable scalar. Scalar arrays such as `product_urls` and `image_urls` replace their existing values when supplied, including when set to `[]`. Object arrays such as `contacts`, `locations`, `vendor_sources`, `robots`, `sources`, and ratings upsert supplied records; an empty or omitted object array does not delete existing records.
- `robots` omitted means leave the vendor's robot records alone; `robots: []` also leaves them alone. The format does not delete robots or contacts.
- Imports should be previewed before commit. The JSON document is schema-validated before any writes. A database error during commit can occur after earlier records have been written; retrying the same file is designed to upsert those records safely.

## Fields

Fields below mirror the current application data model. Except for the required fields above, properties are optional. Use ISO 8601 timestamps. `iso_country_code` values are ISO 3166-1 alpha-3 codes from the application country data; imports also accept alpha-2 codes or country names and normalize them. State or region codes are editable text, with US state code suggestions from the application state data.

### Vendor properties

`id`, `name`, `original_source_name`, `source_row`, `source_rank`, `original_robot_text`, `original_import_data`, `country`, `iso_country_code`, `headquarters_city`, `headquarters_region`, `us_state_code`, `headquarters_postal_code`, `website_url`, `contact_url`, `product_urls`, `description`, `public_event_history`, `strategic_fit`, `research_status`, `last_researched_at`, `manual_notes`, `parsing_review_status`.

### Contact properties

`id`, `name`, `job_title`, `department`, `business_email`, `business_phone`, `contact_form_url`, `profile_url`, `location`, `preferred`, `contact_type`, `verification_status`, `email_status`, `source_url`, `verified_at`, `notes`.

`email_status` accepts `confirmed`, `inferred`, `unverified`, `invalid`, or `unknown`. For example, an inferred email must use `inferred`, not `confirmed`.

### Location properties

`id`, `location_type`, `country`, `iso_country_code`, `region`, `us_state_code`, `city`, `postal_code`, `source_url`, `verified_at`, `is_primary`.

### Robot properties

`id`, `name`, `original_imported_text`, `product_url`, `description`, `development_status`, `commercial_availability`, `mobility`, `manipulation`, `interaction_capabilities`, `demonstration_capabilities`, `image_urls`, `research_status`, `last_researched_at`, `manual_notes`, `parsing_review_status`.

### Research source properties

`id`, `url`, `title`, `publisher`, `accessed_at`, `evidence_summary`, `supported_fields`, `confidence`, `is_official`, `citation_metadata`.

Vendor sources go in `vendor_sources`; robot sources go in that robot's `sources`. Keep source URLs with the claims they support. `confidence` is between 0 and 1.

### Ratings and scoring evidence

Each robot may have `excitement` and `participation` arrays. Each rating entry contains `criterion_key` and optionally `ai_rating`, `ai_rationale`, `ai_confidence`, `manual_rating`, `manual_rationale`, `needs_review`, `researched_at`, and `source_urls`. Ratings are integers 1–5 or null; confidence is between 0 and 1. Criterion keys must already exist in the matching scoring model. `source_urls` refer to sources declared for that vendor or robot.

Excitement ratings attach to the robot. Participation ratings require `meetup_id` or `meetup_name` and attach to that robot's opportunity for that meetup; the meetup must already exist. If a participation rating is about a general estimate rather than a particular meetup, include its research narrative under robot/vendor notes or sources instead of assigning it to an opportunity.

Do not import derived scores or priority scores. The application calculates them from current workspace criteria and ratings. Manual ratings take precedence over AI ratings in the displayed score. Imports should preserve both fields independently.

The Administration upload accepts this JSON format as well as the legacy four-column CSV/XLSX format. JSON imports run in preview mode by default; commit only after reviewing the preview and warnings. The import endpoint accepts only an admin user's uploads.
