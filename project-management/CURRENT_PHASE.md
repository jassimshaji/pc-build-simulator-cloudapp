# Current Phase

**Phase 4 — 3D Workspace Foundation: IN PROGRESS**

Milestones 1-2 are done:
1. `packages/three-d-engine` scaffold — a real R3F `<Canvas>` (`WorkspaceCanvas`)
   with lighting, grid, `OrbitControls`, mounted in `/workspace`'s center pane.
2. Six procedural generators (`createGenericCase`, `createGenericMotherboard`,
   `createGenericCpu`, `createGenericGpu`, `createGenericRam`,
   `createGenericPsu`) under `src/procedural/`, each a pure function producing
   a plain `THREE.Group` sized from real spec dimensions, matching
   ARCHITECTURE.md §7.3's documented signatures. 18 Vitest tests verify actual
   bounding-box geometry. Temporarily rendered as a row in `WorkspaceCanvas`
   for visual verification (throwaway — real placement is Milestones 3-4).

126 tests passing workspace-wide (34 component-models + 74 compatibility-engine
+ 18 three-d-engine).

## Next up: Milestone 3 — Installation zone system
Per ARCHITECTURE.md §7.2, an `InstallationZone` shape already documented:
```ts
interface InstallationZone {
  key: string;                 // "MOBO_TRAY", "PSU_BAY", "PCIE_SLOT_1", "RAM_SLOT_2", ...
  acceptsCategory: CategoryKey;
  position: [number, number, number];
  rotation: [number, number, number];
  constraints?: Record<string, unknown>; // e.g. maxLengthMm for a GPU zone
}
```
Zones are generated from a case's `specifications` (e.g. `ramSlots: 4` →
4 `RAM_SLOT_n` zones at computed offsets), not hand-authored per case model —
matches `BuildComponent.installedZoneKey`'s naming convention already in the
Prisma schema. Zones should highlight when a compatible component is selected
(query `runCompatibilityCheck` in a "would this be compatible if placed here"
mode — the Phase 3 engine is ready to be called this way). Click-to-place
itself (snapping a component into a highlighted zone, re-running the real
check) is Milestone 4. See `DEVELOPMENT_ROADMAP.md` → Phase 4 for the full
milestone list.

Waiting for explicit user instruction ("Continue" / "Resume development")
before starting Milestone 3. See `SESSION_CHECKPOINT.md` for exact resume
state.
