SESSION DATE: 2026-09-12

CURRENT PHASE: Phase 3, Milestone 3 COMPLETE. Next: Milestone 4 —
`/api/compatibility/check` + build flow UI.

CURRENT TASK: None in progress — awaiting user instruction for Phase 3, Milestone 4.

LAST COMPLETED STEP: Phase 3, Milestone 3 (power calculator + PSU checks),
verified via typecheck/test/build across the whole workspace.

Between the last dev session and this one, the user registered an account
(`jassimshaji20@gmail.com`), asked for it to be promoted to `ADMIN` (done via a
direct SQL `UPDATE` — a fresh login is required afterward since next-auth signs
the role into a JWT at login time, not re-checked per request), and separately
reported the Next.js dev tools indicator missing. That turned out to be
shared, in-memory server state (`devIndicatorServerState.disabledUntil`, in
`next/dist/server/dev/dev-indicator-server-state.js`) rather than a
per-browser setting — someone had clicked "Hide" on the running dev server,
setting a ~24h disable that's visible to every client hitting that server
process. Restarting the dev server (`pnpm dev`) reset it; confirmed via a
Playwright check of the actual HMR WebSocket frame
(`"devIndicator":{"disabledUntil":0}`) and a screenshot showing the icon back
in the bottom-right corner. None of this touched application code. A GitHub
remote (`origin` → `pc-build-simulator-cloudapp`) was also added and a
harmless merge pulled in a `LICENSE` file — no conflicts, nothing overwritten.

- `packages/compatibility-engine/src/powerCalculator.ts` (new):
  `estimateSystemPower(build)` sums real per-component power data where the
  schema has it (CPU `tdpWatts`, GPU `powerDrawWatts`, both from hot fields)
  and falls back to small, explicitly-documented estimate constants for
  everything else that has no power field in its Zod schema: a flat
  motherboard baseline (30W), a per-RAM-module estimate (5W, using
  `numberOfModules` from specifications when present), a per-SSD estimate
  (6W), a per-fan fallback (3W, only used when a fan's own
  `powerConsumptionWatts` spec is missing — real fan data is used when
  present), and a per-AIO-pump estimate (5W). All estimates multiply by each
  component's `quantity`. `calculateRecommendedPsuWattage(estimatedPowerWatts,
  headroomMultiplier = 1.25)` applies the headroom multiplier from
  ARCHITECTURE.md §6 and rounds up.
- `packages/compatibility-engine/src/engine.ts`: `runCompatibilityCheck()` now
  calls both power functions and returns real `estimatedPowerWatts`/
  `recommendedPsuWattage` instead of hardcoded `0`s.
- `packages/compatibility-engine/src/rules/psuPower.ts` (new): `checkPsuWattage`
  (recomputes the recommended wattage and compares against
  `psu.hotFields.wattage`, `ERROR` on shortfall — only runs once a PSU AND at
  least one of CPU/GPU is present, so a partial build doesn't produce a
  trivially-passing result) and `checkPsuConnectors` (deliberately simple/
  advisory: checks the PSU has ≥1 CPU power connector when a motherboard is
  present, and ≥ as many PCIe power connectors as installed GPUs — `WARNING`,
  not `ERROR`, since the schema only describes GPU/motherboard connector
  *type* as free text, never a count to actually verify against; documented
  inline as a coarse proxy, matching the guidance carried over from last
  session's checkpoint). Both registered in `rules/index.ts`'s `ALL_RULES`
  (now 15 rules total).
- New test files: `tests/powerCalculator.spec.ts` (14 tests covering every
  category's contribution, the RAM-module-count fallback, the fan
  real-vs-fallback distinction, a mixed-build sum, and the headroom
  multiplier/rounding) and `tests/psuPower.spec.ts` (9 tests: both rules'
  compatible/incompatible/not-applicable cases). `tests/engine.spec.ts` gained
  one more test confirming the power numbers are now really wired through
  end-to-end (was hardcoded 0 through Milestone 1-2).

**Verification:**
- `pnpm --filter @pcbuilder/compatibility-engine run typecheck` — exit 0.
- `pnpm --filter @pcbuilder/compatibility-engine run test` — 74/74 passing.
- `pnpm typecheck` (whole workspace) — 9/9 tasks pass.
- `pnpm build` (whole workspace) — 6/6 tasks pass, only the pre-existing
  cosmetic Turbopack `@prisma/client` `export *` warning (unchanged, not new).
- `pnpm test` (whole workspace) — 108/108 tests pass (34 component-models + 74
  compatibility-engine).
- `pnpm --filter web run lint` — clean, exit 0.

FILES CREATED:
- packages/compatibility-engine/src/powerCalculator.ts
- packages/compatibility-engine/src/rules/psuPower.ts
- packages/compatibility-engine/tests/powerCalculator.spec.ts
- packages/compatibility-engine/tests/psuPower.spec.ts

FILES MODIFIED:
- packages/compatibility-engine/src/engine.ts (real power fields, not hardcoded 0)
- packages/compatibility-engine/src/rules/index.ts (registered the 2 new psuPower rules)
- packages/compatibility-engine/tests/engine.spec.ts (+1 test for power wiring)
- project-management/DEVELOPMENT_ROADMAP.md, project-management/TODO.md,
  project-management/PROJECT_STATUS.md, project-management/CURRENT_PHASE.md,
  project-management/CHANGELOG.md (this checkpoint's sibling docs)

DATABASE CHANGES: none from development work. (Out-of-band: `User.role` for
`jassimshaji20@gmail.com` was updated to `ADMIN` via a direct SQL statement,
per the user's request — not a migration, a one-off data change.)

API CHANGES: none — `/api/compatibility/check` is Milestone 4.

FRONTEND CHANGES: none — the build flow UI is Milestone 4.

COMPATIBILITY ENGINE CHANGES: `runCompatibilityCheck()` now returns real,
non-zero `estimatedPowerWatts`/`recommendedPsuWattage`, and 2 new PSU rules run
alongside the 13 from Milestone 2 (15 total).

KNOWN ISSUES: none new. (Carried over, unchanged: orphaned storage objects on
component delete; the cosmetic Turbopack `export *` build warning.)

TEST STATUS: 108/108 passing workspace-wide (34 component-models + 74
compatibility-engine, up from 84 last session).

NEXT STEP: When the user says "Continue": re-read this file + PROJECT_STATUS.md
+ CURRENT_PHASE.md + TODO.md, confirm `pnpm install && pnpm build` still passes
and Postgres is running, then start PHASE 3, MILESTONE 4 —
`/api/compatibility/check` + build flow UI. This is the first milestone that
touches `apps/web`, so it needs to bridge real Prisma `Component` rows into the
engine's plain `BuildComponentInput` shape: `categoryId` → `categoryKey` (via
the `ComponentCategory` relation), the hot columns (`socket`, `formFactor`,
etc. — already on the `Component` row) → `hotFields`, and `specifications`
passed straight through. Design the request/response shape for the route (e.g.
`POST /api/compatibility/check` with a list of `{ componentId, quantity }`
pairs, looking up each `Component` + its category, then calling
`runCompatibilityCheck`). Then a simple text-only build page: a way to pick one
component per category (or multiple for RAM/fans/storage), see the live
`CompatibilityReport` (results list with severity, overall status,
estimated/recommended power) update as selections change — no 3D placement
yet, that's Phase 4. Consider whether this needs a `PCBuild`/`BuildComponent`
row at all yet, or can work purely client-side against the check endpoint
first (simpler, defers persistence to Phase 5) — use judgment, but lean toward
the simpler option since Phase 5 owns save/load. Stop at this milestone's
checkpoint rather than also starting Milestone 5 in the same session.

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
running (not needed for Phase 3) — see docs/DEVELOPMENT.md (including its
troubleshooting notes) to restart it if a future session needs image/model
upload. The dev server was left running this session (started fresh, dev
indicator confirmed enabled) — a future session can reuse it or restart it
freely.

A GitHub remote now exists: `origin` →
https://github.com/jassimshaji/pc-build-simulator-cloudapp.git. Nothing has
been pushed there by me — only a merge pulling its `LICENSE` file in. Don't
assume push/PR workflows are set up without checking with the user first.

PATH note (still applies): if `node`/`pnpm`/`npm`/`psql` report "not recognized" in a
fresh shell, prepend, e.g. in PowerShell:
  $env:Path += ";C:\Program Files\nodejs;$env:APPDATA\npm;C:\Program Files\PostgreSQL\17\bin"
