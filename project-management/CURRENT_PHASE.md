# Current Phase

**Phase 2 — Component Inventory System: IN PROGRESS (Milestone 3 of 6 complete)**

Milestones 1 (`component-models`), 2 (admin inventory dashboard), and 3 (admin CRUD +
image upload) are done — see `DEVELOPMENT_ROADMAP.md` → Phase 2 for the full
milestone list.

## Next up: Phase 2, Milestone 4 — Stock management + brand/category management
Update quantity, mark unavailable (already possible via the edit form's "Available
for sale" checkbox from Milestone 3 — this milestone is about a dedicated,
faster stock-update flow, not re-adding what already exists), plus standalone
brand/category management screens (currently brands are auto-created on the fly by
name when creating a component, and categories are fixed seed data with no admin UI
to add/edit/reorder them). See `DEVELOPMENT_ROADMAP.md` → Phase 2 → Milestone 4.

Waiting for explicit user instruction ("Continue" / "Resume development") before
starting Milestone 4. See `SESSION_CHECKPOINT.md` for exact resume state.

## Local environment note
This machine now also runs a local SeaweedFS S3-compatible server (for image
uploads) alongside PostgreSQL. It is NOT an auto-starting Windows service like
Postgres — it must be started manually each session that needs image upload to
work. See `docs/DEVELOPMENT.md`'s "Object storage / image uploads" section for the
exact command.
