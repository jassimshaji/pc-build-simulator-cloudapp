# Project Status

**Current phase:** Phase 2 — Component Inventory System (Milestone 5 of 6 complete)
**Overall completion:** ~46%

## Completed
- Phase 0: full architecture, database design, compatibility engine design, 3D engine
  design, cloud deployment design, and the project-management continuity system.
- **Phase 1 — Core Cloud Application Foundation: all 5 milestones complete.**
- Phase 2, Milestone 1 — **`packages/component-models`** (Zod schemas + hot-field
  extraction, 34 passing Vitest tests).
- Phase 2, Milestone 2 — **Admin inventory dashboard.**
- Phase 2, Milestone 3 — **Admin CRUD + image upload** (dynamic per-category form,
  presigned-URL uploads to a self-hosted SeaweedFS S3-compatible server).
- Phase 2, Milestone 4 — **Stock management + brand/category management.**
- Phase 2, Milestone 5 — **CSV import/export:**
  - `GET /api/components/export` (CSV download; `images`/`specifications` as
    JSON-encoded cells) and `POST /api/components/import` (multipart upload,
    upserts by SKU, per-row error reporting instead of an all-or-nothing
    transaction), plus an `/admin/import-export` page.
  - **Verified with a full export → hand-edited → re-import round trip** against
    the live server (added a valid new row and a deliberately broken one; got
    correct created/updated counts and a clear per-row error for the bad row).
  - **That round trip surfaced a real pre-existing bug**, not introduced this
    session: several seeded components' `specifications` were missing fields
    their own Zod schemas required, because `seed.ts` (written before
    `component-models` existed) had set hot-column values as separate literals
    instead of also including them in `specifications`. Fixed by making
    `seed.ts` derive hot columns from `specifications` via the same
    `validateSpecifications`/`extractHotFields` functions the real API uses,
    fixed the upsert's `update` branch (previously a no-op, so a corrected seed
    script wouldn't have fixed already-seeded rows), and re-ran the seed
    against the live database to correct it — confirmed via direct SQL and a
    second round-trip test that all 7 real components now import cleanly.
  - Along the way, also fixed an unrelated pre-existing corruption in
    `DECISIONS.md` (ADR-007's heading had been lost in an earlier session's
    edit, merging its body onto the end of ADR-008) — restored proper ADR
    numbering/structure while adding ADR-009 for the seed-data fix.

## In progress
- Nothing — at a checkpoint awaiting user instruction to start Milestone 6 (3D
  asset manager), the last Phase 2 milestone.

## Remaining (see DEVELOPMENT_ROADMAP.md for full detail)
- Phase 2: 3D asset manager (Milestone 6) — last one before Phase 3.
- Phase 3: compatibility engine implementation + tests, power calculation.
- Phase 4: 3D workspace (R3F canvas, procedural generators, install zones, click-to-place).
- Phase 5: build save/load/share/summary.
- Phase 6: fan/airflow visualization.

## Known issues
- None blocking. (Carried over, unchanged: orphaned storage objects on component
  delete; a cosmetic Turbopack build warning about `export *` in
  `packages/database`'s index.)

## Blockers
- None.

## Next recommended action
Say "Continue" to begin **Phase 2, Milestone 6: 3D asset manager** (upload GLTF/GLB,
assign a procedural fallback generator, record source/license/attribution) — the
last Phase 2 milestone before Phase 3 (compatibility engine) begins. See
`SESSION_CHECKPOINT.md` for exact resume details.
