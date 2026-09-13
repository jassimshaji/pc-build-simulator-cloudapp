# Current Phase

**Phase 4 — 3D Workspace Foundation: COMPLETE (all 6 milestones)**

1. `packages/three-d-engine` scaffold — R3F `<Canvas>`, camera controls.
2. Six procedural generators (Case, Motherboard, CPU, GPU, RAM, PSU).
3. Installation zone system with category-based highlighting.
4. Click-to-place: real placement state, zone-position composition, and
   clicking a highlighted zone both snaps a component into place and
   re-triggers the real Phase 3 compatibility check.
5. The remaining seven generators (Fan, Radiator, AIO, Air Cooler, SSD,
   Monitor, Case LCD) — every one of the 12 component categories has a real
   procedural generator, wired into `placement.ts`'s `buildGenericModel`
   dispatcher.
6. Real GLTF asset loading — `resolveComponentAsset(categoryKey,
   specifications, asset?)` implements ARCHITECTURE.md §7.3's resolution
   order (GLTF_MODEL with a url → load the real file via `useGLTF` in a
   Suspense/error boundary; PLACEHOLDER → a plain fallback marker;
   PROCEDURAL_FALLBACK or no ThreeDAsset row at all → the existing
   procedural generator, unchanged default behavior). Wired into
   `WorkspaceCanvas` for both zone-placed components and the case itself
   (the one place outside the zone/placement system that needed its own
   asset resolution, since it's the root container rather than something
   placed into a zone).

195 tests passing workspace-wide (34 component-models + 74
compatibility-engine + 87 three-d-engine).

## PHASE 4 IS NOW COMPLETE.

## Next up: Phase 5 — Build Management
1. Save/load/rename/duplicate/delete builds, persisting `workspaceState`
   (camera) and `BuildComponent` placements.
2. Build sharing (share slug, read-only public view).
3. Build summary panel: component list, compatibility status, power
   estimate.

This needs real persistence for a build (currently `/workspace` state is
entirely client-side and lost on refresh). The `PCBuild`/`BuildComponent`
Prisma models already exist (from the original Phase 0 schema design —
`PCBuild` has `workspaceState`/`compatibilityStatus`/`estimatedPowerWatts`/
`isShared`/`shareSlug`; `BuildComponent` has `installedZoneKey` +
position/rotation) but nothing has ever written to them — Phase 5's job is
new API routes under `/api/builds` (list/create/get/update/delete + a public
share-slug read route) and wiring `build-workspace.tsx`'s existing in-memory
state (`buildLines`/`placements`) to them. See `DEVELOPMENT_ROADMAP.md` →
Phase 5 for the full milestone list.

Waiting for explicit user instruction ("Continue" / "Resume development")
before starting Phase 5, Milestone 1. See `SESSION_CHECKPOINT.md` for exact
resume state.
