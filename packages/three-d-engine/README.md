# packages/three-d-engine

React Three Fiber scene primitives, the installation-zone system, procedural generic
3D model generators, and click-to-place — everything the `/workspace` 3D view needs
except real GLTF asset loading.

**Status:** Phase 4, Milestones 1-5 done.

- `src/WorkspaceCanvas.tsx`: the R3F `<Canvas>` (lighting, reference grid,
  `OrbitControls`, a `WorkspaceCanvasHandle.resetView()` exposed via `ref`). Takes a
  real `caseComponent` (rendered immediately — it's the root container) and
  `placements: Record<zoneKey, PlacedComponent>`, and fires `onZoneClick(zoneKey,
  acceptsCategory)` when an unoccupied, category-matching zone is clicked. Consumed
  by `apps/web/app/workspace/build-workspace.tsx` via `next/dynamic` with
  `ssr: false` (WebGL needs a browser).
- `src/procedural/`: one `createGenericX` function per component category (all 12 —
  Case, Motherboard, CPU, GPU, RAM, PSU from Milestone 2; Fan, Radiator, AIO, Air
  Cooler, SSD, Monitor, Case LCD from Milestone 5), each a pure function returning a
  plain `THREE.Group` sized from real spec dimensions — no React/R3F dependency, so
  they're directly Vitest-testable. Matches the signatures documented in
  ARCHITECTURE.md §7.3 where one is given; a few (Monitor, Case LCD) have no
  documented signature and use judgment matching the same pattern. Deliberately
  generic/schematic geometry, never photorealistic (ADR-004) — there are no
  licensed real-brand 3D assets to build from.
- `src/zones/`: `InstallationZone` (matches ARCHITECTURE.md §7.2), `generateCaseZones`
  and `generateMotherboardZones` (both pure, data-driven from spec fields — never
  hand-authored per model), and `composeZone` (re-expresses a placed motherboard's
  own zones in world space once it's sitting in a case's `MOBO_TRAY` zone).
- `src/placement.ts`: `extractCaseZoneSpec`/`extractMotherboardZoneSpec` (real
  `Component.specifications` → the zone generators' input shapes) and
  `buildGenericModel(categoryKey, specifications)` — dispatches to the matching
  procedural generator for any category, approximating the handful of params some
  generators want that the schema doesn't track (documented per case) with a
  fallback constant.

Real GLTF asset loading (an admin-uploaded `.glb` overriding the procedural
fallback) is Milestone 6 — not built yet; `buildGenericModel` always returns the
generic shape today. See `../../project-management/DEVELOPMENT_ROADMAP.md` for the
full Phase 4 milestone list and `../../project-management/ARCHITECTURE.md` §7.
