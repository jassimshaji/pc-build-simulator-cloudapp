# Project Status

**Current phase:** Phase 3, Milestone 2 COMPLETE (compatibility rules) — next up is
Milestone 3 (power calculator)
**Overall completion:** ~55%

## Completed
- Phase 0: full architecture, database design, compatibility engine design, 3D engine
  design, cloud deployment design, and the project-management continuity system.
- **Phase 1 — Core Cloud Application Foundation (all 5 milestones).**
- **Phase 2 — Component Inventory System (all 6 milestones):**
  1. `packages/component-models` — Zod schemas for all 12 categories + hot-field
     extraction, 34 passing Vitest tests.
  2. Admin inventory dashboard — stat tiles, search, low/out-of-stock views.
  3. Admin CRUD + image upload — dynamic per-category form (Zod schema
     introspection), presigned-URL uploads to a self-hosted SeaweedFS server.
  4. Stock management + brand/category management — inline stock editor,
     `/admin/brands`, `/admin/categories`.
  5. CSV import/export — `/admin/import-export`; the verification round trip
     surfaced and led to fixing a real pre-existing seed-data bug (hot columns
     had drifted out of sync with `specifications` — see ADR-009).
  6. 3D asset manager — `/admin/components/:id/asset`: switch a component's
     `ThreeDAsset` between an uploaded GLTF/GLB, a named procedural generator, or
     a placeholder; record source/license/attribution. Verified live: real
     presigned-URL model upload + public read-back, upsert semantics (no
     duplicate asset rows), kind-specific validation, and the form's conditional
     fields via Playwright.

- **Phase 3, Milestone 1 — `packages/compatibility-engine` scaffold:**
  `CompatibilityResult`/`CompatibilityReport`/`CompatibilityRule` types plus
  `BuildComponentInput`/`CompatibilityCheckInput` (the engine's plain-data input
  shape, deliberately independent of Prisma/UI types) exactly matching
  ARCHITECTURE.md §6. Real `runCompatibilityCheck()` entry point.
- **Phase 3, Milestone 2 — compatibility rules:** 13 rule functions across 6 files
  under `packages/compatibility-engine/src/rules/`: `cpuSocket` (1), `ramCompatibility`
  (3: type match, capacity, module count), `gpuClearance` (2: length clearance,
  slot width), `caseFormFactor` (1), `coolingCompatibility` (4: air/AIO socket
  support, air clearance, AIO radiator mount), `storageInterface` (2: M.2/SATA
  port availability). Each rule returns `null` when its required categories
  aren't both present, otherwise a `CompatibilityResult` with `INFO` severity
  when compatible or a rule-specific `ERROR`/`WARNING` when not (softer proxy
  checks — GPU slot width, AIO radiator mount string-matching — are `WARNING`,
  hard physical clearances are `ERROR`). All 13 registered in
  `rules/index.ts`'s `ALL_RULES`, consumed by `engine.ts`. 50 new Vitest tests
  (one file per rule module) plus 3 new integration tests in `engine.spec.ts`
  covering status aggregation (OK/WARNING/ERROR) end-to-end — 84 tests passing
  workspace-wide. Power estimation is still Milestone 3 — reports still show 0
  watts.

## In progress
- Nothing — at a checkpoint awaiting user instruction to start Phase 3, Milestone 3.

## Remaining (see DEVELOPMENT_ROADMAP.md for full detail)
- Phase 3: power calculator (Milestone 3),
  `/api/compatibility/check` + build flow UI (Milestone 4), required Vitest
  coverage on every rule (Milestone 5, already satisfied by Milestone 2's tests —
  confirm nothing new needs coverage once Milestone 3's power calculator lands).
- Phase 4: 3D workspace (R3F canvas, procedural generators, install zones, click-to-place).
- Phase 5: build save/load/share/summary.
- Phase 6: fan/airflow visualization.

## Known issues
- None blocking. Orphaned storage objects on component delete and a cosmetic
  Turbopack `export *` build warning are still open but non-blocking (unchanged
  from prior sessions).

## Blockers
- None.

## Next recommended action
Say "Continue" to begin **Phase 3, Milestone 3: power calculator** —
`estimateSystemPower(build)` summing CPU/GPU/motherboard baseline/RAM/storage/fan
draw, with a configurable headroom multiplier (default 1.25) producing
`recommendedPsuWattage`, plus a PSU wattage/connector check rule. See
`SESSION_CHECKPOINT.md` for exact resume details.
