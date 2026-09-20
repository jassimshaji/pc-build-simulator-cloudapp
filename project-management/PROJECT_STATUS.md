# Project Status

**Current phase:** ALL PHASES (0-6) COMPLETE. Remaining work is optional polish and
post-MVP ideas (see Remaining below).
**Overall completion:** 100% of the roadmap; CI passing on `main`.

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
- **Phase 4, Milestone 5 — remaining procedural generators:** seven new
  generator functions in `packages/three-d-engine/src/procedural/`:
  `createGenericFan` (frame + a 7-sided cylinder standing in for blades),
  `createGenericRadiator` (fixed 120mm fan-row width, length from
  `sizeMm`), `createGenericAio` (composes `createGenericRadiator` + a pump
  cylinder), `createGenericAirCooler` (a heatsink tower + a mounted
  `createGenericFan`, reusing it rather than duplicating geometry),
  `createGenericSsd` (M.2 2280 vs. 2.5" SATA footprints),
  `createGenericMonitor` and `createGenericCaseLcd` (no signature documented
  in ARCHITECTURE.md §7.3 for either — designed to match the existing
  pattern from the screen-size field each spec actually has). All 12
  component categories now have a generator. 28 new Vitest tests (one file
  per generator, same bounding-box-verification standard as Milestone 2).
  Wired all six new categories into `placement.ts`'s `buildGenericModel`
  dispatcher — the same mechanical pattern as Milestone 4's five, no other
  changes needed since the zone system already accepted every category.
  Since no Fan/SSD/etc. seed data exists, verified live by creating temporary
  FAN and SSD components through the real admin API (with a throwaway test
  admin account), then placing both through the actual click-to-place flow:
  the fan rendered as a real frame+blade shape in a case's `FAN_MOUNT` zone,
  the SSD rendered as a real thin M.2 slab in the motherboard's `M2_SLOT`
  zone, with genuine compatibility results for each — then deleted both test
  components and the test account.
- **Phase 4, Milestone 6 — real GLTF asset loading (Phase 4 now complete):**
  new `packages/three-d-engine/src/resolveComponentAsset.ts`: a pure,
  framework-agnostic `resolveComponentAsset(categoryKey, specifications,
  asset?)` implementing ARCHITECTURE.md §7.3's exact resolution order — a
  `GLTF_MODEL` asset with a real url resolves to `{type:"gltf", url}`; a
  `PLACEHOLDER` asset resolves to `{type:"placeholder"}`; a
  `PROCEDURAL_FALLBACK` asset *or no ThreeDAsset row at all* both resolve to
  `{type:"procedural", model: buildGenericModel(...)}` (the "no row" case is
  the documented last-resort default, not a placeholder — every component
  created without visiting the 3D asset manager keeps rendering exactly as
  it did before this milestone). 6 new Vitest tests cover every branch.
  `WorkspaceCanvas` gained the actual rendering machinery: `GltfPlacedModel`
  (loads via `@react-three/drei`'s `useGLTF`, cloning the cached scene per
  placement so two identical placed components don't fight over one
  Object3D), a `ModelErrorBoundary` class component (a broken/unreachable
  GLTF url must not crash the whole canvas, only fall back for that one
  placement), and `OccupiedFallbackMarker` (the plain marker Milestone 4
  already had for "occupied, nothing to render" — now reused for
  PLACEHOLDER, GLTF-still-loading, and GLTF-load-failed alike, rather than
  inventing a second visual language for the same "nothing real to show"
  state). `PlacedComponent` gained an optional `asset` field
  (`{kind, url?}`) threaded through from `apps/web`'s real
  `Component.threeDAssets[0]`. The case itself (rendered as the root
  container, not a zone placement) needed its own explicit
  `resolveComponentAsset("CASE", ...)` check in `WorkspaceCanvas` — it's the
  one place outside the placement system that needed to resolve an asset;
  its GLTF Suspense/error fallback is the real procedural wireframe case
  (already computed for zone-positioning purposes) rather than a generic
  gray box, since the case must always show *something* the zone system can
  be positioned against. `apps/web`'s `/api/components` list route now
  includes `threeDAssets` (the detail-by-id route already did);
  `build-workspace.tsx` threads each component's first `ThreeDAsset` row
  through to `WorkspaceCanvas` via the new `asset` field on `BuildLine`/
  placements/`caseComponent`. Verified live: generated a real, valid `.glb`
  test asset (three.js's own `GLTFExporter`, run from a small scratch
  script — a magenta octahedron), created a temporary admin + temporary
  CASE/MOTHERBOARD test components, and confirmed via Playwright screenshots
  four distinct real states in the actual running app: no `ThreeDAsset` row
  → the normal procedural wireframe case (unchanged); `kind: GLTF_MODEL` with
  a real url → the actual magenta octahedron renders in place of the case;
  `kind: PLACEHOLDER` on the case → falls back to the procedural wireframe
  (by design, as above); `kind: PLACEHOLDER` on a component placed *into* a
  zone → the plain fallback marker, not a real shape. Also re-verified the
  Milestone 4/5 click-to-place path end-to-end is unaffected: a real seeded
  motherboard still snaps into `MOBO_TRAY` and triggers a genuine
  compatibility result. Zero console/page errors throughout. The local
  SeaweedFS S3 gateway hit an unrelated environment issue this session (its
  identity/credentials config isn't loading — "Available keys: 0, Auth
  enabled: false" in its own log regardless of invocation method or
  documented quoting fixes tried), so the presigned-upload sub-step of the
  admin flow (already verified working back in Phase 2) was substituted with
  a trivial local static file server serving the same real `.glb` bytes —
  what Milestone 6 actually needed proven was the resolve+fetch+render path
  given a real url, which this fully exercises. All temporary
  components/users deleted afterward; nothing left in the database.

**PHASE 4 IS NOW COMPLETE** (all 6 milestones: scaffold, procedural
generators for the original 6 categories, installation zones, click-to-place
+ compatibility re-check, the remaining 6 procedural generators, and real
GLTF asset resolution/loading).

- **Phase 5 — Build Management (all 3 milestones), completed 2026-09-19:**
  1. Builds: `/api/builds` (create / list / get / rename / replace components / delete /
     duplicate), the `/builds` page, owner-scoped (others get 404). One
     `BuildComponent` row per unit with an `UNPLACED` sentinel; pure
     `serializeBuild`/`deserializeBuild`; server-computed compatibility + power snapshot
     (ADR-010). Camera stored in `workspaceState` (validated) and restored, also in the
     shared view.
  2. Sharing: `POST /api/builds/:id/share` mints a 72-bit slug and clears it on disable;
     public read-only `/shared/[slug]` (ADR-011).
  3. Build summary panel (count, price, power, issues, missing essentials).
- **Phase 6 — Simulation Features (all 3 items), completed 2026-09-19:** fan mounts on
  front/rear/top with airflow direction and case pressure (ADR-012), animated airflow
  particles, and rule-based thermal / noise / performance estimates labelled as rough
  (ADR-013).
- **Workspace UX (2026-09-19):** "Add to build" auto-places into the first free zone; the
  camera is framed on the case; the layout is pinned to the viewport; hydration warning
  from browser extensions suppressed.
- **Seed data:** 20 components covering all 12 categories.
- **UI modularity + light/dark theme (2026-09-19):** the workspace is now hooks +
  single-purpose panels + `ui/` primitives (ADR-016); a nav toggle switches light/dark, remembered
  and flash-free, by overriding Tailwind's palette variables (ADR-015), with the 3D scene themed
  via a prop. 324 Vitest tests + 16 Playwright flows pass.
- **Cross-cutting (2026-09-19):** 64 API integration tests (real Postgres test database),
  13 Playwright flows, 243 package unit tests (307 Vitest tests + 13 browser = 320 in
  total); docs brought up to date; GitHub Actions CI passing on `main` (ADR-014). The API
  tests found and fixed a real 500 (deleting a component used by a saved build).
- **Local environment:** SeaweedFS uploads work again (root cause: `weed.exe` ignored
  flags after a path with a space; port 8080 was taken) — documented.

## In progress
- Nothing. All roadmap phases are complete and pushed.

## Remaining (optional — none is in the roadmap)
- Deploy: Vercel + Neon + R2 are a design only (`docs/DEPLOYMENT.md` lists the steps).
- Real case geometry for zone positions (today a schematic floor plan; e.g. the PSU bay can
  sit partly outside the case wireframe), and real 3D models via the asset manager.
- Hardening before a public launch: a shared (Redis) rate-limit store, magic-byte checks
  (see ARCHITECTURE.md §11), deleting a component's storage objects.
- A pointer-drag placement mode (ADR-003), server-side slot limits, a slot limit for GPUs.

## Known issues
- None blocking. Non-blocking: orphaned storage objects on component delete; a cosmetic
  Turbopack `export *` warning about `@prisma/client` in builds; the 3D zone click targets
  are small at high zoom-out; performance estimates use only the first CPU/GPU in a build.

## Blockers
- None.

## Next recommended action
Pick from "Remaining" — most valuable first: a first deployment, then pre-launch
hardening. See `SESSION_CHECKPOINT.md` for the exact current state.
