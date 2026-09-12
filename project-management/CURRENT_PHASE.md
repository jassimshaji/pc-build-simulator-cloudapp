# Current Phase

**Phase 4 — 3D Workspace Foundation: IN PROGRESS**

Milestone 1 (`packages/three-d-engine` scaffold) is done: a real R3F
`<Canvas>` (`WorkspaceCanvas` component — lighting, reference grid, a
placeholder box, `OrbitControls`) mounted in `/workspace`'s center pane via
`next/dynamic({ ssr: false })`, with a working "Reset view" button wired to
the camera via a `WorkspaceCanvasHandle` ref. Verified live: real canvas
mounts with no console errors, mouse-drag orbit actually rotates the view,
reset restores the exact initial framing, no mobile-width overflow.

## Next up: Milestone 2 — Procedural generators
Generic 3D model generators for the categories needed for a minimal
end-to-end build: Case, Motherboard, CPU, RAM, GPU, PSU (per ARCHITECTURE.md
§7 and ADR-004 — procedural generic models are first-class, not a stopgap,
given no licensed 3D assets). Each generator is a pure function that returns
a Three.js/R3F scene graph for its category, keyed by the
`proceduralGeneratorKey` values already recorded on seeded `ThreeDAsset` rows
(`createGenericCPU`, `createGenericMotherboard`, etc. — see
`apps/web/lib/threeDAssets.ts`'s `PROCEDURAL_GENERATORS` list from Phase 2).
Remaining categories (Fan, AIO, Air Cooler, SSD, Monitor, Case LCD) are
Milestone 5. See `DEVELOPMENT_ROADMAP.md` → Phase 4 for the full milestone
list; Milestone 3 (installation zones) and Milestone 4 (click-to-place wired
to the already-built compatibility engine) follow.

Waiting for explicit user instruction ("Continue" / "Resume development")
before starting Milestone 2. See `SESSION_CHECKPOINT.md` for exact resume
state.
