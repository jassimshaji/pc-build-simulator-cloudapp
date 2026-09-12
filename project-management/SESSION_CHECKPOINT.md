SESSION DATE: 2026-09-12

CURRENT PHASE: Phase 4, Milestone 2 COMPLETE. Next: Milestone 3 —
installation zone system.

CURRENT TASK: None in progress — awaiting user instruction for Phase 4,
Milestone 3.

LAST COMPLETED STEP: Phase 4, Milestone 2 (procedural generators for Case,
Motherboard, CPU, RAM, GPU, PSU), verified via typecheck/build/lint, real
Vitest unit tests, and a live Playwright pass against the actual rendered
scene.

- `packages/three-d-engine/src/procedural/units.ts` (new): `mm(value)` —
  converts millimeters (how every spec stores dimensions) to scene units,
  using the convention 1 scene unit = 1 meter. Centralized so every generator
  scales consistently relative to every other one in the same scene.
- Six generator files (new), each exporting a pure function matching
  ARCHITECTURE.md §7.3's documented parameter shapes and returning a plain
  `THREE.Group` (no React/R3F dependency — these are framework-agnostic, like
  `compatibility-engine`'s rules, so they're directly Vitest-testable):
  - `createGenericCase({ formFactor, dimensions })` — a wireframe shell
    (`EdgesGeometry` + `LineSegments`), not a solid box, so components placed
    inside it later (Milestones 3-4) stay visible.
  - `createGenericMotherboard({ formFactor })` — a flat PCB-green board sized
    from a lookup table of standard footprints per form factor (Mini-ITX
    170×170mm, Micro-ATX 244×244mm, ATX 305×244mm, E-ATX 305×330mm).
  - `createGenericCpu({ socket })` — a ~40mm metallic IHS square; `socket`
    isn't used to vary geometry (real sockets are all roughly this size) but
    is kept in the params shape for signature parity/future use.
  - `createGenericGpu({ length, width, height, slotWidth, fanCount })` — a
    body sized directly from the three dimension fields, with `fanCount`
    cylinder "fans" evenly spaced across the card's front face. `slotWidth`
    is a count, not a geometry input, so it's accepted but unused.
  - `createGenericRam({ formFactor, height })` — a thin stick, length from a
    lookup (UDIMM 133mm, SODIMM 67mm), height from the given param.
  - `createGenericPsu({ formFactor, length })` — a box sized from a
    cross-section lookup per form factor (ATX 150×86mm, SFX/SFX-L
    125×63.5mm) and the given length, plus a fan-grill cylinder on top.
- `packages/three-d-engine/src/procedural/index.ts` (new): re-exports all six
  + their param types.
- `packages/three-d-engine/src/index.ts`: now also `export * from
  "./procedural"`.
- `packages/three-d-engine/src/WorkspaceCanvas.tsx`: the single gray
  placeholder box is replaced with all six generators rendered in a row (a
  `placeAt` helper shifts each group so its bounding-box bottom sits on the
  grid, then positions it along x) — explicitly commented as a temporary
  visual smoke test for this milestone, not the real installation-zone-driven
  placement (Milestones 3-4).
- `packages/three-d-engine/package.json`: added `vitest` (pinned to `^3.2.4`
  to match the version used by `compatibility-engine`/`component-models`,
  rather than accepting whatever pnpm resolved by default — which was a
  major-version-newer `5.0.0` this session; deliberately avoided introducing
  a second Vitest major version into the monorepo). `test` script is now
  `vitest run` (was a no-op echo); `typecheck` now points at a new
  `tsconfig.typecheck.json` (same pattern as the other two Vitest-using
  packages, so `tests/` type-checks without polluting the build's `rootDir`).
- 18 new test files/specs under `tests/` (one per generator, `createGenericCase
  .spec.ts` etc.) verifying: each returns a `THREE.Group`; its actual bounding
  box (via `THREE.Box3`) matches the mm-converted input dimensions; different
  form-factor/size inputs produce genuinely different, correctly-ordered
  geometry (Mini-ITX smaller than E-ATX, SODIMM shorter than UDIMM, SFX
  smaller cross-section than ATX, etc.); the GPU's fan-mesh count matches
  `fanCount` exactly (including 0).
- **Bug caught and fixed via live screenshots, not just unit tests:** the
  first color palette (near-black grays like `0x27272a`, `0x18181b`,
  `0x1f1f23`) was nearly indistinguishable from the scene's `#09090b`
  background under the original lighting — visually confirmed via a zoomed
  Playwright screenshot where most models were nearly invisible. Fixed by
  switching every generator's material color to a lighter, clearly-contrasting
  shade (e.g. motherboard green `0x1e3a2f` → `0x1e7a54`, GPU/PSU body
  `0x27272a`/`0x1f1f23` → `0x4b5563`) and bumping `WorkspaceCanvas`'s ambient
  light intensity from `0.6` to `0.9`. Unit tests alone (which only check
  geometry/dimensions, not color) would never have caught this — this is
  exactly why the project's live-verification standard matters for rendering
  code.
- Hit one unrelated environment blip mid-session: a Playwright navigation to
  `/workspace` hung for ~6 minutes before the dev server logged
  `Can't reach database server at localhost:5432` even though
  `Get-Service postgresql-x64-17` showed `Running` throughout and a
  subsequent `psql SELECT 1` succeeded immediately. Restarting the dev server
  resolved it and no further blips occurred for the rest of the session. Not
  investigated further since it didn't recur — flagging here in case a future
  session sees the same thing.

**Verification:**
- `pnpm --filter @pcbuilder/three-d-engine run typecheck` — exit 0.
- `pnpm --filter @pcbuilder/three-d-engine run test` — 18/18 passing.
- `pnpm typecheck` (whole workspace) — 11/11 tasks pass.
- `pnpm build` (whole workspace) — 6/6 pass; only the pre-existing cosmetic
  Turbopack `@prisma/client` warning (unchanged).
- `pnpm test` (whole workspace) — 126/126 pass (34 component-models + 74
  compatibility-engine + 18 three-d-engine).
- `pnpm --filter web run lint` — clean.
- Live Playwright pass against the real running dev server (restarted fresh
  after the DB blip above): zero console/page errors; a wide screenshot and a
  tightly-cropped screenshot both confirm all 6 generic models render as
  distinct, correctly-shaped, clearly-colored objects in a row (case wireframe,
  green motherboard, tiny CPU square, thin RAM sliver — genuinely thin at true
  7mm scale, not a bug — GPU with 3 visible fan circles, PSU with its own fan
  grill).

FILES CREATED:
- packages/three-d-engine/src/procedural/units.ts
- packages/three-d-engine/src/procedural/createGenericCase.ts
- packages/three-d-engine/src/procedural/createGenericMotherboard.ts
- packages/three-d-engine/src/procedural/createGenericCpu.ts
- packages/three-d-engine/src/procedural/createGenericGpu.ts
- packages/three-d-engine/src/procedural/createGenericRam.ts
- packages/three-d-engine/src/procedural/createGenericPsu.ts
- packages/three-d-engine/src/procedural/index.ts
- packages/three-d-engine/tsconfig.typecheck.json
- packages/three-d-engine/tests/createGenericCase.spec.ts
- packages/three-d-engine/tests/createGenericMotherboard.spec.ts
- packages/three-d-engine/tests/createGenericCpu.spec.ts
- packages/three-d-engine/tests/createGenericGpu.spec.ts
- packages/three-d-engine/tests/createGenericRam.spec.ts
- packages/three-d-engine/tests/createGenericPsu.spec.ts

FILES MODIFIED:
- packages/three-d-engine/src/index.ts (re-exports procedural generators)
- packages/three-d-engine/src/WorkspaceCanvas.tsx (showcase row + color/light fixes)
- packages/three-d-engine/package.json (vitest dependency, real test/typecheck scripts)
- project-management/DEVELOPMENT_ROADMAP.md, project-management/TODO.md,
  project-management/PROJECT_STATUS.md, project-management/CURRENT_PHASE.md,
  project-management/CHANGELOG.md (this checkpoint's sibling docs)

DATABASE CHANGES: none.

API CHANGES: none.

FRONTEND CHANGES: `/workspace`'s center pane now shows 6 distinct procedural
models in a row instead of one gray placeholder box (temporary — real
placement lands in Milestones 3-4).

3D ENGINE CHANGES: 6 real procedural generators exist and are unit-tested.
Still no installation zones or click-to-place (Milestone 3-4), and the
remaining 6 categories (Fan, AIO, Air Cooler, SSD, Monitor, Case LCD) aren't
generated yet (Milestone 5).

KNOWN ISSUES: none new project-code issues. (Carried over, unchanged: orphaned
storage objects on component delete; the cosmetic Turbopack `export *` build
warning; build slot uniqueness not enforced in the Phase 3 build flow UI yet.)
One unexplained transient dev-environment blip this session (see above) — not
a code issue, didn't recur, flagged for awareness only.

TEST STATUS: 126/126 passing workspace-wide (34 component-models + 74
compatibility-engine + 18 three-d-engine, up from 108 last session).

NEXT STEP: When the user says "Continue": re-read this file + PROJECT_STATUS.md
+ CURRENT_PHASE.md + TODO.md, confirm `pnpm install && pnpm build` still passes
and Postgres is running, then start PHASE 4, MILESTONE 3 — installation zone
system. Per ARCHITECTURE.md §7.2, define the `InstallationZone` interface
(`{ key, acceptsCategory, position, rotation, constraints? }`) in
`packages/three-d-engine` (probably a new `src/zones/` directory, parallel to
`procedural/`), plus a zone-generator function that reads a case's
`specifications` (e.g. `ramSlots: 4` → 4 `RAM_SLOT_n` zones,
`m2Slots`/`sataPorts` → storage zones, `pcieSlots` → `PCIE_SLOT_n` zones) and
computes reasonable positions/rotations relative to the case's own dimensions
— data-driven, not hand-authored per case model. Then wire zone highlighting
into `WorkspaceCanvas`: when a category is "selected" (the existing
`build-workspace.tsx` already has a `selected` component state from Phase 3 —
reuse or extend it), the matching zones should visually highlight (e.g. a
colored translucent box or outline at each zone's position). This does NOT
need real click-to-place yet (Milestone 4) — just the zone data model and
visual highlighting. Needs real Vitest coverage for the zone-generation logic
(pure function, same standard as the procedural generators). Consider whether
the showcase row in `WorkspaceCanvas` should be replaced now by an actual case
with visible zones, or kept temporarily alongside — probably replace it,
since a case + its zones is a more meaningful milestone-3 demo than an
unrelated row of parts. Stop at this milestone's checkpoint rather than also
starting Milestone 4 (click-to-place) in the same session.

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
owning database `pcbuilder`. Confirmed running this session (see the transient
blip noted above — if a future session sees the same "Can't reach database
server" error despite the service showing Running, try restarting the dev
server first before assuming Postgres itself is actually down). SeaweedFS is
NOT running (not needed for this milestone). The dev server was left running
this session.

A GitHub remote exists: `origin` →
https://github.com/jassimshaji/pc-build-simulator-cloudapp.git (added by the
user outside any session). Nothing has been pushed there by any session —
only a merge pulling its `LICENSE` file in, in a prior session. Don't assume
push/PR workflows are set up without checking with the user first.

`jassimshaji20@gmail.com` is `ADMIN` in the database (promoted a couple of
sessions ago). A fresh login is required after any future role change for it
to take effect, since next-auth signs the role into a JWT at login time.

PATH note (still applies): if `node`/`pnpm`/`npm`/`psql` report "not recognized" in a
fresh shell, prepend, e.g. in PowerShell:
  $env:Path += ";C:\Program Files\nodejs;$env:APPDATA\npm;C:\Program Files\PostgreSQL\17\bin"
