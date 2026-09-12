SESSION DATE: 2026-09-12

CURRENT PHASE: Phase 4, Milestone 1 COMPLETE. Next: Milestone 2 — procedural
generators (Case, Motherboard, CPU, RAM, GPU, PSU).

CURRENT TASK: None in progress — awaiting user instruction for Phase 4,
Milestone 2.

LAST COMPLETED STEP: Phase 4, Milestone 1 (`packages/three-d-engine` scaffold),
verified via typecheck/build/lint and a live Playwright pass against the
actual rendered WebGL canvas.

- `packages/three-d-engine/package.json`: added real dependencies — `three`
  (^0.186.0), `@react-three/fiber` (^9.7.0, requires React 19 — matches
  `apps/web`'s React 19.2.8), `@react-three/drei` (^10.7.8). `react`/
  `react-dom` added as `devDependencies` (for local typechecking) AND
  `peerDependencies` (so the package doesn't bundle its own React copy — it's
  consumed by `apps/web`'s single React tree). `@types/three` added as a dev
  dependency.
- `packages/three-d-engine/src/WorkspaceCanvas.tsx` (new): `"use client"`
  component exporting `WorkspaceCanvas` — an R3F `<Canvas>` with a dark
  background color, ambient + directional lighting, a `Grid` (drei) for
  spatial reference, a single gray placeholder box (only to prove the render
  pipeline actually works — Milestone 2's real procedural generators replace
  it), and `OrbitControls` (drei) which handles orbit/zoom/pan natively via
  mouse drag / scroll / right-click-drag — no custom code needed for those
  three. Exposes a `WorkspaceCanvasHandle` (`{ resetView: () => void }`) via
  `forwardRef`/`useImperativeHandle`, calling the underlying
  `OrbitControls.reset()` — the one camera action that genuinely needs an
  explicit trigger rather than continuous mouse input.
- `packages/three-d-engine/src/index.ts`: now exports `WorkspaceCanvas` +
  `WorkspaceCanvasHandle` (was `export {}`).
- `apps/web/package.json`: added `@pcbuilder/three-d-engine` as a workspace
  dependency (first consumer outside the package itself).
- `apps/web/app/workspace/build-workspace.tsx`: replaced the Phase 1 static
  center pane (a dashed-border div + four `disabled` Orbit/Zoom/Pan/Reset
  buttons) with the real `WorkspaceCanvas`, loaded via `next/dynamic(...,
  { ssr: false })` since `@react-three/fiber`'s `Canvas` needs a browser/WebGL
  context and can't render on the server — shows a "Loading 3D scene..."
  fallback until the client bundle loads. A `canvasRef` (typed
  `WorkspaceCanvasHandle`) is wired to a real "Reset view" button; a caption
  ("Drag to orbit · Scroll to zoom · Right-click drag to pan") explains the
  mouse-driven controls in place of the old fake Orbit/Zoom/Pan buttons (which
  didn't map cleanly onto how `OrbitControls` actually works — it handles all
  three simultaneously via different mouse inputs, not as discrete toggled
  modes).

**Verification:**
- `pnpm --filter @pcbuilder/three-d-engine run typecheck` — exit 0.
- `pnpm --filter web run typecheck` / `lint` — clean.
- `pnpm typecheck` (whole workspace) — 11/11 tasks pass (up from 10 — the new
  package's own typecheck task).
- `pnpm build` (whole workspace) — 6/6 pass; only the pre-existing cosmetic
  Turbopack `@prisma/client` warning (unchanged).
- `pnpm test` (whole workspace) — 108/108 pass, unchanged (this milestone adds
  no new package-level tests — R3F scene code is verified live/visually, same
  approach used for Phase 2's admin UI and Phase 3's build-flow UI milestones,
  not via Vitest).
- Live Playwright pass against the actual running dev server (fresh restart
  after adding the new dependencies, since Turbopack HMR doesn't reliably pick
  up brand-new node_modules packages): confirmed exactly one real `<canvas>`
  element mounts in the center pane with zero console/page errors; captured a
  screenshot, then simulated a mouse-drag across the canvas and captured
  another screenshot showing the camera genuinely orbited (grid/cube framing
  visibly different); clicked "Reset view" and confirmed the resulting
  screenshot is pixel-for-pixel the same framing as the very first screenshot;
  confirmed no horizontal overflow and the canvas still renders (1 canvas
  element) at 400px mobile width.

FILES CREATED:
- packages/three-d-engine/src/WorkspaceCanvas.tsx

FILES MODIFIED:
- packages/three-d-engine/package.json (real three/fiber/drei deps, react
  peer deps)
- packages/three-d-engine/src/index.ts (real exports)
- packages/three-d-engine/README.md
- apps/web/package.json (added @pcbuilder/three-d-engine dependency)
- apps/web/app/workspace/build-workspace.tsx (real WorkspaceCanvas + Reset
  view button, replacing the static placeholder)
- project-management/DEVELOPMENT_ROADMAP.md, project-management/TODO.md,
  project-management/PROJECT_STATUS.md, project-management/CURRENT_PHASE.md,
  project-management/CHANGELOG.md (this checkpoint's sibling docs)

DATABASE CHANGES: none.

API CHANGES: none.

FRONTEND CHANGES: `/workspace`'s center pane now renders a real, orbitable 3D
scene instead of a static placeholder box; the four fake Orbit/Zoom/Pan/Reset
buttons became one real "Reset view" button plus an instructional caption.

3D ENGINE CHANGES: `packages/three-d-engine` is no longer an empty stub — it
has a real, working R3F canvas + camera rig. No procedural component models or
installation zones yet (Milestones 2-3).

KNOWN ISSUES: none new. (Carried over, unchanged: orphaned storage objects on
component delete; the cosmetic Turbopack `export *` build warning; build slot
uniqueness not enforced in the Phase 3 build flow UI yet — still deferred to
when there's an actual 3D zone to place into, i.e. this phase's later
milestones.)

TEST STATUS: 108/108 passing workspace-wide, unchanged (this milestone was
verified live/visually, appropriately for rendering code — no new Vitest
tests were needed or added).

NEXT STEP: When the user says "Continue": re-read this file + PROJECT_STATUS.md
+ CURRENT_PHASE.md + TODO.md, confirm `pnpm install && pnpm build` still passes
and Postgres is running, then start PHASE 4, MILESTONE 2 — procedural
generators for Case, Motherboard, CPU, RAM, GPU, PSU (the categories needed
for a minimal end-to-end build per the MVP definition in
`DEVELOPMENT_ROADMAP.md`). Each generator should be a pure function (e.g.
`createGenericCPU(spec: CpuSpec): THREE.Group` or an R3F component
equivalent) living in `packages/three-d-engine/src/generators/`, keyed to
match the `proceduralGeneratorKey` values already used in
`apps/web/lib/threeDAssets.ts`'s `PROCEDURAL_GENERATORS` list
(`createGenericCPU`, `createGenericMotherboard`, `createGenericGPU`,
`createGenericRAM`, `createGenericPSU`, `createGenericCase`) so seeded
`ThreeDAsset` rows already pointing at these names resolve to something real.
Keep each generator's geometry simple (boxes/cylinders with roughly
correct proportions and a distinct color per category — this is explicitly
NOT meant to be photorealistic, see ADR-004) rather than over-investing in
visual fidelity this early. Consider whether `WorkspaceCanvas` should grow a
prop to render an arbitrary list of placed components (even with hardcoded
positions for now, since the real installation-zone system is Milestone 3) as
a way to visually prove the generators work end-to-end, or whether a
standalone test harness/story is enough for this milestone — use judgment,
but lean toward something that renders inside the real `/workspace` page so
verification stays consistent with how every other milestone this project has
been checked. Stop at Milestone 2's checkpoint rather than also starting
Milestone 3 (installation zones) in the same session.

EXACT COMMANDS TO RUN THE PROJECT LOCALLY:
  pnpm install
  pnpm dev                     # apps/web on http://localhost:3000

One-time per machine / after a fresh clone (all already done on this machine):
  cp packages/database/.env.example packages/database/.env
  pnpm --filter @pcbuilder/database run db:migrate
  pnpm --filter @pcbuilder/database run db:seed
  cp apps/web/.env.example apps/web/.env.local   # fill in DATABASE_URL + generate NEXTAUTH_SECRET; S3_* only needed for image/model upload

Other root scripts: `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test`.

Local Postgres on THIS machine: native Windows service `postgresql-x64-17` on
localhost:5432, superuser `postgres`/`postgres`, app role `pcbuilder`/`pcbuilder`
owning database `pcbuilder`. Confirmed running this session. SeaweedFS is NOT
running (not needed for this milestone; Phase 4 Milestone 6 — real GLTF asset
loading — may need it eventually) — see docs/DEVELOPMENT.md for restart steps.
The dev server was left running this session (restarted fresh after adding
the three-d-engine dependencies; a future session can reuse it or restart it
freely — Turbopack HMR doesn't reliably pick up brand-new node_modules
packages, so restart after any future dependency additions too).

A GitHub remote exists: `origin` →
https://github.com/jassimshaji/pc-build-simulator-cloudapp.git (added by the
user outside this session, in a prior session). Nothing has been pushed there
by any session — only a merge pulling its `LICENSE` file in. Don't assume
push/PR workflows are set up without checking with the user first.

`jassimshaji20@gmail.com` is `ADMIN` in the database (promoted 2 sessions
ago). A fresh login is required after any future role change for it to take
effect, since next-auth signs the role into a JWT at login time.

PATH note (still applies): if `node`/`pnpm`/`npm`/`psql` report "not recognized" in a
fresh shell, prepend, e.g. in PowerShell:
  $env:Path += ";C:\Program Files\nodejs;$env:APPDATA\npm;C:\Program Files\PostgreSQL\17\bin"
