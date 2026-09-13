# Current Phase

**Phase 4 — 3D Workspace Foundation: IN PROGRESS**

Milestones 1-4 are done:
1. `packages/three-d-engine` scaffold — R3F `<Canvas>` (`WorkspaceCanvas`),
   camera controls.
2. Six procedural generators (Case, Motherboard, CPU, GPU, RAM, PSU).
3. Installation zone system (`InstallationZone`, `generateCaseZones`,
   `generateMotherboardZones`) with category-based highlighting.
4. Click-to-place: `composeZone` (world-space composition), `placement.ts`
   (spec extraction + `buildGenericModel` dispatcher), and real
   `caseComponent`/`placements`/`onZoneClick` wiring in `WorkspaceCanvas` and
   `build-workspace.tsx`. Clicking a highlighted zone snaps the selected
   component into place and re-triggers the real Phase 3 compatibility check
   — no new compatibility logic needed, the existing engine is reused as-is.
   Verified live end-to-end: case → motherboard → RAM, two levels of zone
   composition, real compatibility results appearing after each click.

155 tests passing workspace-wide (34 component-models + 74
compatibility-engine + 47 three-d-engine).

## Next up: Milestone 5 — Remaining procedural generators
Fan, AIO, Air Cooler, SSD, Monitor, Case LCD (a placeholder surface for the
last one, per the roadmap). These are exactly the categories
`buildGenericModel` (in `packages/three-d-engine/src/placement.ts`) currently
returns `null` for, falling back to a plain solid marker when one is placed —
adding each generator plus a `case "X":` branch in that dispatcher's switch is
the same mechanical pattern already used for MOTHERBOARD/CPU/GPU/RAM/PSU. Fan
and AIO also need zone acceptance already wired (`FAN_MOUNT_n` accepts FAN,
`RADIATOR_MOUNT_n` accepts AIO_COOLER, `CPU_COOLER_MOUNT` accepts AIR_COOLER —
all exist since Milestone 3), so once their generators exist they should be
placeable immediately with no further zone-system changes. See
`DEVELOPMENT_ROADMAP.md` → Phase 4 for the full milestone list; Milestone 6
(real GLTF asset loading, replacing procedural fallback when an admin has
uploaded a real model) follows.

Waiting for explicit user instruction ("Continue" / "Resume development")
before starting Milestone 5. See `SESSION_CHECKPOINT.md` for exact resume
state.
