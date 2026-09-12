# packages/three-d-engine

React Three Fiber scene primitives, the installation-zone system, procedural generic
3D model generators (createGenericGPU, createGenericMotherboard, etc.), and the
asset-fallback resolver (`resolveComponentAsset`) that chooses between an uploaded
GLTF/GLB model, a named procedural generator, or a last-resort default per category.

**Status:** scaffold (Phase 4, Milestone 1). `src/WorkspaceCanvas.tsx` exports a
`WorkspaceCanvas` component (an R3F `<Canvas>` with lighting, a reference grid, a
single placeholder box, and `OrbitControls` for orbit/zoom/pan) and a
`WorkspaceCanvasHandle` (`{ resetView: () => void }`) exposed via `ref` for the one
camera action that needs an explicit trigger rather than mouse/trackpad input.
Consumed by `apps/web/app/workspace/build-workspace.tsx` via `next/dynamic` with
`ssr: false` (WebGL needs a browser).

The installation-zone system, procedural generic 3D model generators
(`createGenericGPU`, `createGenericMotherboard`, etc.), and the asset-fallback
resolver (`resolveComponentAsset`) are scheduled for Milestones 2-3+ in
`../../project-management/DEVELOPMENT_ROADMAP.md`. See
`../../project-management/ARCHITECTURE.md` §7.
