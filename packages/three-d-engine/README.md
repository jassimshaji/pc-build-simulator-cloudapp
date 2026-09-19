# packages/three-d-engine

Everything the `/workspace` 3D view needs, plus the pure logic that sits next to it: the
React Three Fiber canvas, procedural model generators, the installation-zone system,
click-to-place, GLTF asset loading — and (Phases 5-6) build serialization, the build
summary, fan airflow, thermal/noise/performance estimates and camera state.

**Status:** complete through Phase 6. 140 Vitest tests (`pnpm --filter
@pcbuilder/three-d-engine test`).

Only the files marked *(R3F)* need a browser/WebGL. Everything else is a pure function
with no React or three.js scene dependency, which is why `apps/web` can import the pure
modules directly by path (for example
`@pcbuilder/three-d-engine/src/buildSerialization`) in server code and in client
components without pulling the 3D bundle into the main chunk.

## Rendering

- `src/WorkspaceCanvas.tsx` *(R3F)* — the `<Canvas>` (lighting, grid, `OrbitControls`).
  Props: `caseComponent` (rendered immediately — it's the root container),
  `placements: Record<zoneKey, PlacedComponent>`, `highlightCategory`,
  `onZoneClick(zoneKey, acceptsCategory)`, `showAirflow`, `initialCamera`, `theme`
  (`"light"` | `"dark"`, see `sceneTheme.ts`). The imperative
  handle (`ref`) exposes `resetView()`, `findFreeZone(category)` (first unoccupied
  compatible zone — what "Add to build" uses to auto-place) and `getCameraState()`.
  Every placed component goes through `resolveComponentAsset` (below). Loaded by
  `apps/web` with `next/dynamic` and `ssr: false`.
  - The camera starts about a meter from the case (1 scene unit = 1 meter) aimed at its
    middle; `CameraRig` records that as the reset state, then applies `initialCamera` if
    a saved one was given, so "Reset view" always returns to the default framing.
- `src/AirflowStream.tsx` *(R3F)* — animated particles through one placed fan, along the
  axis of its mount face: orange = exhaust, blue = intake.
- `src/procedural/` — one `createGenericX` per component category (all 12), each a pure
  function returning a `THREE.Group` sized from real spec dimensions (mm → scene units
  via `mm()`). Deliberately generic/schematic, never photorealistic (ADR-004).
- `src/resolveComponentAsset.ts` — ARCHITECTURE.md §7.3's resolution order: a
  `GLTF_MODEL` with a url loads the real file (Suspense + error boundary, cloned per
  placement); `PLACEHOLDER` shows a plain marker; `PROCEDURAL_FALLBACK` or *no
  `ThreeDAsset` row at all* uses the procedural generator. The case falls back to its
  procedural wireframe in every case, since the zone system is positioned against it.

- `src/sceneTheme.ts` + `src/SceneThemeContext.ts` — the colours that must follow the
  app's light/dark theme: backdrop, grid and airflow-particle colours (a darker shade on a
  light backdrop so they stay visible; a test checks contrast). `WorkspaceCanvas`
  provides the theme to its children through the context, because React context doesn't
  cross the R3F `<Canvas>` boundary from outside. Case wireframe, zone markers and
  component colours are deliberately theme-independent.

## Zones and placement

- `src/zones/` — `InstallationZone`, `generateCaseZones`, `generateMotherboardZones`,
  `composeZone` (re-expresses a placed motherboard's zones in world space). All
  data-driven from spec fields, never hand-authored per model.
  - **Fan mounts** are `FAN_MOUNT_<n>`. The spec lists only supported fan *sizes*, so
    `fanMountFace(index)` assigns faces in a fixed order — front, rear, top, then
    cycling — and same-face mounts sit side by side. Airflow derives direction from this
    same function, so layout and model can't drift apart (a test asserts it).
- `src/placement.ts` — real `specifications` → zone-generator inputs, and
  `buildGenericModel(categoryKey, specs)`.

## Builds

- `src/buildSerialization.ts` — `serializeBuild` / `deserializeBuild` convert between the
  workspace's `{ quantity per component, zone → component }` and the database's flat
  rows: **one row per physical unit**, with `UNPLACED` (`UNPLACED_ZONE_KEY`) for units
  that are in the build but not in a zone.
- `src/buildSummary.ts` — `summarizeBuild`: unit count, total price (rounded to cents),
  missing essentials (CPU, motherboard, RAM, SSD, PSU, case — GPU is optional), and
  compatibility issue counts.
- `src/cameraState.ts` — `parseCameraState` / `cameraFromWorkspaceState`: validate the
  camera stored in `PCBuild.workspaceState` (finite numbers within ±100, position ≠
  target). Used by the API before storing and by the loaders when reading.

## Simulation (Phase 6)

- `src/airflow.ts` — fan direction (`fanFlowDirection(blade, face)`: normal blade intakes
  at the front and exhausts at the rear/top, reverse blade flips), CFM (the spec's, or an
  estimate from fan size), and `summarizeAirflow` → intake/exhaust/net CFM and case
  pressure (`POSITIVE` / `NEGATIVE` / `BALANCED` within 10% / `NONE`); plus the particle
  animation maths (`streamProgress`, `streamLoopsPerSecond`).
- `src/estimates.ts` — rule-based **estimates, not simulations**:
  - `estimateNoise` — case-fan levels added logarithmically (two equal fans ≈ +3 dB);
    size-based fallback when a fan has no dBA figure.
  - `estimateThermals` — load temperature ≈ 25 °C + heat ÷ cooling capacity × 60 °C ×
    an airflow factor. Capacity comes from the air cooler's rating or the AIO radiator
    size (a 65 W stock cooler when none is selected); clamped to 30-105 °C.
  - `estimatePerformance` — a relative 0-100 score (65% GPU, 35% CPU; games favor clock
    speed and cache over cores past 8) with a tier and CPU/GPU-bottleneck flag. Needs
    both a CPU and a GPU. Not an FPS figure.

All exports are re-exported from `src/index.ts`.

See `../../project-management/DEVELOPMENT_ROADMAP.md` for the phase history and
`../../project-management/ARCHITECTURE.md` §7 (and §11 for what changed since the
original design).
