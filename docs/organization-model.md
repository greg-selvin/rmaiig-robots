# Organization identity and ecosystem roles

All organizations retain their existing IDs in `vendors`. The historical table and foreign-key names stay stable to preserve robots, sources, contacts, locations, imports, notes, associations, and Outreach history. No extra Organization classification field is introduced.

`vendors.organization_type` is one required foreign key to `organization_types.key`. `organization_roles` stores zero or more unique role assignments, with foreign keys to the organization and `ecosystem_roles.key`. Both catalogs are data, not PostgreSQL enums. Add a catalog row through a tracked migration to add a type or role; forms and filters load the catalogs dynamically.

The initial migration defaults existing records to Company. A follow-up data migration recognizes the explicitly named Boulder County Sheriff, Colorado Governor’s Office of Information Technology, and Denver Police Department as Government Agency, and University of Colorado at Colorado Springs as University. These targeted identity updates preserve roles and all related records and do not overwrite a type already edited away from Company. Identity evidence: [Boulder County Sheriff](https://bouldercounty.gov/safety/sheriff/), [Colorado OIT](https://oit.colorado.gov/about-us), [Denver Police](https://www.denvergov.org/Government/Agencies-Departments-Offices/Agencies-Departments-Offices-Directory/Police-Department), and [UCCS](https://www.uccs.edu/about). Vendor records gain Vendor; combined Distributor / Integrator records gain both Distributor and Integrator because the previous model has no evidence distinguishing them. Existing classification is retained in `entity_type` as a legacy import default, not as the source of truth. Historical migrations and audit entity names are unchanged.

`save_organization` checks workspace edit membership, locks existing organizations, updates identity and role assignments atomically, and records classification changes in the audit log. Roles may be cleared without removing robots or relationship/history rows. New robot ownership requires Vendor; new supplier associations require a Vendor target and a Distributor or Integrator source. Existing references remain visible after role removal. Adding deployment roles seeds missing independent Outreach records without overwriting existing ones. Adding Vendor seeds missing Meetup opportunities for existing robot associations. Classification never transfers robot ownership.

The Organizations directory includes all records. The Distributor / Integrator directory is a role view, including organizations that also have Vendor. A hybrid organization keeps its robot-based Vendor board card and can open its independent Distributor / Integrator workflow from its organization profile. This avoids duplicate draggable cards for one organization. Existing specialized Outreach tables retain their names and history.

JSON v1 imports may specify `organization_type` and `roles` using catalog keys. Omitting either preserves existing classification; legacy new imports default to Company and Vendor. Explicit `roles: []` clears roles. Robots can only be created under records with Vendor. Research does not infer or overwrite organizational classification.

The signed-in `save_organization` RPC intentionally uses SECURITY DEFINER for atomic writes to the read-only role junction. It rejects anonymous callers, checks workspace membership and edit role, and scopes the locked organization to that workspace. Local PostgreSQL tests cover these access boundaries.

Legacy category updates add the corresponding roles without removing any existing role or moving robots. The deprecated conversion RPC adds Distributor and Integrator while retaining Vendor and existing ownership.

Remaining compatibility cleanup: remove `entity_type`, the legacy insert default trigger, and the deprecated conversion RPC after all external import clients have adopted explicit classifications. Do not remove historical migrations or rewrite old audit data.

## Verification

Run `pnpm test:organizations:db` with Docker available. This replays all migrations in an isolated PostgreSQL 15 container, loads legacy fixtures before the organization migration, checks backfill and atomic role writes, and tests RLS membership boundaries. The container is removed on exit. `pnpm test` covers domain filtering, multiple roles, UI fields/badges, and import validation.

## Changed files

- `src/components/app.tsx`: organization loading, create/edit wiring, directories, search, profile routing, role-based robot/Outreach behavior, type/role filters, badges.
- `src/components/organization-classification.tsx`: identity selector, independent role checkboxes, editor, and badges.
- `src/components/organization-classification.test.tsx`: field and multiple-badge rendering.
- `src/components/outreach-detail-panel.tsx` and `src/components/outreach-detail-panel.test.tsx`: organization labels, role-based links, and classification badges.
- `src/components/robot-profile-identity.tsx`: organization labels and role-based profile links.
- `src/app/globals.css`: Outreach workflow color selectors and removal of obsolete exclusive-type styling.
- `src/lib/organizations.ts` and `src/lib/organizations.test.ts`: classification domain helpers, legacy fallback, and identity/role filtering tests.
- `src/lib/outreach-board.ts` and `src/lib/outreach-board.test.ts`: active-filter detection includes new organization type/role filters and excludes sort order.
- `src/lib/database.types.ts`: regenerated table/relationship/RPC types, with nullable RPC inputs reflecting PostgreSQL behavior.
- `src/lib/json-import.ts`, `src/lib/json-import.test.ts`, and `src/lib/import-runner.ts`: explicit identity and roles in JSON imports, validation, and role writes.
- `src/app/api/research/process/route.ts`: research describes an organization rather than assuming every record is a manufacturer.
- `supabase/migrations/20261007155517_organization_identity_roles.sql`: catalogs, identity foreign key, role junction, backfill, role-based validation/seeding, atomic save, and legacy compatibility.
- `supabase/migrations/20261007160158_organization_existing_institutions.sql`: targeted identity backfill for four existing institution records, preserving migrated roles.
- `tests/sql/supabase-test-bootstrap.sql`, `tests/sql/organization-fixtures.sql`, and `tests/sql/organization-model.sql`: isolated Supabase-compatible baseline, legacy fixtures, migration and access tests.
- `scripts/test-organization-model.sh` and `package.json`: reproducible database test command.
- `docs/organization-model.md`: model, migration assumptions, compatibility boundaries, verification, and file inventory.
