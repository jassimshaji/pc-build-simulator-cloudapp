SESSION DATE: 2026-09-12

CURRENT PHASE: Phase 3, Milestone 1 COMPLETE. Next: Milestone 2 — compatibility
rules.

CURRENT TASK: None in progress — awaiting user instruction for Phase 3, Milestone 2
(the six compatibility rules + their Vitest suites).

LAST COMPLETED STEP: Phase 3, Milestone 1 (`packages/compatibility-engine`
scaffold), verified via typecheck/test/build across the whole workspace.

- `packages/compatibility-engine/src/types.ts` (new): `Severity`, `CompatibilityResult`,
  `CompatibilityReport`, `CompatibilityRule` exactly matching ARCHITECTURE.md §6.
  Also `BuildComponentInput` (`componentId`, `categoryKey`, `quantity`, `hotFields`,
  `specifications`) and `CompatibilityCheckInput` (`{ components: BuildComponentInput[] }`)
  — the engine's plain-data input shape, framework-agnostic per the architecture's
  "zero UI/DB dependency" requirement (no Prisma types imported). `categoryKey` and
  `hotFields` reuse `@pcbuilder/component-models`'s `CategoryKey`/`HotFields` types
  rather than re-declaring them.
- `packages/compatibility-engine/src/engine.ts` (new): real `runCompatibilityCheck(build)`
  entry point. Holds a `RULES: CompatibilityRule[]` list (empty for now — Milestone 2
  populates it from `rules/*.ts`), maps every rule over the input, filters out
  `null` (rules that don't apply yet), and aggregates `overallStatus` (`ERROR` if any
  result is an incompatible `ERROR`, else `WARNING` if any is an incompatible
  `WARNING`, else `OK`). `estimatedPowerWatts`/`recommendedPsuWattage` are hardcoded
  to `0` with a comment pointing at Milestone 3 — deliberately not faking a number
  before the power calculator exists.
- `packages/compatibility-engine/src/index.ts`: now exports the real types +
  `runCompatibilityCheck` (was `export {}`).
- `packages/compatibility-engine/tests/engine.spec.ts` (new): 2 Vitest tests —
  empty build produces `OK`/no results/0 power, and a populated build still
  produces `OK`/no results since no rules are registered yet (guards against
  someone assuming a populated build should already trigger something).
- `packages/compatibility-engine/package.json`: added `@pcbuilder/component-models`
  (workspace dependency, for `CategoryKey`/`HotFields`) and `vitest` (devDependency),
  `test` script now `vitest run` (was a no-op echo).
- `packages/compatibility-engine/tsconfig.typecheck.json` (new): same pattern as
  `component-models` — separate tsconfig including `tests/` for typecheck, keeping
  the build tsconfig's `rootDir` limited to `src/`.
- `packages/compatibility-engine/README.md`: updated from "package stub only" to
  describe the actual scaffold and what's next.
- Did the housekeeping skim flagged at the end of the last session (given the
  DECISIONS.md corruption found in Phase 2, Milestone 5): confirmed all 9 ADRs in
  `DECISIONS.md` have intact, sequential headings (ADR-001 through ADR-009, no
  merged/missing sections). Nothing else found to be drifted.

**Verification:**
- `pnpm --filter @pcbuilder/compatibility-engine run typecheck` — exit 0.
- `pnpm --filter @pcbuilder/compatibility-engine run test` — 2/2 passing.
- `pnpm typecheck` (whole workspace) — 9/9 tasks pass.
- `pnpm build` (whole workspace) — 6/6 tasks pass, only the pre-existing cosmetic
  Turbopack `@prisma/client` `export *` warning (unchanged, not new).
- `pnpm test` (whole workspace) — 36/36 tests pass (34 pre-existing in
  `component-models` + 2 new in `compatibility-engine`).
- `pnpm --filter web run lint` — clean, exit 0.

FILES CREATED:
- packages/compatibility-engine/src/types.ts
- packages/compatibility-engine/src/engine.ts
- packages/compatibility-engine/tests/engine.spec.ts
- packages/compatibility-engine/tsconfig.typecheck.json

FILES MODIFIED:
- packages/compatibility-engine/src/index.ts (real exports, was `export {}`)
- packages/compatibility-engine/package.json (component-models + vitest deps, real test script)
- packages/compatibility-engine/README.md
- project-management/DEVELOPMENT_ROADMAP.md, project-management/TODO.md,
  project-management/PROJECT_STATUS.md, project-management/CURRENT_PHASE.md,
  project-management/CHANGELOG.md (this checkpoint's sibling docs)

DATABASE CHANGES: none.

API CHANGES: none — `/api/compatibility/check` is Milestone 4.

FRONTEND CHANGES: none this milestone (text-only build flow UI is Milestone 4).

COMPATIBILITY ENGINE CHANGES: scaffold only, as described above. No rules yet — the
engine currently reports every build as `OK` with 0 estimated power regardless of
contents. This is expected and intentional for Milestone 1; do not read anything
into it passing/not-flagging anything yet.

KNOWN ISSUES: none new. (Carried over, unchanged: orphaned storage objects on
component delete; the cosmetic Turbopack `export *` build warning.)

TEST STATUS: 36/36 passing workspace-wide (34 component-models + 2 compatibility-engine).

NEXT STEP: When the user says "Continue": re-read this file + PROJECT_STATUS.md +
CURRENT_PHASE.md + TODO.md, confirm `pnpm install && pnpm build` still passes and
Postgres is running, then start PHASE 3, MILESTONE 2 — compatibility rules. Create
`packages/compatibility-engine/src/rules/` with one file per rule (per
ARCHITECTURE.md §6's file list: `cpuSocket.ts`, `ramCompatibility.ts`,
`gpuClearance.ts`, `psuPower.ts` — note this one needs Milestone 3's power estimate,
so may need to land alongside or after it, or use a simpler standalone wattage
check for now — `caseFormFactor.ts`, `coolingCompatibility.ts`, `storageInterface.ts`),
register each in `engine.ts`'s `RULES` list, and write a Vitest suite per rule
covering compatible/incompatible/rule-not-applicable cases (full coverage per rule
is explicitly required by the project brief, not optional). Consider doing 2-3
rules per session rather than all six at once, to keep sessions reviewable — use
judgment based on how the first rule or two go. Stop at a natural milestone
checkpoint rather than pushing through to Milestone 3 in the same session.

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
