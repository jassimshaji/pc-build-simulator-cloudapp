SESSION DATE: 2026-09-13

CURRENT PHASE: Phase 4, Milestone 4 COMPLETE. Next: Milestone 5 — remaining
procedural generators (Fan, AIO, Air Cooler, SSD, Monitor, Case LCD).

CURRENT TASK: None in progress — awaiting user instruction for Phase 4,
Milestone 5.

LAST COMPLETED STEP: Phase 4, Milestone 4 (click-to-place wired to the
compatibility engine), verified via typecheck/build/lint, new Vitest tests,
and a full live Playwright pass placing a real case → motherboard → RAM,
two levels deep, with genuine compatibility results appearing at each step.

Before this milestone, the user asked (previous session) why the 3D models
look like generic boxes instead of real branded products, and whether
selecting a brand should change the 3D shape. Answered: the 3D view was a
fixed demo not yet wired to build selections at all (this milestone fixes
that part), and every model is intentionally generic per ADR-004 (no
licensed real-brand 3D assets) — a truly "real" model needs an actual
uploaded `.glb` file (the admin UI for that exists since Phase 2) plus GLTF
loading logic that doesn't exist yet (Milestone 6). User chose to stay on
roadmap order rather than reprioritize toward GLTF loading now.

- `packages/three-d-engine/src/zones/composeZone.ts` (new): `composeZone(zone,
  origin)` — the pure position-offset function Milestones 2-3 explicitly
  deferred. Offsets a zone's local `position` by an origin, used to
  re-express a placed motherboard's own zones in world space once it's
  actually sitting in a case's `MOBO_TRAY` zone. 4 tests.
- `packages/three-d-engine/src/placement.ts` (new): three pure functions —
  `extractCaseZoneSpec`/`extractMotherboardZoneSpec` read real
  `Component.specifications` (untyped JSON by the time it reaches this
  package) into `generateCaseZones`/`generateMotherboardZones`'s input
  shapes, returning `null` on malformed/incomplete data rather than
  throwing; `buildGenericModel(categoryKey, specifications)` dispatches to
  the matching Milestone 2 generator for MOTHERBOARD, CPU, GPU, RAM, PSU
  (CASE is handled separately since it's the root, not something placed into
  a zone) — approximating the handful of params those generators want that
  the component-models schema doesn't actually track (GPU fan count, RAM
  module height, PSU length are all sometimes absent) with a documented
  fallback constant, and returning `null` for categories without a generator
  yet (Fan, AIO, Air Cooler, SSD, Monitor, Case LCD — Milestone 5), in which
  case the caller falls back to a plain solid "occupied" marker instead of a
  custom shape. 13 tests.
- `packages/three-d-engine/src/WorkspaceCanvas.tsx`: rewritten to take real
  data instead of a hardcoded demo. New props: `caseComponent` (rendered
  immediately — it's the root container, nothing to click-place it into),
  `placements: Record<zoneKey, PlacedComponent>`, `onZoneClick(zoneKey,
  acceptsCategory)`. `ZoneMarker` (one component instance per zone, so each
  can call its own hooks safely) now branches three ways: occupied with a
  generator available → renders the real placed model (positioned via a
  `useEffect` once built); occupied without one → a solid gray marker;
  unoccupied → the existing translucent highlight/dim marker, now with a
  real `onClick` (fires `onZoneClick` only when unoccupied) and pointer-cursor
  feedback on hover. The motherboard's own zones are computed once
  `placements.MOBO_TRAY` is set: found via `caseScene.zones.find(key ===
  "MOBO_TRAY")`, then `generateMotherboardZones(...).map(zone =>
  composeZone(zone, thatZonesWorldPosition))` — exactly the composition step
  called out as deferred in the last two checkpoints. (The motherboard's own
  *model* is no longer rendered as a separate primitive — the case's own
  `ZoneMarker` for `MOBO_TRAY` already renders it via `buildGenericModel`,
  so a first draft that rendered both was fixed before ever running, to
  avoid two overlapping copies of the same shape.)
- `apps/web/app/workspace/build-workspace.tsx`: `BuildLine` gained
  `categoryKey`/`specifications` fields (needed to pass real spec data
  through to the 3D package). New `placements` state
  (`Record<zoneKey, PlacedComponent>`). New `handleZoneClick(zoneKey,
  acceptsCategory)`: only acts when the currently `selected` component's
  category matches what the zone accepts — calls the existing `handleAdd`
  (so the compatibility check re-runs exactly as it already did for the
  manual "Add to build" button — no new compatibility logic needed at all)
  and records the placement. `handleRemove` now also clears any placement(s)
  referencing the removed component. Switched `highlightCategory` from
  `activeCategoryKey` (whichever category tab is open) to `selected?.category
  .key` (the specifically previewed component) — the correct driver for
  "select a component, then its matching zones highlight," per
  ARCHITECTURE.md §7.1's actual interaction model; the tab still just filters
  the list. Added small UX touches: a hint under "Add to build" explaining
  when 3D placement is available ("add a case first" / "or click a
  highlighted zone to place it directly"), and a "● placed" tag next to
  build-list entries that have an actual 3D placement (or are the case
  itself).

**Verification:**
- `pnpm --filter @pcbuilder/three-d-engine run typecheck`/`test` — exit 0,
  47/47 passing (18 Milestone 2 + 12 Milestone 3 + 4 composeZone + 13
  placement).
- `pnpm typecheck` (whole workspace) — 11/11 tasks pass.
- `pnpm build` (whole workspace) — 6/6 pass; only the pre-existing cosmetic
  Turbopack `@prisma/client` warning (unchanged).
- `pnpm test` (whole workspace) — 155/155 pass (34 component-models + 74
  compatibility-engine + 47 three-d-engine).
- `pnpm --filter web run lint` — clean.
- **Live Playwright pass, the real end-to-end proof**: added a real seeded
  case (H510) via the normal "Add to build" flow — it appeared in the 3D
  view immediately, "Your build" showed it as "● placed", compatibility
  showed "No issues detected yet." Selected a real motherboard (ROG STRIX
  B650-A) without adding it — the case's `MOBO_TRAY` zone glowed cyan, a
  contextual hint appeared ("click a highlighted zone..."). Clicked it (had
  to grid-search a few pixels to find the exact clickable point — zone hit
  targets are small at default zoom, noted below) — the real green
  motherboard model appeared in place of the marker, "Your build" gained it
  as "● placed", and the compatibility panel showed a genuine
  `checkCaseFormFactor` INFO result ("Motherboard form factor ATX is
  supported by this case"), footer power updated to a real 30W/38W. Selected
  real RAM (Vengeance DDR5) — the motherboard's `RAM_SLOT_n` zones, now
  correctly composed onto the placed motherboard's world position, glowed
  cyan. Clicked one — the RAM model rendered correctly positioned on top of
  the motherboard, "Your build" gained it, and three more genuine
  compatibility results appeared (RAM type match, capacity, module count),
  all `INFO`/compatible. Zero console/page errors at every step. Confirmed
  no horizontal overflow at 400px mobile width.
- **Minor real finding, not a defect**: R3F's raycast hit targets for the
  45mm zone markers are only a few screen pixels at the default camera
  distance, so Playwright needed a small grid-search to land clicks
  precisely — a human using a mouse has the same precision challenge at this
  zoom level. Worth a look during future polish (bigger hit targets via an
  invisible larger interaction mesh around each visible marker, or
  encouraging users to zoom in first) but not blocking; not fixed this
  session since it's a UX-polish concern, not a functional bug — noted here
  rather than acted on.

FILES CREATED:
- packages/three-d-engine/src/zones/composeZone.ts
- packages/three-d-engine/src/placement.ts
- packages/three-d-engine/tests/composeZone.spec.ts
- packages/three-d-engine/tests/placement.spec.ts

FILES MODIFIED:
- packages/three-d-engine/src/zones/index.ts (exports composeZone)
- packages/three-d-engine/src/index.ts (exports placement.ts functions +
  WorkspaceCanvasProps/PlacedComponent types)
- packages/three-d-engine/src/WorkspaceCanvas.tsx (real props, click-to-place,
  placed-model rendering)
- apps/web/app/workspace/build-workspace.tsx (placements state,
  handleZoneClick, highlightCategory driver change, UX hints)
- project-management/DEVELOPMENT_ROADMAP.md, project-management/TODO.md,
  project-management/PROJECT_STATUS.md, project-management/CURRENT_PHASE.md,
  project-management/CHANGELOG.md (this checkpoint's sibling docs)

DATABASE CHANGES: none.

API CHANGES: none — reuses the existing `/api/compatibility/check` exactly as
Phase 3 built it.

FRONTEND CHANGES: `/workspace` now supports genuine click-to-place: a case
renders on add, matching zones highlight when a component is selected, and
clicking one places it (both in 3D and in the build list/compatibility
panel).

3D ENGINE CHANGES: click-to-place is real and working for every category that
already has a procedural generator (MOTHERBOARD, CPU, GPU, RAM, PSU);
categories without one yet (Fan, AIO, Air Cooler, SSD, Monitor, Case LCD) can
still be placed (the zone system already accepts them) but show a plain
solid marker instead of a shaped model until Milestone 5.

KNOWN ISSUES: none new that block anything. (Carried over, unchanged: orphaned
storage objects on component delete; the cosmetic Turbopack `export *` build
warning; build slot uniqueness not enforced — e.g. nothing stops adding two
cases via the button, though only the first one renders in 3D.) New,
non-blocking, noted for future polish: 3D zone click targets are small at
default camera zoom (see "minor real finding" above).

TEST STATUS: 155/155 passing workspace-wide (34 component-models + 74
compatibility-engine + 47 three-d-engine, up from 138 last session).

NEXT STEP: When the user says "Continue": re-read this file + PROJECT_STATUS.md
+ CURRENT_PHASE.md + TODO.md, confirm `pnpm install && pnpm build` still passes
and Postgres is running, then start PHASE 4, MILESTONE 5 — remaining
procedural generators: Fan, AIO, Air Cooler, SSD, Monitor, Case LCD (the last
one explicitly a "placeholder surface" per the roadmap, not a full model).
For each, add a `createGenericX` function in
`packages/three-d-engine/src/procedural/` (matching ARCHITECTURE.md §7.3's
documented signatures where given — `createGenericFan({ sizeMm,
thicknessMm })`, `createGenericRadiator({ sizeMm, thicknessMm })` for
AIO/radiators, `createGenericAIO({ radiatorSizeMm })`, `createGenericSSD({
formFactor })`; Monitor/Case LCD have no documented signature, use judgment
matching the existing pattern) with real Vitest bounding-box tests, same
standard as Milestone 2's six. Then add each new category's `case "X":`
branch to `buildGenericModel`'s switch in `src/placement.ts` — this is the
only wiring needed for them to actually appear when click-placed, since the
zone system (`FAN_MOUNT_n` accepts FAN, `RADIATOR_MOUNT_n` accepts
AIO_COOLER, `CPU_COOLER_MOUNT` accepts AIR_COOLER) and the click-to-place
mechanism already exist and need no changes. SSD's zones (`M2_SLOT_n`,
`SATA_PORT_n`, both already accepting SSD) already work too. Monitor and
Case LCD have no installation zones defined anywhere yet (they weren't part
of Milestone 3's case/motherboard zone generators, and don't obviously
belong in either) — consider whether they need one at all for this
milestone (a monitor arguably isn't "installed in the case" the way other
components are) or whether a generator with no corresponding zone is fine
for now (it just won't be click-placeable, matching how e.g. HDD would work
if added later without a matching zone). Stop at this milestone's checkpoint
rather than also starting Milestone 6 (GLTF asset loading) in the same
session.

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
running (not needed for this milestone). The dev server was left running this
session.

A GitHub remote exists: `origin` →
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
