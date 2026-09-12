SESSION DATE: 2026-09-12

CURRENT PHASE: Phase 4, Milestone 3 COMPLETE. Next: Milestone 4 —
click-to-place wired to the compatibility engine.

CURRENT TASK: None in progress — awaiting user instruction for Phase 4,
Milestone 4.

LAST COMPLETED STEP: Phase 4, Milestone 3 (installation zone system),
verified via typecheck/build/lint, real Vitest unit tests, and a live
Playwright pass confirming category-based zone highlighting actually works
in the rendered scene.

- `packages/three-d-engine/src/zones/types.ts` (new): `InstallationZone` —
  `{ key, acceptsCategory, position, rotation, constraints? }` — matches
  ARCHITECTURE.md §7.2 exactly. `acceptsCategory` is typed `CategoryKey` from
  `@pcbuilder/component-models` (added as a new dependency of
  `three-d-engine` — its first use of that package).
- `packages/three-d-engine/src/zones/generateCaseZones.ts` (new): reads a
  case's own spec fields and produces every zone the case hosts directly —
  always: `MOBO_TRAY` (MOTHERBOARD), `PSU_BAY` (PSU), `EXPANSION_SLOT_1`
  (GPU, with `constraints.maxLengthMm` from the case's real
  `maxGpuLengthMm`), `CPU_COOLER_MOUNT` (AIR_COOLER, with
  `constraints.maxHeightMm` from `maxCpuCoolerHeightMm`); plus one
  `RADIATOR_MOUNT_n` (AIO_COOLER) per `radiatorSupport` array entry, one
  `FAN_MOUNT_n` (FAN) per `fanSupportMm` array entry, and one `DRIVE_BAY_n`
  (SSD) per unit of each `driveBays` count. Deliberate design call, documented
  inline: GPU/cooler zones live at the case level (not the motherboard, even
  though a GPU physically plugs into a motherboard PCIe slot) because the
  case's own clearance fields are what actually constrain them —
  cross-component position composition is explicitly left to Milestone 4.
- `packages/three-d-engine/src/zones/generateMotherboardZones.ts` (new):
  reads a motherboard's slot *counts* and produces `CPU_SOCKET` (always
  exactly one) plus one zone per unit of `ramSlots`/`pcieSlots`/`m2Slots`/
  `sataPorts`. Positions are schematic (not any real board's silkscreen) —
  spacing between same-group zones (e.g. 55mm between RAM slots) is
  deliberately much wider than a real board's slot pitch (~8mm), chosen
  relative to how large the rendered zone markers are, not real-world scale
  (see the bug below).
- `packages/three-d-engine/src/zones/index.ts` (new): re-exports both
  generators + the type. `src/index.ts`: now also `export * from "./zones"`.
- `packages/three-d-engine/src/WorkspaceCanvas.tsx`: replaced the Milestone 2
  showcase row (6 parts side by side) with a case + its own generated zones
  and a motherboard + its own generated zones, shown side by side (each
  zone set stays in its owning component's local space — this milestone
  doesn't compose a motherboard's zones into the case's world position,
  since there's no real "motherboard placed in this case" state yet, that's
  Milestone 4). Added a `WorkspaceCanvasProps.highlightCategory?: string |
  null` prop (typed as a plain string, not component-models' `CategoryKey`,
  so callers don't need to validate a `ComponentCategory.key` before passing
  it through) and a `ZoneMarkers` component that renders each zone as a small
  translucent box, brightening (cyan, opacity 0.9) when `highlightCategory`
  matches `zone.acceptsCategory`, staying dim (gray, opacity 0.25) otherwise.
- `apps/web/app/workspace/build-workspace.tsx`: passes its existing
  `activeCategoryKey` state straight through as `<WorkspaceCanvas
  highlightCategory={activeCategoryKey} />` — no new state needed, the
  category picker already tracked exactly what Milestone 3 needed.
- 12 new test files/specs: `tests/generateCaseZones.spec.ts` (7 tests — fixed
  zones always present with correct `acceptsCategory`/constraints, one zone
  per radiator/fan array entry, `driveBays` counts expand correctly, no
  zones generated for absent optional fields) and
  `tests/generateMotherboardZones.spec.ts` (5 tests — exactly one CPU socket
  always, exact counts for RAM/PCIe/M.2+SATA zones, zero slot zones when a
  count is zero).
- **Two real bugs caught via live screenshots, not caught by the unit tests**
  (which only check zone data — count/keys/categories/constraints — not
  rendering): (1) the first zone marker size (20mm) was far too small to see
  at normal camera distance — a zoomed screenshot showed the case's zones as
  barely-visible specks. Fixed by bumping `ZONE_MARKER_SIZE_MM` to 45mm.
  (2) After that fix, the motherboard's RAM/PCIe/M.2/SATA zones — originally
  spaced at their true-to-life pitch (~8mm for RAM) — rendered as a single
  overlapping blob once markers were 45mm each. Fixed by widening the
  schematic spacing between same-group zones in
  `generateMotherboardZones.ts` well past the marker size, with a code
  comment explaining these positions were never meant to be to-scale.

**Verification:**
- `pnpm --filter @pcbuilder/three-d-engine run typecheck` — exit 0.
- `pnpm --filter @pcbuilder/three-d-engine run test` — 30/30 passing (18 from
  Milestone 2 + 12 new).
- `pnpm typecheck` (whole workspace) — 11/11 tasks pass.
- `pnpm build` (whole workspace) — 6/6 pass; only the pre-existing cosmetic
  Turbopack `@prisma/client` warning (unchanged).
- `pnpm test` (whole workspace) — 138/138 pass (34 component-models + 74
  compatibility-engine + 30 three-d-engine).
- `pnpm --filter web run lint` — clean.
- Live Playwright pass against the real running dev server: zero
  console/page errors. Selected CPU in the picker → zoomed screenshot shows
  the motherboard's `CPU_SOCKET` marker glowing cyan while its RAM slot
  markers (visible nearby) stay dim. Switched to RAM → the same screenshot
  angle now shows 3+ distinct, separated RAM slot markers glowing cyan
  instead (confirming the spacing fix — previously would have shown one
  blob). Switched to Power Supply → a separate zoomed screenshot of the case
  shows its `PSU_BAY` zone (bottom-left of the wireframe shell) glowing cyan
  while the case's other zones stay dim. All three confirm the highlighting
  mechanism correctly discriminates by category across both components.

FILES CREATED:
- packages/three-d-engine/src/zones/types.ts
- packages/three-d-engine/src/zones/generateCaseZones.ts
- packages/three-d-engine/src/zones/generateMotherboardZones.ts
- packages/three-d-engine/src/zones/index.ts
- packages/three-d-engine/tests/generateCaseZones.spec.ts
- packages/three-d-engine/tests/generateMotherboardZones.spec.ts

FILES MODIFIED:
- packages/three-d-engine/src/index.ts (re-exports zones)
- packages/three-d-engine/src/WorkspaceCanvas.tsx (case+zones,
  motherboard+zones, highlightCategory prop, ZoneMarkers component)
- packages/three-d-engine/package.json (added @pcbuilder/component-models dependency)
- apps/web/app/workspace/build-workspace.tsx (passes highlightCategory through)
- project-management/DEVELOPMENT_ROADMAP.md, project-management/TODO.md,
  project-management/PROJECT_STATUS.md, project-management/CURRENT_PHASE.md,
  project-management/CHANGELOG.md (this checkpoint's sibling docs)

DATABASE CHANGES: none.

API CHANGES: none.

FRONTEND CHANGES: `/workspace`'s center pane now shows a case with its
installation zones and a motherboard with its own, both highlighting
correctly as the picker's active category changes (replacing Milestone 2's
row-of-6-parts showcase).

3D ENGINE CHANGES: real, data-driven, unit-tested installation zone
generation exists for Case and Motherboard categories. Still no click-to-place
or cross-component zone-position composition (Milestone 4), and the
remaining 6 categories (Fan, AIO, Air Cooler, SSD, Monitor, Case LCD) still
have neither procedural generators nor zone generators (Milestone 5 covers
the generators; their zones, if any, aren't scoped yet).

KNOWN ISSUES: none new. (Carried over, unchanged: orphaned storage objects on
component delete; the cosmetic Turbopack `export *` build warning; build slot
uniqueness not enforced in the Phase 3 build flow UI yet.)

TEST STATUS: 138/138 passing workspace-wide (34 component-models + 74
compatibility-engine + 30 three-d-engine, up from 126 last session).

NEXT STEP: When the user says "Continue": re-read this file + PROJECT_STATUS.md
+ CURRENT_PHASE.md + TODO.md, confirm `pnpm install && pnpm build` still passes
and Postgres is running, then start PHASE 4, MILESTONE 4 — click-to-place
wired to the compatibility engine. This is the milestone that finally needs
real placement state and cross-component zone composition (both explicitly
deferred out of Milestones 2-3). Suggested approach: (1) add client-side
placement state to `build-workspace.tsx` or a new hook — something like
`{ zoneKey: string, componentId: string }[]`, separate from the existing
`buildLines` (quantity-only) state used by the Phase 3 compatibility panel,
or possibly unify them if that turns out cleaner once you're looking at both
side by side; (2) in `WorkspaceCanvas`, make zone markers clickable
(`onClick` on the zone mesh) and lift that event up via a prop (e.g.
`onZoneClick(zoneKey)`); (3) when a motherboard is placed in `MOBO_TRAY`,
compose its own `generateMotherboardZones()` output into world space by
adding the `MOBO_TRAY` zone's position (this is the composition step
Milestone 3 explicitly skipped) so its RAM/PCIe/etc. zones render at the
right place and become clickable in turn; (4) after every placement change,
call `runCompatibilityCheck` (via the existing `/api/compatibility/check`
route, reusing Phase 3's `apps/web/lib/compatibility.ts`) and feed the result
into the same compatibility panel/footer summary that already exists. Keep
scope to "one component type placeable end-to-end" first (e.g. get a
motherboard placeable in a case, prove the whole chain works) before
generalizing to every category — consistent with this project's "do not
overbuild early" instruction. Full Vitest coverage for any new pure logic
(e.g. the zone-composition math). Stop at this milestone's checkpoint rather
than also starting Milestone 5 in the same session.

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
