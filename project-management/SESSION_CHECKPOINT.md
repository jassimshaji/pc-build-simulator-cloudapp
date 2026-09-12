SESSION DATE: 2026-09-12

CURRENT PHASE: Phase 3, Milestone 2 COMPLETE. Next: Milestone 3 — power calculator.

CURRENT TASK: None in progress — awaiting user instruction for Phase 3, Milestone 3
(`powerCalculator.ts` + the PSU wattage/connector check rule).

LAST COMPLETED STEP: Phase 3, Milestone 2 (compatibility rules), verified via
typecheck/test/build across the whole workspace.

Read every relevant category schema in `packages/component-models/src/categories/`
(cpu, motherboard, gpu, ram, case, psu, airCooler, aioCooler, ssd, fan) to know
exact field names before writing rules, and checked `packages/database/prisma/seed.ts`
for real-world data shapes/conventions (e.g. `radiatorSupport` is free text like
`"240mm front"`, not a clean enum — informed the AIO radiator-mount rule's
substring-match approach and its `WARNING` severity instead of `ERROR`).

- `packages/compatibility-engine/src/rules/utils.ts` (new): `componentsOf`,
  `firstOf`, `sumBy` — shared helpers for reading a `CompatibilityCheckInput`,
  internal to the package (not re-exported from `src/index.ts`).
- `packages/compatibility-engine/src/rules/cpuSocket.ts` (new): `checkCpuSocket` —
  CPU.socket === Motherboard.socket, `ERROR` on mismatch.
- `packages/compatibility-engine/src/rules/ramCompatibility.ts` (new): three
  independent checks (deliberately split into three `CompatibilityResult`s rather
  than one combined result, so one mismatch doesn't hide the others) —
  `checkRamTypeMatch`, `checkRamCapacity` (sums `memoryCapacityGb * quantity`
  across all installed RAM against `motherboard.maxRamGb`), `checkRamModuleCount`
  (sums `numberOfModules * quantity` against `motherboard.ramSlots`). All `ERROR`
  on violation.
- `packages/compatibility-engine/src/rules/gpuClearance.ts` (new):
  `checkGpuLengthClearance` (`gpu.lengthMm <= case.maxGpuLengthMm`, `ERROR`) and
  `checkGpuSlotWidth` (`gpu.slotWidth <= motherboard.pcieSlots`, `WARNING` — the
  schema has no expansion-slot-spacing field, so this is a coarse proxy, not a
  hard physical measurement).
- `packages/compatibility-engine/src/rules/caseFormFactor.ts` (new):
  `checkCaseFormFactor` — reads the full
  `case.specifications.supportedMotherboardFormFactors` array (not the case's
  `formFactor` hot column, which only holds the primary/largest supported size
  for catalog filtering — see component-models' `extractCaseHotFields` comment).
  `ERROR` if the motherboard's form factor isn't in that array.
- `packages/compatibility-engine/src/rules/coolingCompatibility.ts` (new): four
  checks, split by cooler type since air and AIO coolers have different physical
  constraints — `checkAirCoolerSocketSupport`/`checkAioCoolerSocketSupport`
  (`cooler.socketCompatibility.includes(cpu.socket)`, `ERROR`),
  `checkAirCoolerClearance` (`cooler.heightMm <= case.maxCpuCoolerHeightMm`,
  `ERROR`), `checkAioRadiatorMountSupport` (substring match against
  `case.radiatorSupport`'s free-text entries, `WARNING` — see note above on why
  this is soft rather than hard).
- `packages/compatibility-engine/src/rules/storageInterface.ts` (new):
  `checkM2SlotAvailability` (M.2 NVMe + M.2 SATA drives share one pool, checked
  against `motherboard.m2Slots`) and `checkSataPortAvailability` (2.5" SATA
  drives against `motherboard.sataPorts`). Both `ERROR` on violation, both
  `null` when no drives of that interface type are present (so an all-NVMe
  build doesn't get an irrelevant SATA-port result).
- `packages/compatibility-engine/src/rules/index.ts` (new): `ALL_RULES` — all 13
  rule functions in one array, the only place `engine.ts` needs to change as
  rules are added.
- `packages/compatibility-engine/src/engine.ts`: `RULES` now imports `ALL_RULES`
  instead of being hardcoded empty.
- Test files (new, one per rule module, in
  `packages/compatibility-engine/tests/`): `cpuSocket.spec.ts` (4 tests),
  `ramCompatibility.spec.ts` (11), `gpuClearance.spec.ts` (7),
  `caseFormFactor.spec.ts` (4), `coolingCompatibility.spec.ts` (12),
  `storageInterface.spec.ts` (7) — 45 tests, each covering the compatible case,
  the incompatible case, and at least one "rule doesn't apply yet" (`null`)
  case. Plus `tests/helpers.ts` (a `component()`/`build()` builder to cut
  boilerplate) and a rewritten `tests/engine.spec.ts` (5 tests, was 2) that now
  also verifies `overallStatus` aggregation end-to-end (OK when all applicable
  rules pass, ERROR when any is an incompatible ERROR, WARNING when the worst is
  an incompatible WARNING) — 50 new tests total this milestone.

**Verification:**
- `pnpm --filter @pcbuilder/compatibility-engine run typecheck` — exit 0.
- `pnpm --filter @pcbuilder/compatibility-engine run test` — 50/50 passing.
- `pnpm typecheck` (whole workspace) — 9/9 tasks pass.
- `pnpm build` (whole workspace) — 6/6 tasks pass, only the pre-existing cosmetic
  Turbopack `@prisma/client` `export *` warning (unchanged, not new).
- `pnpm test` (whole workspace) — 84/84 tests pass (34 component-models + 50
  compatibility-engine).
- `pnpm --filter web run lint` — clean, exit 0.

FILES CREATED:
- packages/compatibility-engine/src/rules/utils.ts
- packages/compatibility-engine/src/rules/cpuSocket.ts
- packages/compatibility-engine/src/rules/ramCompatibility.ts
- packages/compatibility-engine/src/rules/gpuClearance.ts
- packages/compatibility-engine/src/rules/caseFormFactor.ts
- packages/compatibility-engine/src/rules/coolingCompatibility.ts
- packages/compatibility-engine/src/rules/storageInterface.ts
- packages/compatibility-engine/src/rules/index.ts
- packages/compatibility-engine/tests/helpers.ts
- packages/compatibility-engine/tests/cpuSocket.spec.ts
- packages/compatibility-engine/tests/ramCompatibility.spec.ts
- packages/compatibility-engine/tests/gpuClearance.spec.ts
- packages/compatibility-engine/tests/caseFormFactor.spec.ts
- packages/compatibility-engine/tests/coolingCompatibility.spec.ts
- packages/compatibility-engine/tests/storageInterface.spec.ts

FILES MODIFIED:
- packages/compatibility-engine/src/engine.ts (RULES now imports ALL_RULES)
- packages/compatibility-engine/tests/engine.spec.ts (rewritten: 5 tests incl.
  aggregation coverage, was 2)
- project-management/DEVELOPMENT_ROADMAP.md, project-management/TODO.md,
  project-management/PROJECT_STATUS.md, project-management/CURRENT_PHASE.md,
  project-management/CHANGELOG.md (this checkpoint's sibling docs)

DATABASE CHANGES: none.

API CHANGES: none — `/api/compatibility/check` is Milestone 4.

FRONTEND CHANGES: none — the text-only build flow UI is Milestone 4.

COMPATIBILITY ENGINE CHANGES: 13 real rules now run on every
`runCompatibilityCheck()` call, covering CPU↔socket, RAM↔motherboard (3 checks),
GPU↔case/motherboard (2 checks), case↔motherboard form factor, cooling↔CPU/case
(4 checks), and storage↔motherboard interface (2 checks). Power fields
(`estimatedPowerWatts`/`recommendedPsuWattage`) are still hardcoded `0` — that's
Milestone 3, not a bug.

KNOWN ISSUES: none new. (Carried over, unchanged: orphaned storage objects on
component delete; the cosmetic Turbopack `export *` build warning.)

TEST STATUS: 84/84 passing workspace-wide (34 component-models + 50
compatibility-engine, up from 2 last session).

NEXT STEP: When the user says "Continue": re-read this file + PROJECT_STATUS.md +
CURRENT_PHASE.md + TODO.md, confirm `pnpm install && pnpm build` still passes and
Postgres is running, then start PHASE 3, MILESTONE 3 — power calculator. Create
`packages/compatibility-engine/src/powerCalculator.ts` with
`estimateSystemPower(build: CompatibilityCheckInput): number`, summing CPU
`tdpWatts`, GPU `powerDrawWatts`, a motherboard baseline draw constant, per-stick
RAM draw (RAM doesn't have a power hot field yet — decide a small constant per
module, e.g. ~5W, documented as an estimate), per-drive storage draw (similarly
no SSD power field — small constant per drive), and fan/AIO pump draw (FAN's
`powerConsumptionWatts` spec field exists; AIO doesn't have one — use a constant
per AIO). Apply a configurable headroom multiplier (default `1.25`, per
ARCHITECTURE.md §6) to get `recommendedPsuWattage`. Wire both numbers into
`engine.ts`'s `runCompatibilityCheck()` return value (replacing the hardcoded
`0`s). Then add `rules/psuPower.ts`: `estimatedPowerWatts * headroom <=
psu.wattage`, plus a connector count sanity check (CPU power connectors, PCIe
power connectors vs. what's implied by installed components — keep this part
simple/advisory since the schema doesn't track per-component connector
*requirements*, only the PSU's supply counts). Register the new rule in
`rules/index.ts`. Full Vitest coverage for the calculator and the new rule, same
standard as Milestone 2. Stop at this milestone's checkpoint rather than also
starting Milestone 4 in the same session.

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
troubleshooting notes) to restart it if a future session needs image/model upload.

PATH note (still applies): if `node`/`pnpm`/`npm`/`psql` report "not recognized" in a
fresh shell, prepend, e.g. in PowerShell:
  $env:Path += ";C:\Program Files\nodejs;$env:APPDATA\npm;C:\Program Files\PostgreSQL\17\bin"
