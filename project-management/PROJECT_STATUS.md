# Project Status

**Current phase:** Phase 2 — Component Inventory System (Milestone 3 of 6 complete)
**Overall completion:** ~38%

## Completed
- Phase 0: full architecture, database design, compatibility engine design, 3D engine
  design, cloud deployment design, and the project-management continuity system.
- **Phase 1 — Core Cloud Application Foundation: all 5 milestones complete**
  (monorepo scaffold, database schema, auth, base app shell UI, components API).
- Phase 2, Milestone 1 — **`packages/component-models`** (Zod schemas for all 12
  categories + hot-field extraction, 34 passing Vitest tests).
- Phase 2, Milestone 2 — **Admin inventory dashboard** (stat tiles, search, out-of-
  stock/low-stock/recently-updated tables, `GET /api/inventory`).
- Phase 2, Milestone 3 — **Admin CRUD + image upload:**
  - `POST /api/components`, `PATCH /api/components/:id`, `DELETE
    /api/components/:id` — all role-gated, `specifications` validated per-category
    via `@pcbuilder/component-models`, hot columns derived server-side (never from
    client input).
  - `POST /api/assets` issues a short-lived presigned S3 PUT URL; the client
    uploads image bytes directly to object storage (never through this server).
  - Object storage: no Cloudflare R2 bucket exists yet, and MinIO (the originally
    planned open-source local stand-in) turned out to have been discontinued.
    Installed **SeaweedFS** instead (open-source, actively maintained, S3-compatible,
    Windows binary) — see ADR-008 in `DECISIONS.md`. Same S3 API/env vars as
    production R2, so swapping later is configuration only.
  - `apps/web/lib/zod-form.ts`: introspects any `@pcbuilder/component-models` Zod
    schema at runtime (verified Zod v4's actual internal shape empirically rather
    than assumed from v3 experience) into a field list a form can render, plus
    converts submitted form values back into a plausible specifications object.
    Powers a genuinely dynamic per-category admin form (`component-form.tsx`) —
    picking a category re-renders the right fields, including nested objects and
    comma-separated arrays.
  - Admin dashboard now has "New component" + per-row Edit/Delete actions.
  - **Verified with a full Playwright browser run** against the live dev server
    (not just API-level checks): logged in as a real admin, created a Monitor
    component through the actual form (including a real image upload through the
    presigned-URL flow), confirmed it via the dashboard search, edited its price
    and confirmed the edit persisted, deleted it and confirmed it was gone.
  - Hit and fixed a real AWS SDK v3 gotcha: presigned PUT URLs need
    `requestChecksumCalculation: "WHEN_REQUIRED"` or they fail with `400 BadDigest`
    against any S3-compatible server (documented inline and in ADR-008).

## In progress
- Nothing — at a checkpoint awaiting user instruction to start Milestone 4 (stock
  management + brand/category management).

## Remaining (see DEVELOPMENT_ROADMAP.md for full detail)
- Phase 2: stock/brand/category management (Milestone 4), CSV import/export
  (Milestone 5), 3D asset manager (Milestone 6).
- Phase 3: compatibility engine implementation + tests, power calculation.
- Phase 4: 3D workspace (R3F canvas, procedural generators, install zones, click-to-place).
- Phase 5: build save/load/share/summary.
- Phase 6: fan/airflow visualization.

## Known issues
- None blocking. Deleting a component does not clean up its uploaded image objects
  in object storage (orphaned files) — acceptable for now (real apps commonly handle
  this via storage lifecycle policies rather than app-level cleanup), noted here so
  it isn't mistaken for an oversight later.

## Blockers
- None. (SeaweedFS must be started manually each session that needs image upload —
  see docs/DEVELOPMENT.md — but this doesn't block any other work.)

## Next recommended action
Say "Continue" to begin **Phase 2, Milestone 4: Stock management + brand/category
management** (a dedicated stock-update flow, and standalone screens for managing
brands/categories directly rather than only via the component form). See
`SESSION_CHECKPOINT.md` for exact resume details.
