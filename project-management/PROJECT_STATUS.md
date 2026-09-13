# Project Status

**Current phase:** Phase 4, Milestone 4 COMPLETE (click-to-place wired to the
compatibility engine) — next up is Milestone 5 (remaining procedural generators)
**Overall completion:** ~72%

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
  1 engine wiring test). 108 tests passing workspace-wide.
- **Phase 3, Milestone 4 — `/api/compatibility/check` + build flow UI:**
  `apps/web/lib/compatibility.ts` bridges real Prisma `Component` rows (hot
  columns + `specifications` + a client-supplied quantity) into the engine's
  plain `BuildComponentInput` shape and calls `runCompatibilityCheck()` —
  unknown/deleted component ids and not-yet-modeled categories are silently
  skipped rather than failing the whole check. `POST /api/compatibility/check`
  (public, read-only) wraps it behind the `{data,error}` envelope. The
  `/workspace` page's static three-panel shell (Phase 1) is now a real,
  interactive client component (`build-workspace.tsx`): clickable categories +
  search query real inventory, clicking a component shows its full
  specifications and an "Add to build" button, an added-components list with
  per-line removal, and a live compatibility panel + footer summary
  (component count / estimated power + recommended PSU wattage / overall
  status) that re-checks on every selection change. The center 3D placeholder
  is untouched — that's Phase 4. Slot uniqueness (one CPU, etc.) is
  deliberately not enforced yet — quantities just accumulate, same as the
  rules already tolerate.
- **Phase 3, Milestone 5 — Vitest coverage confirmation:** verified all 15
  registered rule functions are each referenced by at least one test file (no
  gaps) — the required-not-optional coverage from the project brief was
  already satisfied by Milestones 2-3's own tests.

**PHASE 3 IS NOW COMPLETE.** All 5 milestones (scaffold, rules, power
calculator, check API + build flow UI, coverage confirmation) are done and
verified — live API tests (compatible build, mismatched socket, empty build,
unknown id, invalid input) and a Playwright pass through the real `/workspace`
UI (component picker, spec display incl. nested-object fields, live
compatibility panel in both OK/ERROR states, mobile-width stacking with no
horizontal overflow).

- **Phase 4, Milestone 1 — `packages/three-d-engine` scaffold:** added
  `three`, `@react-three/fiber`, `@react-three/drei` as real dependencies
  (react/react-dom as peer deps). `WorkspaceCanvas` component: an R3F
  `<Canvas>` with lighting, a reference `Grid`, a single placeholder box (only
  to prove the render pipeline works — replaced by real procedural generators
  in Milestone 2), and `OrbitControls` (orbit/zoom/pan all via mouse/trackpad
  by default). Exposes a `WorkspaceCanvasHandle` (`{ resetView }`) via `ref`
  for the one action that needs an explicit trigger. Consumed by
  `apps/web/app/workspace/build-workspace.tsx` through `next/dynamic` with
  `ssr: false` (WebGL needs a browser) — replaces the Phase 1 dashed-border
  placeholder box and the four `disabled` Orbit/Zoom/Pan/Reset buttons with a
  real canvas, a real "Reset view" button, and a caption explaining the
  mouse-driven controls. Verified live via Playwright: a real `<canvas>`
  element mounts with zero console errors, a mouse-drag actually orbits the
  camera (confirmed by comparing before/after screenshots), "Reset view"
  restores the exact initial framing, and the canvas resizes correctly with
  no horizontal overflow at 400px mobile width.
- **Phase 4, Milestone 2 — procedural generators:** six pure, framework-agnostic
  generator functions in `packages/three-d-engine/src/procedural/`
  (`createGenericCase`, `createGenericMotherboard`, `createGenericCpu`,
  `createGenericGpu`, `createGenericRam`, `createGenericPsu`), each building a
  plain `THREE.Group` from real spec dimensions (converted from mm via a shared
  `mm()` helper — 1 scene unit = 1 meter) — matching the exact parameter shapes
  documented in ARCHITECTURE.md §7.3. Case renders as a wireframe shell (so
  future placed components stay visible inside it); the rest are simple
  boxes/cylinders with a distinct color per category (per ADR-004, not
  photorealistic by design). 18 new Vitest tests verify each generator's
  actual bounding-box dimensions match its inputs and that different
  form-factor/size inputs produce genuinely different geometry. `WorkspaceCanvas`
  temporarily renders all six in a row as a visual smoke test (clearly marked
  as throwaway — real placement is Milestones 3-4). Caught and fixed a real bug
  via live Playwright screenshots: the initial color palette (near-black grays)
  was nearly invisible against the scene's dark background — switched to a
  lighter, clearly-contrasting palette and bumped ambient light intensity.
  Verified live: all 6 models render as distinct, correctly-shaped, visually
  legible objects with zero console errors.
- **Phase 4, Milestone 3 — installation zone system:** `InstallationZone`
  type (`{ key, acceptsCategory, position, rotation, constraints? }`, matching
  ARCHITECTURE.md §7.2 exactly) plus two pure, data-driven zone generators in
  `packages/three-d-engine/src/zones/`: `generateCaseZones(spec)` (fixed
  zones — MOBO_TRAY, PSU_BAY, EXPANSION_SLOT_1 with a `maxLengthMm` GPU
  clearance constraint, CPU_COOLER_MOUNT with a `maxHeightMm` constraint —
  plus one zone per `radiatorSupport`/`fanSupportMm` array entry and one per
  `driveBays` count) and `generateMotherboardZones(spec)` (CPU_SOCKET plus one
  zone per `ramSlots`/`pcieSlots`/`m2Slots`/`sataPorts` count). Neither
  hand-authors a zone list per model — both derive entirely from spec data.
  12 new Vitest tests (7 case, 5 motherboard) verify zone counts, keys,
  `acceptsCategory`, and constraint values against varied inputs. Wired real
  zone highlighting into `WorkspaceCanvas`: a new `highlightCategory` prop
  (driven by `build-workspace.tsx`'s existing category-picker state) makes
  zones whose `acceptsCategory` matches glow brighter, everything else stays
  dim — the "would this be compatible if placed here" affordance from
  ARCHITECTURE.md §7.1 (full click-to-place is Milestone 4). Replaced the
  Milestone 2 showcase row with a case + its own zones and a motherboard + its
  own zones, shown side by side (each zone set stays in its own component's
  local space — composing them into one real placed layout is Milestone 4's
  job). Caught and fixed a real scaling bug via live screenshots: the first
  attempt's 20mm zone markers were invisible at normal viewing distance,
  and after bumping marker size to 45mm, motherboard slot zones (originally
  spaced only 8mm apart, a stand-in for real DIMM pitch) overlapped into an
  indistinguishable blob — fixed by widening slot-to-slot spacing to be
  visually distinct from the marker size, since these positions are
  explicitly schematic, not to-scale. Verified live: CPU, RAM, and PSU
  category selection each correctly highlight only their own matching
  zone(s) across both the case and the motherboard.
- **Phase 4, Milestone 4 — click-to-place wired to the compatibility engine:**
  `packages/three-d-engine/src/zones/composeZone.ts` (new, 4 tests) — the
  pure position-offset function Milestone 3 deferred, used to re-express a
  placed motherboard's own zones (RAM/PCIe/M.2/SATA slots) in world space once
  it's actually sitting in a case's `MOBO_TRAY` zone. New
  `src/placement.ts` (13 tests): `extractCaseZoneSpec`/
  `extractMotherboardZoneSpec` read real `Component.specifications` into the
  zone generators' input shapes (returning `null` on malformed data rather
  than throwing), and `buildGenericModel(categoryKey, specifications)`
  dispatches to the matching Milestone 2 generator (MOTHERBOARD, CPU, GPU,
  RAM, PSU) — approximating the handful of generator params the schema
  doesn't track (GPU fan count, RAM module height, PSU length) with a
  documented constant, and returning `null` for categories without a
  generator yet (Milestone 5's job), in which case a plain solid marker
  stands in for the shape. `WorkspaceCanvas` now takes real `caseComponent`/
  `placements` props (was hardcoded demo data) and an `onZoneClick` callback
  — every unoccupied, category-matching zone is now genuinely clickable
  (with pointer-cursor feedback), and once occupied renders the real
  placed component's generated model in place of the zone marker.
  `build-workspace.tsx` wires this up: the case renders as soon as it's
  added to the build (no zone needed — it's the root container); selecting
  any other component highlights its matching zones (switched the highlight
  driver from the category *tab* to the specifically *selected* component,
  matching ARCHITECTURE.md §7.1's actual interaction model); clicking a
  matching zone both records the placement and calls the existing
  `handleAdd`, which re-triggers the real `/api/compatibility/check` — no
  new compatibility logic needed, Phase 3's engine is reused as-is. Verified
  live end-to-end: added a real case (renders immediately) → selected a real
  motherboard (MOBO_TRAY zone glows cyan) → clicked it (the real green
  motherboard model appears in place of the marker, "Your build" shows it as
  placed, the compatibility panel shows a genuine `checkCaseFormFactor` INFO
  result) → selected real RAM (RAM_SLOT zones, now composed onto the placed
  motherboard, glow cyan) → clicked one (the RAM model appears correctly
  positioned on the motherboard, and three more genuine RAM compatibility
  results appear) — proving both levels of zone composition (case→motherboard,
  motherboard→RAM) work correctly. Playwright needed a small pixel-level grid
  search to find each zone's exact clickable screen position (R3F raycast
  targets are tiny at this scale) — a real, if minor, finding about how
  precise this interaction is at default zoom, noted for future polish.
  No new console/page errors at any step; no horizontal overflow at 400px
  mobile width.

## In progress
- Nothing — at a checkpoint awaiting user instruction to start Phase 4, Milestone 5.

## Remaining (see DEVELOPMENT_ROADMAP.md for full detail)
- Phase 4: remaining procedural generators (Milestone 5: Fan, AIO, Air Cooler,
  SSD, Monitor, Case LCD), GLTF asset loading (Milestone 6).
- Phase 5: build save/load/share/summary.
- Phase 6: fan/airflow visualization.

## Known issues
- None blocking. Orphaned storage objects on component delete and a cosmetic
  Turbopack `export *` build warning are still open but non-blocking (unchanged
  from prior sessions).

## Blockers
- None.

## Next recommended action
Say "Continue" to begin **Phase 4, Milestone 5: remaining procedural
generators** (Fan, AIO, Air Cooler, SSD, Monitor, Case LCD placeholder
surface) — the categories `buildGenericModel` currently falls back to a
plain marker for. See `SESSION_CHECKPOINT.md` for exact resume details.
