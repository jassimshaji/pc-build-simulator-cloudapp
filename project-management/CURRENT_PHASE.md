# Current Phase

**Phase 4 — 3D Workspace Foundation: IN PROGRESS**

Milestones 1-3 are done:
1. `packages/three-d-engine` scaffold — a real R3F `<Canvas>` (`WorkspaceCanvas`)
   with lighting, grid, `OrbitControls`, mounted in `/workspace`'s center pane.
2. Six procedural generators (Case, Motherboard, CPU, GPU, RAM, PSU) under
   `src/procedural/`, each a pure function producing a plain `THREE.Group`
   sized from real spec dimensions. 18 Vitest tests.
3. Installation zone system under `src/zones/`: `InstallationZone` type +
   `generateCaseZones`/`generateMotherboardZones`, both pure and data-driven
   from spec fields (never hand-authored per model). 12 Vitest tests.
   `WorkspaceCanvas` now shows a case + its zones and a motherboard + its
   zones, with a `highlightCategory` prop (wired from the existing
   category-picker state in `build-workspace.tsx`) that brightens zones
   matching the currently selected category.

138 tests passing workspace-wide (34 component-models + 74
compatibility-engine + 30 three-d-engine).

## Next up: Milestone 4 — Click-to-place wired to the compatibility engine
Per ARCHITECTURE.md §7.1's interaction model: select a component → compatible
zones highlight (done, Milestone 3) → click a highlighted zone → snap the
component into it → `runCompatibilityCheck` re-runs and panels update. This
needs: (1) actual placement state (which component sits in which zone —
likely mirroring `BuildComponent`'s shape: `{ componentId, installedZoneKey,
position, rotation }`, but client-side only for now since `PCBuild`
persistence is Phase 5); (2) composing a zone's local position into real
world space once its owning component is actually placed (e.g. once a
motherboard is placed in the case's `MOBO_TRAY` zone, the motherboard's own
`RAM_SLOT_n` zones need to render at the case's world position + the
motherboard's local zone offset — the composition step explicitly deferred
out of Milestone 3); (3) click handling in `WorkspaceCanvas` (zones need to
become clickable, not just highlighted); (4) calling the real
`/api/compatibility/check` (or `runCompatibilityCheck` directly, client-side)
with the updated placement so the build-flow UI's existing compatibility
panel (from Phase 3) reflects it. See `DEVELOPMENT_ROADMAP.md` → Phase 4 for
the full milestone list.

Waiting for explicit user instruction ("Continue" / "Resume development")
before starting Milestone 4. See `SESSION_CHECKPOINT.md` for exact resume
state.
