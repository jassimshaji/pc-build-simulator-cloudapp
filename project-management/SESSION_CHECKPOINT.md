SESSION DATE: 2026-09-13

CURRENT PHASE: Phase 4 COMPLETE (all 6 milestones). Next: Phase 5 — Build
Management, Milestone 1 (save/load/rename/duplicate/delete builds).

CURRENT TASK: None in progress — awaiting user instruction for Phase 5.

LAST COMPLETED STEP: Phase 4, Milestone 6 (real GLTF asset loading) — the
final Phase 4 milestone. Verified via Vitest, whole-workspace typecheck/
build/lint, and a live Playwright pass covering every resolution branch.

- New `packages/three-d-engine/src/resolveComponentAsset.ts`: a pure,
  framework-agnostic `resolveComponentAsset(categoryKey, specifications,
  asset?)` implementing ARCHITECTURE.md §7.3's exact resolution order:
  1. `asset.kind === "GLTF_MODEL"` with a real `url` -> `{type:"gltf", url}`.
  2. `asset.kind === "PLACEHOLDER"` -> `{type:"placeholder"}`.
  3. `asset.kind === "PROCEDURAL_FALLBACK"`, OR no `asset` at all (no
     ThreeDAsset row) -> `{type:"procedural", model:
     buildGenericModel(categoryKey, specifications)}`. Case 3's "no row"
     branch is the architecture doc's own documented last-resort default,
     not a placeholder — this is why every component created without ever
     visiting the 3D asset manager keeps rendering exactly as it did before
     this milestone (a real regression risk I checked for specifically).
  `PlacedComponentAsset` type: `{kind: "GLTF_MODEL"|"PROCEDURAL_FALLBACK"|
  "PLACEHOLDER", url?: string|null}`.
- `packages/three-d-engine/src/WorkspaceCanvas.tsx`: `PlacedComponent`
  gained an optional `asset?: PlacedComponentAsset | null` field. New
  components: `PlacedComponentModel` (dispatches a placement to whichever
  resolution applies), `GeneratedModel` (unchanged procedural-positioning
  logic, extracted), `GltfPlacedModel` (loads via `@react-three/drei`'s
  `useGLTF`, `.clone(true)`-ing the cached scene per placement so two
  identical placed components — e.g. two of the same RAM stick — don't
  fight over one Object3D's parent/position), `ModelErrorBoundary` (a class
  component; a broken/unreachable GLTF url must not crash the whole canvas,
  only fall back for that one placement), `OccupiedFallbackMarker` (the
  same plain marker Milestone 4 already used for "occupied, nothing to
  render yet" — reused for PLACEHOLDER, GLTF-still-loading, and
  GLTF-load-failed alike, rather than inventing a second visual language for
  what is, to the viewer, the same "nothing real to show" situation). The
  case itself (rendered as the root container the whole zone system is
  positioned against, not a zone placement) needed its own explicit
  `resolveComponentAsset("CASE", ...)` check — the *only* place outside the
  placement system that needed to resolve an asset. Its GLTF Suspense/error
  fallback is the real procedural wireframe case (already computed
  synchronously for zone-positioning purposes, via the existing
  `createGenericCase`+`placeAt`) rather than a generic gray box — and,
  deliberately, an explicit PLACEHOLDER kind on the case *also* falls back
  to that same procedural wireframe rather than showing nothing, since the
  case must always have *something* the zone system can be positioned
  against.
- `packages/three-d-engine/src/index.ts`: exports `resolveComponentAsset`,
  `PlacedComponentAsset`, `AssetResolution`.
- `apps/web/app/api/components/route.ts`: the list `GET` now includes
  `threeDAssets: true` (the detail-by-id `GET` already did, from Phase 2).
- `apps/web/app/workspace/build-workspace.tsx`: `ComponentSummary` gained
  `threeDAssets: ThreeDAssetSummary[]`; `BuildLine` gained an optional
  `asset` field (the component's first `ThreeDAsset` row — the schema
  technically allows several per component, but the admin 3D asset manager
  only ever manages one "slot", per that route's own comment); `handleAdd`/
  `handleZoneClick`/the `caseComponent` prop all now thread `asset` through
  to `WorkspaceCanvas`.
- New `packages/three-d-engine/tests/resolveComponentAsset.spec.ts`: 6 tests
  covering every resolution branch (GLTF with url, GLTF missing its url
  falls back to procedural, explicit PLACEHOLDER, PROCEDURAL_FALLBACK, no
  asset at all, and an unrecognized category still returning a null model
  same as `buildGenericModel` always did).

**Verification:**
- `pnpm --filter @pcbuilder/three-d-engine run test` — 87/87 passing (up
  from 81 last session).
- `pnpm typecheck`/`pnpm build`/`pnpm test` (whole workspace) — 11/11, 6/6,
  10/10 tasks pass; 195 tests total (34 component-models + 74
  compatibility-engine + 87 three-d-engine). Only the pre-existing cosmetic
  Turbopack `@prisma/client` warning.
- `pnpm --filter web run lint` — clean.
- **Live verification** (Playwright, driven from a standalone scratch script
  since this session's environment has no browser-automation tool of its
  own — installed `playwright` into an isolated scratch npm project so
  nothing was added to the repo's package.json/lockfile; reused this
  machine's already-cached Chromium build from a prior session):
  - Generated a real, valid `.glb` test asset using three.js's own
    `GLTFExporter` (a magenta octahedron) via a one-off Node script — had to
    polyfill a minimal `FileReader` (browser-only API the exporter's binary
    path depends on) to make it work outside a browser.
  - Registered a temporary admin, created a temporary CASE component with no
    `ThreeDAsset` row at all -> screenshot confirms the normal procedural
    wireframe case (unchanged regression behavior).
  - Set `ThreeDAsset.kind = GLTF_MODEL` with a real url (see SeaweedFS note
    below) -> screenshot confirms the actual magenta octahedron renders in
    the case's place, not the wireframe box — the real load+render pipeline
    works end-to-end.
  - Set `kind = PLACEHOLDER` on the same (case) component -> screenshot
    confirms it falls back to the procedural wireframe, matching the
    deliberate root-container design decision above.
  - Restored the case to `PROCEDURAL_FALLBACK` and re-verified Milestone
    4/5's click-to-place regression: a real seeded motherboard (ROG STRIX
    B650-A) still snaps into `MOBO_TRAY` and triggers a genuine
    `checkCaseFormFactor` INFO compatibility result — the
    `PlacedComponentModel`/`GeneratedModel` rewrite didn't break the
    existing procedural path.
  - Created a second temporary MOTHERBOARD test component, set its asset to
    `PLACEHOLDER` *before* ever placing it, then click-to-placed it into
    `MOBO_TRAY` -> screenshot + the "Your build" list (both lines show
    "placed", with a real compatibility result) confirms it renders as the
    plain fallback marker, not a real motherboard shape — this is the
    actually-representative PLACEHOLDER check, since the case's own
    PLACEHOLDER path deliberately looks identical to its procedural default.
  - Zero console/page errors across every one of the above steps.
  - All temporary components, their ThreeDAsset rows (cascade-deleted), and
    the temporary admin user were deleted afterward — confirmed via SQL
    count queries that nothing was left behind.
  - **Known environment issue found, not a regression from this milestone's
    code:** the local SeaweedFS S3 gateway isn't loading its
    `s3-config.json` identities — every presigned PUT gets a 403
    `InvalidAccessKeyId`, and the server's own log says "Available keys: 0,
    Auth enabled: false" even with `docs/DEVELOPMENT.md`'s documented
    path-with-spaces quoting fix applied (tried via a `-Command` string, and
    via a `.ps1` script file — confirmed via `Get-CimInstance Win32_Process`
    that the actual process command line has `-s3.config=...` correctly
    quoted as one token either way). Root cause not yet found. Since this is
    Phase 2's already-verified upload plumbing, not something Milestone 6
    changed, and what Milestone 6 actually needed proven was the
    resolve+fetch+render path given a real url, the live check substituted
    a trivial local static file server for the one presigned-upload
    sub-step and still exercised the real `PUT /api/components/:id/asset`
    admin endpoint. **A future session doing real local upload testing
    (image or model) will hit this same 403 until it's investigated** — see
    the new KNOWN ISSUES entry in `PROJECT_STATUS.md`.

FILES CREATED:
- packages/three-d-engine/src/resolveComponentAsset.ts
- packages/three-d-engine/tests/resolveComponentAsset.spec.ts

FILES MODIFIED:
- packages/three-d-engine/src/WorkspaceCanvas.tsx (GLTF loading/error-boundary
  machinery, case-level asset resolution)
- packages/three-d-engine/src/index.ts (new exports)
- apps/web/app/api/components/route.ts (list GET includes threeDAssets)
- apps/web/app/workspace/build-workspace.tsx (threads asset through to
  WorkspaceCanvas)
- project-management/DEVELOPMENT_ROADMAP.md, TODO.md, PROJECT_STATUS.md,
  CURRENT_PHASE.md, CHANGELOG.md, README.md (this checkpoint's siblings)

DATABASE CHANGES: none persisted — two temporary test components (CASE,
MOTHERBOARD) and their ThreeDAsset rows, plus a temporary test admin user,
were created and fully deleted within this session. Nothing left behind.

API CHANGES: `GET /api/components` (list) now includes `threeDAssets` in
each returned component — reused `PUT /api/components/:id/asset` and
`POST /api/components` exactly as Phase 2/earlier built them for live
verification, no route logic changed there.

FRONTEND CHANGES: placed components (and the case) whose real `ThreeDAsset`
is `GLTF_MODEL` now render the actual uploaded file instead of always
falling back to the procedural generator. No visible change for any
existing component that has no `ThreeDAsset` row or a `PROCEDURAL_FALLBACK`
one (the overwhelming majority right now, since nothing has used the GLTF
upload path for real yet) — this was verified specifically, not assumed.

3D ENGINE CHANGES: `resolveComponentAsset` is the new single source of truth
for "what should actually render for this component" — `buildGenericModel`
is now an implementation detail it calls into, not something callers should
reach for directly anymore for anything user-facing (WorkspaceCanvas no
longer imports it directly).

KNOWN ISSUES: orphaned storage objects on component delete; the cosmetic
Turbopack `export *` build warning; build slot uniqueness not enforced; 3D
zone click targets are small at default camera zoom (all carried over,
unchanged, non-blocking). **New this session:** the local SeaweedFS dev
server isn't loading its S3 identities config — presigned uploads (image or
model) will 403 locally until this is investigated. Does not affect
production R2 config.

TEST STATUS: 195/195 passing workspace-wide (34 component-models + 74
compatibility-engine + 87 three-d-engine, up from 189 last session).

NEXT STEP: When the user says "Continue": re-read this file + PROJECT_STATUS.md
+ CURRENT_PHASE.md + TODO.md, confirm `pnpm install && pnpm build` still
passes and Postgres is running, then start PHASE 5, MILESTONE 1 — build
save/load/rename/duplicate/delete. The `PCBuild`/`BuildComponent` Prisma
models already exist (`packages/database/prisma/schema.prisma`) but nothing
has ever written to them yet. This milestone needs: new API routes under
`/api/builds` (list own builds, create, get by id, update — name/
workspaceState/components, delete) using the same `requireRole`/session
pattern as every other authenticated route; wiring `build-workspace.tsx`'s
current in-memory-only `buildLines`/`placements` state to actually
persist/load through them (a "Save" action, a builds list/load screen —
check whether one already exists under `/builds` or similar, likely not
yet); deciding what `workspaceState` actually stores (camera
position/target at minimum, per the schema's own comment) and how
`installedZoneKey`+position/rotation map back to this package's
`placements: Record<zoneKey, PlacedComponent>` shape on load. Renaming/
duplicating/deleting are likely small CRUD additions once create/read/
update exist. Build *sharing* (share slug, public read-only view) is
explicitly Milestone 2, not this one — don't start it early. Consider
whether a real Vitest-testable pure function belongs here (e.g. serializing
`placements` to/from the `BuildComponent` row shape) versus everything
living in the API route, matching this project's established pattern of
keeping business logic in framework-agnostic packages where practical.
Stop at this milestone's checkpoint.

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
owning database `pcbuilder`. Confirmed running this session.

SeaweedFS: see the KNOWN ISSUES entry above — currently 403s on presigned
uploads locally (identities config not loading). It was left NOT running at
the end of this session (stopped after live verification). If a future
session needs it working, start with the exact command in
`docs/DEVELOPMENT.md` and be prepared to actually debug why
`-s3.config=<path>` isn't taking effect (confirmed via `Get-CimInstance
Win32_Process` that the flag reaches the process correctly quoted — the bug
is somewhere past that, possibly a SeaweedFS version/config-format mismatch
worth checking against this exact installed version, `weed version` ->
"30GB 4.46 d997fba1575583a89cf0cc50dc0150642286c86d").

The dev server (`pnpm --filter web dev`) was left running this session.

A GitHub remote exists: `origin` ->
https://github.com/jassimshaji/pc-build-simulator-cloudapp.git (added by the
user outside any session). Nothing has been pushed there by any session —
only a merge pulling its `LICENSE` file in, in a prior session. Don't assume
push/PR workflows are set up without checking with the user first.

`jassimshaji20@gmail.com` is `ADMIN` in the database (promoted a few sessions
ago). A fresh login is required after any future role change for it to take
effect, since next-auth signs the role into a JWT at login time.

PATH note (still applies): if `node`/`pnpm`/`npm`/`psql` report "not recognized" in a
fresh shell, prepend, e.g. in PowerShell:
  $env:Path += ";C:\Program Files\nodejs;$env:APPDATA\npm;C:\Program Files\PostgreSQL\17\bin"
