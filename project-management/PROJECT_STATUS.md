# Project Status

**Current phase:** Phase 3, Milestone 3 COMPLETE (power calculator + PSU checks) —
next up is Milestone 4 (`/api/compatibility/check` + build flow UI)
**Overall completion:** ~58%

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
  workspace-wide.
- **Phase 3, Milestone 3 — power calculator + PSU checks:**
  `powerCalculator.ts`'s `estimateSystemPower(build)` sums real CPU
  `tdpWatts`/GPU `powerDrawWatts` plus small documented-estimate constants for
  everything the schema doesn't carry real power data for (motherboard
  baseline, per-RAM-module, per-SSD, per-fan fallback, per-AIO-pump).
  `calculateRecommendedPsuWattage()` applies the default 1.25 headroom
  multiplier. Both are now wired into `engine.ts` (`estimatedPowerWatts`/
  `recommendedPsuWattage` are no longer hardcoded 0). Added `rules/psuPower.ts`:
  `checkPsuWattage` (recommended load vs. PSU wattage, `ERROR`) and
  `checkPsuConnectors` (a deliberately simple/advisory count check — CPU
  connector present, PCIe connectors ≥ installed GPU count — `WARNING`, since
  the schema only tracks connector *type* as free text on the GPU/motherboard
  side, not a count to verify against). 24 new tests (14 calculator + 9 rule +
  1 engine wiring test). **108 tests passing workspace-wide** (up from 84).

## In progress
- Nothing — at a checkpoint awaiting user instruction to start Phase 3, Milestone 4.

## Remaining (see DEVELOPMENT_ROADMAP.md for full detail)
- Phase 3: `/api/compatibility/check` + build flow UI (Milestone 4), required
  Vitest coverage on every rule (Milestone 5 — already satisfied by Milestones
  2-3's tests; this milestone is really just a final coverage confirmation
  pass).
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
Say "Continue" to begin **Phase 3, Milestone 4: `/api/compatibility/check` +
build flow UI** — an API route wrapping `runCompatibilityCheck()`, and a
text-only (no 3D yet) build creation flow that surfaces live
compatibility/warnings and estimated power. See `SESSION_CHECKPOINT.md` for
exact resume details.
