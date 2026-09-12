# Project Status

**Current phase:** Phase 2 — Component Inventory System (Milestone 4 of 6 complete)
**Overall completion:** ~42%

## Completed
- Phase 0: full architecture, database design, compatibility engine design, 3D engine
  design, cloud deployment design, and the project-management continuity system.
- **Phase 1 — Core Cloud Application Foundation: all 5 milestones complete**
  (monorepo scaffold, database schema, auth, base app shell UI, components API).
- Phase 2, Milestone 1 — **`packages/component-models`** (Zod schemas for all 12
  categories + hot-field extraction, 34 passing Vitest tests).
- Phase 2, Milestone 2 — **Admin inventory dashboard** (stat tiles, search, out-of-
  stock/low-stock/recently-updated tables, `GET /api/inventory`).
- Phase 2, Milestone 3 — **Admin CRUD + image upload** (full component CRUD API,
  a genuinely dynamic per-category admin form driven by Zod schema introspection,
  presigned-URL image uploads to a self-hosted SeaweedFS S3-compatible server).
- Phase 2, Milestone 4 — **Stock management + brand/category management:**
  - `POST /api/inventory/update`: dedicated fast path for adjusting
    stockQuantity/lowStockThreshold, distinct from the full component edit form.
  - Inline stock editor (`apps/web/app/admin/stock-cell.tsx`) on every dashboard
    table row — edit the number, a "Save" affordance appears only when the value
    actually changed, saves via the new route and refreshes.
  - Full brand management: `/admin/brands` (list with per-brand component counts,
    create, rename, delete-if-unused — delete is disabled in the UI and 409s at
    the API when any component still references the brand).
  - Full category management: `/admin/categories` (list with component counts,
    create, edit label/sortOrder, delete-if-unused; `key` is immutable once
    created since component-models' registry keys off of it).
  - **Verified live, not just via typecheck:** brand create → rename → delete
    (unused, succeeds) and delete-while-in-use (AMD, 409) via direct API calls;
    same pattern for categories (created a real "HDD" category, relabeled it,
    deleted it, then confirmed deleting the in-use "CPU" category correctly 409s);
    inventory update confirmed by setting a real component's stock to 42 and
    reading it back via the detail endpoint; a full Playwright pass screenshotted
    `/admin/brands`, `/admin/categories`, and the dashboard after using the inline
    stock editor (visually confirmed the saved value persists). All test data
    (a throwaway brand, a throwaway category, a temporarily-changed stock value,
    a test user) cleaned up afterward.

## In progress
- Nothing — at a checkpoint awaiting user instruction to start Milestone 5 (CSV
  import/export).

## Remaining (see DEVELOPMENT_ROADMAP.md for full detail)
- Phase 2: CSV import/export (Milestone 5), 3D asset manager (Milestone 6).
- Phase 3: compatibility engine implementation + tests, power calculation.
- Phase 4: 3D workspace (R3F canvas, procedural generators, install zones, click-to-place).
- Phase 5: build save/load/share/summary.
- Phase 6: fan/airflow visualization.

## Known issues
- None blocking. (Carried over from Milestone 3: deleting a component doesn't clean
  up its uploaded image objects in storage; a cosmetic Turbopack build warning about
  `export *` in packages/database's index — neither is new this session.)

## Blockers
- None.

## Next recommended action
Say "Continue" to begin **Phase 2, Milestone 5: CSV import/export** for bulk
inventory operations. Worth deciding the CSV shape for the `specifications` column
(varies per category — likely a JSON-encoded string per cell) before writing parsing
code. See `SESSION_CHECKPOINT.md` for exact resume details.
