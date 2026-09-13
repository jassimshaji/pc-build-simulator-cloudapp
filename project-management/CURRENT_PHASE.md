# Current Phase

**Phase 4 — 3D Workspace Foundation: IN PROGRESS**

Milestones 1-5 are done:
1. `packages/three-d-engine` scaffold — R3F `<Canvas>`, camera controls.
2. Six procedural generators (Case, Motherboard, CPU, GPU, RAM, PSU).
3. Installation zone system with category-based highlighting.
4. Click-to-place: real placement state, zone-position composition, and
   clicking a highlighted zone both snaps a component into place and
   re-triggers the real Phase 3 compatibility check.
5. The remaining seven generators (Fan, Radiator, AIO, Air Cooler, SSD,
   Monitor, Case LCD) — every one of the 12 component categories now has a
   real procedural generator, wired into `placement.ts`'s `buildGenericModel`
   dispatcher.

189 tests passing workspace-wide (34 component-models + 74
compatibility-engine + 81 three-d-engine).

## Next up: Milestone 6 — Real GLTF asset loading
Per ARCHITECTURE.md §7.3's documented asset resolution order:
1. `ThreeDAsset` row with `kind = GLTF_MODEL` and a real `url` → load via
   `useGLTF`/GLTFLoader (Draco-compressed, lazy-loaded, cached).
2. `ThreeDAsset` row with `kind = PROCEDURAL_FALLBACK` → call the named
   generator (`buildGenericModel`, already built) with the component's spec.
3. (last resort) a placeholder.

The admin-facing half of this already exists (Phase 2, Milestone 6's 3D asset
manager lets an admin upload a `.glb` and mark a component's `ThreeDAsset`
as `GLTF_MODEL`) — what's missing is `resolveComponentAsset(component)`
actually reading that `ThreeDAsset` row and loading the real file when one's
there, replacing `buildGenericModel`'s always-procedural behavior. This is
the first milestone that needs the 3D scene to know about a component's
`ThreeDAsset` at all (currently it only ever sees `specifications`). See
`DEVELOPMENT_ROADMAP.md` → Phase 4 for the full milestone list.

Waiting for explicit user instruction ("Continue" / "Resume development")
before starting Milestone 6. See `SESSION_CHECKPOINT.md` for exact resume
state.
