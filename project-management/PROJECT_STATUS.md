# Project Status

**Current phase:** Phase 2 — Component Inventory System (Milestone 1 of 6 complete)
**Overall completion:** ~30%

## Completed
- Phase 0: full architecture, database design, compatibility engine design, 3D engine
  design, cloud deployment design, and the project-management continuity system.
- **Phase 1 — Core Cloud Application Foundation: all 5 milestones complete**
  (monorepo scaffold, database schema, auth, base app shell UI, components API).
- Phase 2, Milestone 1 — **`packages/component-models`:**
  - One Zod schema file per category (`src/categories/{cpu,motherboard,gpu,ram,ssd,
    psu,case,airCooler,aioCooler,fan,monitor,caseLcd}.ts`) plus a permissive
    `generic.ts` fallback for future categories (HDD, capture cards, RGB
    controllers, peripherals, ...).
  - `src/registry.ts`: single lookup point — `validateSpecifications(categoryKey,
    data)` and `extractHotFields(categoryKey, data)` — mapping each
    `ComponentCategory.key` to its schema + hot-field extractor, falling back to
    the generic schema for unrecognized keys.
  - Hot-field promotion strictly follows what's documented in
    `ARCHITECTURE.md` §4.1 (socket for CPU/Motherboard only, formFactor for
    Motherboard/RAM/PSU/Case, ramType, pcieGeneration, lengthMm/widthMm/heightMm
    for GPU/Case, tdpWatts/powerDrawWatts for CPU/GPU, wattage for PSU) — no new
    hot columns invented for categories the architecture doc didn't call out
    (Fan, AIO, Air Cooler beyond height, Monitor, Case LCD mostly return `{}`).
  - **First real test suite in the project:** 34 Vitest tests (25 schema
    valid/invalid cases across all 13 schemas, 9 registry tests covering
    validation fallback and hot-field extraction for CPU/GPU/Motherboard/Case/
    FAN/an invalid spec). All passing.
  - Full workspace `pnpm typecheck` (8/8), `pnpm build` (6/6), and `pnpm test`
    (34/34 in this package, placeholders elsewhere) all pass.

## In progress
- Nothing — at a checkpoint awaiting user instruction to start Milestone 2 (admin
  inventory dashboard).

## Remaining (see DEVELOPMENT_ROADMAP.md for full detail)
- Phase 2: admin inventory dashboard (Milestone 2), admin CRUD + image upload
  (Milestone 3), stock/brand/category management (Milestone 4), CSV import/export
  (Milestone 5), 3D asset manager (Milestone 6).
- Phase 3: compatibility engine implementation + tests, power calculation.
- Phase 4: 3D workspace (R3F canvas, procedural generators, install zones, click-to-place).
- Phase 5: build save/load/share/summary.
- Phase 6: fan/airflow visualization.

## Known issues
- None currently.

## Blockers
- None.

## Next recommended action
Say "Continue" to begin **Phase 2, Milestone 2: Admin inventory dashboard**
(list/search components, low-stock/out-of-stock views, recently-updated view — the
first real content behind the existing `/admin` placeholder). See
`SESSION_CHECKPOINT.md` for exact resume details.
