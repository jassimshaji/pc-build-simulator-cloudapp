SESSION DATE: 2026-09-12

CURRENT PHASE: Phase 2 — Component Inventory System (Milestone 1 of 6 complete)

CURRENT TASK: None in progress — awaiting user instruction for Milestone 2 (admin
inventory dashboard).

LAST COMPLETED STEP: Phase 2, Milestone 1 (`packages/component-models`), fully
implemented and tested — the project's first real (non-placeholder) test suite.
- Bumped `packages/component-models`'s `zod` dependency from the Milestone-1-stub
  `^3.24.1` to `^4.6.2` to match what `apps/web` actually installed (avoids two
  different Zod majors coexisting across packages that will need to share schema
  instances later, e.g. when the admin dashboard in Milestone 2 imports these
  schemas into `apps/web`).
- `src/types.ts`: `CATEGORY_KEYS` (the 12 seeded `ComponentCategory.key` values, kept
  as a plain string-literal union — category is a data table per ARCHITECTURE.md
  §4.3, not a TS enum), `CategoryKey`, `isCategoryKey()`, and the `HotFields`
  interface mirroring the Prisma `Component` model's nullable hot columns.
  `HotFields` is intentionally sparse — only the fields ARCHITECTURE.md §4.1
  actually documents (socket, formFactor, ramType, pcieGeneration, lengthMm/
  widthMm/heightMm, tdpWatts/powerDrawWatts, wattage), nothing invented.
- One schema file per category under `src/categories/`: `cpu.ts`, `motherboard.ts`,
  `gpu.ts`, `ram.ts`, `ssd.ts`, `psu.ts`, `case.ts`, `airCooler.ts`, `aioCooler.ts`,
  `fan.ts`, `monitor.ts`, `caseLcd.ts`, plus `generic.ts` (a permissive
  `z.record(z.string(), z.unknown())` fallback for future categories — HDD, capture
  cards, RGB controllers, peripherals, etc. — per the brief's explicit
  forward-compatibility requirement). Each exports `<name>SpecSchema`, a
  `z.infer` type, and `extract<Name>HotFields(spec)`.
- **Deliberate, documented decisions on what NOT to promote to hot columns** (each
  has an inline comment explaining why, so a future session doesn't "fix" it by
  adding hot fields that don't fit the equality/range-check model the hot columns
  exist for):
  - No `socket` hot field for Air/AIO coolers — a cooler supports a *list* of
    sockets (`socketCompatibility: string[]`), which doesn't fit the single-value
    equality check `socket` is for (ARCHITECTURE.md §4.1 documents `socket` only
    for CPU/Motherboard). Compatibility engine (Phase 3) reads
    `specifications.socketCompatibility` directly instead.
  - AIO radiator size (120/240/280/360/420mm) isn't a 3D length/width/height in the
    GPU/Case sense — it's checked against a case's `radiatorSupport` list, not a
    numeric range against a hot column. Left entirely in `specifications`.
  - Fan size/mount, Monitor specs, and Case LCD specs don't map onto any documented
    hot column at all — their `extract*HotFields` functions return `{}`.
  - `CASE`'s hot fields: `formFactor` = the first entry of
    `supportedMotherboardFormFactors` (a case supports a *range*, but the hot
    column is single-value — used for coarse catalog filtering, NOT the actual
    compatibility check, which reads the full array from `specifications`).
    `lengthMm`/`widthMm`/`heightMm` = the case's own EXTERNAL footprint
    (`dimensionsMm.depth`/`.width`/`.height`), deliberately NOT
    `maxGpuLengthMm`/`maxCpuCoolerHeightMm` (those are clearance constraints that
    stay JSONB-only — the compatibility engine reads them off the already-fetched
    row, they don't need to be indexed columns).
- `src/registry.ts`: `CATEGORY_REGISTRY` maps every `CategoryKey` to
  `{ schema, extractHotFields }`. `validateSpecifications(categoryKey, data)` and
  `extractHotFields(categoryKey, data)` are the two functions everything else
  (future admin forms, API routes) should call — never switch on category keys
  directly elsewhere. Unknown category keys fall back to `genericSpecSchema`.
  **Type-system gotcha hit and fixed:** `CategoryDefinition<Spec = unknown>` used
  as a heterogeneous map's value type made every concrete `extract<Name>HotFields`
  function (which only accepts its own narrow Spec type) fail to type-check
  against `(spec: unknown) => HotFields` — function parameters are contravariant,
  so a function that only accepts `CpuSpec` cannot satisfy "accepts anything."
  Fixed by defaulting `Spec = any` instead of `unknown` specifically for this
  registry map (documented inline as deliberate, not sloppy typing) — each
  category's own file still keeps its real, precise Spec type; only the
  registry's map type is intentionally erased.
- Added a `tsconfig.typecheck.json` (extends the package's own `tsconfig.json`,
  overrides `rootDir` to `.` and `include` to `["src", "tests"]`) so `pnpm
  typecheck` also type-checks the test files, while the `build` script's plain
  `tsconfig.json` (`rootDir: "src"`) stays untouched and only emits `src`'s
  compiled output to `dist`. This pattern (separate typecheck config once a
  package gets a `tests/` dir) is worth reusing for `compatibility-engine` and
  `three-d-engine` when they get real tests in Phases 3-4.
- `tests/categories.test.ts` (25 tests) and `tests/registry.test.ts` (9 tests):
  every schema gets at least one valid-input pass and one invalid-input rejection;
  the registry tests cover the generic-fallback path, hot-field extraction for
  CPU/GPU/Motherboard/Case (checked against exact expected objects, not just
  "truthy"), and that a spec failing validation extracts to `{}` rather than
  throwing.
- Added `vitest` (`^3.2.4`) as a devDependency; package.json's `test` script is now
  `vitest run` (previously the Milestone-1 placeholder `echo "no tests yet"`).
- Verified: `pnpm --filter @pcbuilder/component-models run test` → 34/34 pass.
  `pnpm typecheck` (root, all 8 package/build tasks) → all pass. `pnpm build`
  (root, all 6 packages) → all pass, including `web`. `pnpm test` (root) → runs
  every workspace package's test script via Turborepo; this package's 34 real
  tests plus the other five packages' still-placeholder `echo` scripts all
  succeed.

FILES CREATED:
- packages/component-models/src/types.ts
- packages/component-models/src/registry.ts
- packages/component-models/src/categories/{cpu,motherboard,gpu,ram,ssd,psu,case,
  airCooler,aioCooler,fan,monitor,caseLcd,generic}.ts
- packages/component-models/tests/categories.test.ts
- packages/component-models/tests/registry.test.ts
- packages/component-models/tsconfig.typecheck.json

FILES MODIFIED:
- packages/component-models/src/index.ts (re-exports types/registry/every category)
- packages/component-models/package.json (zod ^3.24.1 → ^4.6.2, added vitest, real
  `test` script, `typecheck` script now points at tsconfig.typecheck.json)
- packages/component-models/README.md, docs/DEVELOPMENT.md (testing-strategy
  section updated to reflect the first real test suite),
  project-management/DEVELOPMENT_ROADMAP.md, project-management/TODO.md,
  project-management/CURRENT_PHASE.md, project-management/PROJECT_STATUS.md,
  project-management/CHANGELOG.md (this checkpoint's sibling docs)

DATABASE CHANGES: none this session — this milestone is pure application-layer
validation/type code, no schema or data changes.

API CHANGES: none this session. (Milestone 2, the admin dashboard, is where these
schemas actually get consumed by UI/API code.)

FRONTEND CHANGES: none this session.

3D ENGINE CHANGES: none — packages/three-d-engine is still an empty stub. (Some
category specs, e.g. GPU's lengthMm/widthMm/heightMm and Case's dimensionsMm, are
exactly the fields the procedural generators will eventually consume as
parameters — see ARCHITECTURE.md §7.3 — but no generator code exists yet.)

KNOWN ISSUES: none new.

TEST STATUS: `packages/component-models` now has a real, passing Vitest suite (34
tests). Every other package still has a placeholder `echo "no tests yet"` test
script — expected, since `compatibility-engine` (Phase 3, required coverage) and
`three-d-engine` (Phase 4) don't have real code yet either.

NEXT STEP: When the user says "Continue": re-read this file + PROJECT_STATUS.md +
CURRENT_PHASE.md + TODO.md, confirm `pnpm install && pnpm build && pnpm test` still
pass, then implement Phase 2, Milestone 2 (admin inventory dashboard): an
admin-only UI in `apps/web` behind the existing `/admin` route (already gated by
`requireRole`/`proxy.ts` from Phase 1, Milestone 3) showing: total components,
low-stock components, out-of-stock components, recently-updated components — reading
from `@pcbuilder/database`'s Prisma client directly (server component, same pattern
as `/workspace`'s category list). This is the first real content behind the admin
placeholder. Stop at that checkpoint rather than also building the full CRUD forms
(Milestone 3) in the same session.

EXACT COMMANDS TO RUN THE PROJECT LOCALLY:
  pnpm install
  pnpm dev                     # apps/web on http://localhost:3000
  pnpm test                    # runs every workspace package's tests (component-models has real ones now)

One-time per machine / after a fresh clone (all already done on this machine):
  cp packages/database/.env.example packages/database/.env
  pnpm --filter @pcbuilder/database run db:migrate
  pnpm --filter @pcbuilder/database run db:seed
  cp apps/web/.env.example apps/web/.env.local   # fill in DATABASE_URL + generate NEXTAUTH_SECRET

Other root scripts: `pnpm build`, `pnpm typecheck`, `pnpm lint`.

Local Postgres on THIS machine: native Windows service `postgresql-x64-17` on
localhost:5432, superuser `postgres`/`postgres`, app role `pcbuilder`/`pcbuilder`
owning database `pcbuilder`.

PATH note (still applies): if `node`/`pnpm`/`npm`/`psql` report "not recognized" in a
fresh shell, prepend, e.g. in PowerShell:
  $env:Path += ";C:\Program Files\nodejs;$env:APPDATA\npm;C:\Program Files\PostgreSQL\17\bin"
