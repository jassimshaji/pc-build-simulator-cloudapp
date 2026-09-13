# packages/three-d-engine

React Three Fiber scene primitives, the installation-zone system, procedural generic
3D model generators, click-to-place, and real GLTF asset loading — everything the
`/workspace` 3D view needs.

**Status:** Phase 4 complete (all 6 milestones).

- `src/WorkspaceCanvas.tsx`: the R3F `<Canvas>` (lighting, reference grid,
  `OrbitControls`, a `WorkspaceCanvasHandle.resetView()` exposed via `ref`). Takes a
  real `caseComponent` (rendered immediately — it's the root container) and
  `placements: Record<zoneKey, PlacedComponent>`, and fires `onZoneClick(zoneKey,
  acceptsCategory)` when an unoccupied, category-matching zone is clicked. Every
  placed component (and the case itself) is resolved through
  `resolveComponentAsset` — see below — so a real uploaded GLTF renders when one's
  assigned, not just the procedural fallback. Consumed by
  `apps/web/app/workspace/build-workspace.tsx` via `next/dynamic` with
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
- `src/resolveComponentAsset.ts` (Milestone 6): `resolveComponentAsset(categoryKey,
  specifications, asset?)` — a pure, framework-agnostic function implementing
  ARCHITECTURE.md §7.3's exact asset resolution order:
  1. `asset.kind === "GLTF_MODEL"` with a real `url` → `{type: "gltf", url}`.
  2. `asset.kind === "PLACEHOLDER"` → `{type: "placeholder"}`.
  3. `asset.kind === "PROCEDURAL_FALLBACK"`, or no `asset` at all (no `ThreeDAsset`
     row) → `{type: "procedural", model: buildGenericModel(...)}`. Case 3's "no
     row" branch is the architecture doc's documented last-resort default, not a
     placeholder — this is why a component created without ever visiting the 3D
     asset manager keeps rendering its procedural shape exactly as before this
     milestone.
  `WorkspaceCanvas` renders whichever resolution applies: a real GLTF via
  `@react-three/drei`'s `useGLTF` (cloned per placement, inside a `<Suspense>` +
  error boundary that falls back to a plain marker on a broken/loading url), the
  procedural model (unchanged), or the plain fallback marker for an explicit
  PLACEHOLDER. The case itself (the root container the whole zone system is
  positioned against, not a zone placement) is the one place outside the
  placement system that resolves its own asset — its loading/error fallback is
  the real procedural wireframe case rather than a generic marker, and an
  explicit PLACEHOLDER on the case also falls back to that wireframe by design,
  since the case must always render *something*.

See `../../project-management/DEVELOPMENT_ROADMAP.md` for the full Phase 4
milestone list (now complete) and `../../project-management/ARCHITECTURE.md` §7.
