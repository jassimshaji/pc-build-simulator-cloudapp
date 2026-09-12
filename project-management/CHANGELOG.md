# Changelog

All notable project-level changes, newest first.

## 2026-09-12 — Phase 3, Milestone 3: power calculator + PSU checks
- `packages/compatibility-engine/src/powerCalculator.ts`: `estimateSystemPower(build)`
  sums real CPU `tdpWatts`/GPU `powerDrawWatts` and falls back to small,
  documented estimate constants for categories with no power field in their
  schema (motherboard baseline 30W, ~5W/RAM module, ~6W/SSD, ~3W/fan fallback
  when a fan's own `powerConsumptionWatts` is missing, ~5W/AIO pump).
  `calculateRecommendedPsuWattage()` applies the 1.25 default headroom
  multiplier from ARCHITECTURE.md §6.
- `engine.ts`'s `runCompatibilityCheck()` now returns real
  `estimatedPowerWatts`/`recommendedPsuWattage` instead of hardcoded `0`s.
- New `rules/psuPower.ts`: `checkPsuWattage` (recommended load vs. PSU
  wattage, `ERROR`) and `checkPsuConnectors` (advisory count check — CPU
  connector present, PCIe connectors ≥ GPU count — `WARNING`, since the
  schema has no per-component connector *requirement* to check against, only
  free-text connector *type* descriptions). 15 rules registered total.
- 24 new Vitest tests (14 calculator + 9 rule + 1 engine wiring). 108/108
  tests passing workspace-wide (up from 84).
- Whole-workspace `pnpm typecheck` (9/9), `pnpm build` (6/6), `pnpm test`
  (108/108), `pnpm --filter web run lint` (clean) all pass.
- Out-of-band this session (not a milestone task): promoted
  `jassimshaji20@gmail.com` to `ADMIN` per the user's request, and diagnosed a
  "missing dev indicator" report to a shared dev-server-process in-memory
  state (not a per-browser setting) — fixed by restarting the dev server.

## 2026-09-12 — Phase 3, Milestone 2: compatibility rules
- 13 rule functions across 6 new files under
  `packages/compatibility-engine/src/rules/`: `cpuSocket` (1 rule),
  `ramCompatibility` (3: type match, capacity vs. `maxRamGb`, module count vs.
  `ramSlots`), `gpuClearance` (2: length vs. `maxGpuLengthMm` [ERROR], slot
  width vs. `pcieSlots` [WARNING — coarse proxy, no slot-spacing field in the
  schema]), `caseFormFactor` (1, reads the full supported-form-factor array
  rather than the case's single-value hot column), `coolingCompatibility` (4:
  air/AIO cooler socket support [ERROR], air cooler height clearance [ERROR],
  AIO radiator mount [WARNING — matches against free-text case data like
  `"240mm front"` by substring, so treated as advisory]), `storageInterface` (2:
  M.2 and SATA port availability, NVMe+SATA M.2 drives sharing one slot pool).
- All 13 registered in new `rules/index.ts`'s `ALL_RULES`; `engine.ts`'s `RULES`
  now imports it instead of being hardcoded empty.
- 50 new Vitest tests (one spec file per rule module, each covering the
  compatible case, the incompatible case, and at least one not-applicable/`null`
  case) plus a rewritten `engine.spec.ts` (5 tests, was 2) verifying
  `overallStatus` aggregation end-to-end.
- Power fields in the report are still hardcoded `0` — that's Milestone 3
  (power calculator), not done here.
- Whole-workspace `pnpm typecheck` (9/9), `pnpm build` (6/6), `pnpm test`
  (84/84), `pnpm --filter web run lint` (clean) all pass.

## 2026-09-12 — Phase 3, Milestone 1: compatibility-engine scaffold
- `packages/compatibility-engine/src/types.ts`: `Severity`, `CompatibilityResult`,
  `CompatibilityReport`, `CompatibilityRule` exactly per ARCHITECTURE.md §6, plus
  `BuildComponentInput`/`CompatibilityCheckInput` as the engine's plain-data input
  shape (no Prisma/UI dependency; reuses `@pcbuilder/component-models`'s
  `CategoryKey`/`HotFields`).
- `packages/compatibility-engine/src/engine.ts`: real `runCompatibilityCheck()` entry
  point wired to an empty `RULES` list — always reports `OK`/no results/0 watts
  until Milestone 2 (rules) and Milestone 3 (power calculator) land.
- Added a Vitest suite (2 tests) confirming the scaffold's honest empty behavior;
  added `@pcbuilder/component-models` + `vitest` to the package's `package.json`
  and a `tsconfig.typecheck.json` matching `component-models`'s pattern.
- Housekeeping: skimmed `DECISIONS.md` for corruption similar to the ADR-007 issue
  found last session — confirmed all 9 ADRs are intact and sequential.
- Whole-workspace `pnpm typecheck` (9/9), `pnpm build` (6/6), `pnpm test` (36/36),
  `pnpm --filter web run lint` (clean) all pass.

## 2026-09-12 — Phase 2, Milestone 6: 3D asset manager (Phase 2 complete)
- Added `PUT /api/components/:id/asset` (upserts a component's `ThreeDAsset`,
  full `PUT` replace semantics, kind-conditional validation) and extended
  `POST /api/assets` with a `purpose: "image" | "model"` field so it serves both
  image and 3D-model uploads through one route.
- Added `/admin/components/:id/asset`: switch a component between an uploaded
  GLTF/GLB (via the same presigned-URL pattern as image upload), a named
  procedural generator (the 10 names ARCHITECTURE.md §7.3 documents — none
  implemented yet, packages/three-d-engine is Phase 4), or a placeholder; record
  source/license/attribution/usage-rights notes.
- Verified live: a real presigned model upload + public read-back, confirmed
  switching kinds upserts the same row rather than creating duplicates, confirmed
  kind-specific validation 400s correctly, confirmed the form's conditional
  fields via Playwright.
- Documented two SeaweedFS environment gotchas hit while restarting it this
  session (a path-with-spaces quoting issue via `Start-Process`, and a raft
  leader-election deadlock requiring a data-dir reset) in `docs/DEVELOPMENT.md`.
- **Phase 2 (Component Inventory System) is now complete** — all 6 milestones
  done. Phase 3 (Compatibility Engine & Power Calculation) is next, pending user
  "Continue".

## 2026-09-12 — Phase 2, Milestone 5: CSV import/export
- Added `GET /api/components/export` and `POST /api/components/import`
  (multipart, upserts by SKU, per-row error reporting rather than an
  all-or-nothing transaction), plus an `/admin/import-export` page.
- Verified with a live export → hand-edit → re-import round trip: correct
  created/updated counts, a clear error for a deliberately broken row.
- **That round trip surfaced a real pre-existing bug**: several seeded
  components' `specifications` were missing fields their own Zod schemas
  required, because `seed.ts` (written before `@pcbuilder/component-models`
  existed) had set hot-column values as separate literals instead of also
  including them in `specifications` — contradicting the hybrid schema's own
  documented design (ADR-002). Fixed `seed.ts` to derive hot columns from
  `specifications` via the same functions the real API uses, fixed the seed's
  upsert (previously a no-op `update`, so it wouldn't have corrected
  already-seeded rows), and re-ran it against the live database to fix the data
  in place. Documented as ADR-009.
- Also found and repaired an unrelated pre-existing corruption in
  `project-management/DECISIONS.md` from an earlier session (ADR-007's heading
  had been lost, merged into ADR-008's text) — restored proper structure.
- Stopped at the Phase 2 / Milestone 5 checkpoint; the 3D asset manager
  (Milestone 6, the last Phase 2 milestone) is next, pending user "Continue".

## 2026-09-12 — Phase 2, Milestone 4: Stock management + brand/category management
- Added `POST /api/inventory/update` (dedicated stock-quantity/threshold fast path)
  and an inline stock editor on every admin dashboard table row.
- Added full brand management (`/admin/brands`: list with component counts,
  create, rename, delete-if-unused) and category management (`/admin/categories`:
  same shape, plus label/sortOrder editing; `key` stays immutable since
  component-models' registry keys off of it).
- Verified live: brand and category create/rename-or-relabel/delete, including the
  "cannot delete — N components still use this" 409 guard tested against real
  in-use rows (the AMD brand, the CPU category), plus a Playwright pass
  screenshotting both new pages and the dashboard's inline stock editor after a
  save. Found and cleaned up a leftover test brand from Milestone 3's own testing
  along the way.
- Stopped at the Phase 2 / Milestone 4 checkpoint; CSV import/export (Milestone 5)
  is next, pending user "Continue".

## 2026-09-12 — Phase 2, Milestone 3: Admin CRUD + image upload
- Added `POST /api/components`, `PATCH /api/components/:id`,
  `DELETE /api/components/:id`, and `POST /api/assets` (presigned upload URL) —
  all role-gated. `specifications` validated per-category via
  `@pcbuilder/component-models`; hot columns always derived server-side.
- Object storage detour: MinIO (the planned open-source local stand-in for
  Cloudflare R2) turned out to have been discontinued (`dl.min.io` now 410s).
  Installed **SeaweedFS** instead — another open-source, S3-compatible, actively
  maintained server — documented as ADR-008. Hit and fixed a real AWS SDK v3
  gotcha along the way: presigned PUT URLs need `requestChecksumCalculation:
  "WHEN_REQUIRED"` or they fail with 400 BadDigest against any S3-compatible
  server, not just SeaweedFS.
- Built `apps/web/lib/zod-form.ts`: introspects any component-models Zod schema at
  runtime into a form field list, verified against Zod v4's actual internal shape
  empirically (not assumed from v3). Powers a genuinely dynamic per-category admin
  form — `apps/web/app/admin/components/component-form.tsx`.
- Added `/admin/components/new` and `/admin/components/:id/edit` pages, plus
  Edit/Delete actions on the dashboard's tables.
- Verified with a full Playwright browser session against the live dev server:
  created a Monitor-category component through the real form (including a real
  image upload), confirmed via search, edited it, confirmed the edit persisted,
  deleted it, confirmed it was gone.
- Stopped at the Phase 2 / Milestone 3 checkpoint; stock/brand/category management
  (Milestone 4) is next, pending user "Continue".

## 2026-09-12 — Phase 2, Milestone 2: Admin inventory dashboard
- Added `apps/web/lib/inventory.ts` (`getInventoryOverview()`,
  `searchAllComponents()`) and `GET /api/inventory` (role-gated,
  `ADMIN`/`INVENTORY_MANAGER`).
- Rewrote `/admin` from a placeholder into a real dashboard: total/low-stock/
  out-of-stock stat tiles, a native-form search box, and out-of-stock/low-stock/
  recently-updated tables. Admin search deliberately includes unavailable
  components, unlike the public `/api/components`.
- Verified against the live dev server with real data: temporarily set one seeded
  component out-of-stock and another low-stock, confirmed the API and rendered
  dashboard both reflected it correctly, confirmed search works, confirmed the API
  401s when unauthenticated, then reverted the test changes.
- Stopped at the Phase 2 / Milestone 2 checkpoint; admin CRUD + image upload
  (Milestone 3) is next, pending user "Continue". Flagged that no Cloudflare R2
  bucket exists yet, which Milestone 3's image upload will need to address.

## 2026-09-12 — Phase 2, Milestone 1: Component data models
- Added Zod schemas for all 12 seeded component categories (CPU, Motherboard, GPU,
  RAM, SSD, PSU, Case, Air Cooler, AIO Cooler, Fan, Monitor, Case LCD) plus a
  permissive generic fallback schema for future categories, in `packages/component-models`.
- Added `src/registry.ts` as the single `validateSpecifications`/`extractHotFields`
  lookup point, mapping category keys to their schema and hot-field extractor.
  Hot-field promotion strictly follows what ARCHITECTURE.md §4.1 already documented
  — no new hot columns invented; categories/fields that don't fit the
  equality/range-check model (cooler socket lists, AIO radiator size, fan
  size/mount, monitor specs) are deliberately left in the JSONB `specifications`
  blob only, each with an inline comment explaining why.
- Bumped this package's `zod` from the Milestone-1 stub `^3.24.1` to `^4.6.2` to
  match `apps/web`.
- Wrote the project's first real test suite: 34 Vitest tests (25 schema
  valid/invalid cases, 9 registry tests) — all passing. Added a
  `tsconfig.typecheck.json` pattern so `pnpm typecheck` also covers test files
  without polluting the package's actual build output.
- Full workspace `pnpm typecheck`/`build`/`test` all pass. Stopped at the Phase 2 /
  Milestone 1 checkpoint; the admin inventory dashboard (Milestone 2) is next,
  pending user "Continue".

## 2026-09-12 — Phase 1, Milestone 5: Components API (Phase 1 complete)
- Added `packages/shared`'s `apiSuccess`/`apiError` response envelope (this package
  was an empty stub until now); retrofitted the register route onto it too.
- Added `GET /api/components` (category/brand/q/minPrice/maxPrice/page/limit,
  Zod-validated, returns paginated results with category/brand/inventory included),
  `GET /api/components/categories`, and `GET /api/components/:id` (404 if missing).
  Deliberately no separate `/api/components/search` route — the `q` param covers it.
- `/workspace`'s category list now queries Prisma directly for real seeded data;
  deleted the hardcoded placeholder array from Milestone 4.
- Verified every route against the live dev server with real requests: list, every
  filter, pagination math, detail lookup, 404, and a 400 validation-error case.
- **Phase 1 (Core Cloud Application Foundation) is now complete** — all 5 milestones
  done. Phase 2 (Component Inventory System) is next, pending user "Continue".

## 2026-09-12 — Phase 1, Milestone 4: Base app shell UI
- Committed to a single dark "engineering tool" theme in `app/globals.css` (dropped
  the create-next-app default of following OS light/dark preference — this is a
  workspace tool, not a marketing site).
- Added a session-aware top nav (`components/nav.tsx`, rendered on every page) with
  brand, Workspace link, conditional Admin link, and sign-in/register or
  email+role+sign-out state.
- Added `/workspace`: the three-panel layout from the project brief (inventory panel
  with a static category list + disabled search, center 3D-area placeholder with
  disabled camera controls, right details/compatibility panel, bottom build-summary
  bar), responsive down to mobile widths (panels stack vertically below `lg`).
- Simplified the home page and restyled login/register/admin pages to match the new
  committed theme.
- Verified visually, not just by typecheck: installed Playwright in a scratch
  directory (not a project dependency), screenshotted the key pages at desktop and
  mobile widths against the real running dev server, and confirmed no horizontal
  overflow, correct responsive stacking, and no console errors.
- Stopped at the Phase 1 / Milestone 4 checkpoint; the components API (Milestone 5,
  the last Phase 1 milestone) is next, pending user "Continue".

## 2026-09-12 — Phase 1, Milestone 3: Auth
- Wired next-auth v4 (Credentials provider, JWT sessions) into `apps/web`, querying
  the existing `User`/`Role` model directly via `@pcbuilder/database` — no Prisma
  adapter, since Credentials + JWT doesn't need one (ADR-007; the architecture doc
  originally said "NextAuth v5 + Prisma adapter" as a Phase 0 placeholder, corrected
  to match reality).
- Added `POST /api/auth/register` (Zod validation, bcryptjs hashing) and the standard
  `/api/auth/[...nextauth]` catch-all handler.
- Added `/login` and `/register` pages, a session-aware home page, and a role-gated
  `/admin` placeholder. Role travels in the JWT/session via a module augmentation.
- Route protection lives in `apps/web/proxy.ts`, not `middleware.ts` — Next.js 16
  renamed that file convention; using the old name would still work today but is
  already deprecated, so the new name was used from the start.
- Verified the entire flow against the live dev server (not just typecheck): register
  → login → session → `/admin` blocked for `USER`, allowed after promoting to `ADMIN`
  in the database and re-authenticating. Test user cleaned up afterward.
- Corrected the root `.env.example` (`AUTH_SECRET`/`AUTH_URL` → the actual v4 names
  `NEXTAUTH_SECRET`/`NEXTAUTH_URL`) and updated `docs/API.md`/`docs/DEVELOPMENT.md`/
  `README.md` with real setup and testing steps.
- Stopped at the Phase 1 / Milestone 3 checkpoint; base app shell UI (Milestone 4) is
  next, pending user "Continue".

## 2026-09-12 — Phase 1, Milestone 2: Database schema
- Installed PostgreSQL 17 locally as a native Windows service (no Docker on this
  machine); created a dedicated `pcbuilder` role/database (see ADR-006 in
  `DECISIONS.md` for exact credentials and the CREATEDB requirement for Prisma's
  shadow database).
- Wrote the full Prisma schema (`packages/database/prisma/schema.prisma`): User,
  Brand, ComponentCategory, Component (hybrid relational/JSONB per ADR-002),
  Inventory, ThreeDAsset, CompatibilityRule, PCBuild, BuildComponent.
- Applied the initial migration against a real database and verified it end to end.
- Wrote an upsert-based seed script (12 categories, 8 brands, 8 compatibility rule
  definitions, 7 real-ish components across CPU/Motherboard/GPU/RAM/PSU/Case) and
  confirmed it's idempotent on re-run.
- Adopted Prisma 6's `prisma.config.ts` over the deprecated `package.json#prisma`
  field (requires explicit `dotenv` loading, which is not obvious — documented in
  `SESSION_CHECKPOINT.md`).
- Added `docker/docker-compose.yml` for anyone with Docker; updated
  `docs/DATABASE.md`, `docs/DEVELOPMENT.md`, and `README.md` with real setup steps.
- Verified the whole workspace still typechecks/builds after adding the new
  dependencies (had to add `@types/node` to `packages/database`).
- Stopped at the Phase 1 / Milestone 2 checkpoint; auth (Milestone 3) is next,
  pending user "Continue".

## 2026-09-12 — Phase 1, Milestone 1: Monorepo scaffold
- Installed Node.js 24 LTS (via winget) and pnpm 12.4.1 (via `npm install -g pnpm`) —
  the dev machine had neither beforehand.
- Set up the pnpm + Turborepo workspace at the repo root (`pnpm-workspace.yaml`,
  `package.json`, `turbo.json`, `tsconfig.base.json`, `.prettierrc.json`, `.nvmrc`).
- Scaffolded `apps/web` as a real Next.js (v16.3.4) + TypeScript + Tailwind CSS v4 +
  ESLint app via `create-next-app`, wired into the workspace (removed the nested
  workspace files create-next-app generates by default).
- Created stub packages `@pcbuilder/database`, `@pcbuilder/compatibility-engine`,
  `@pcbuilder/component-models`, `@pcbuilder/three-d-engine`, `@pcbuilder/shared`
  (package.json + tsconfig + empty `src/index.ts` each), all building/typechecking.
- Verified end-to-end: `pnpm install`, `pnpm typecheck`, `pnpm build` all pass across
  all 6 workspace packages; `pnpm dev` serves the app on `localhost:3000` (HTTP 200
  confirmed), then was stopped cleanly.
- Updated architecture docs to stop pinning "Next.js 14" (a planning-time
  placeholder) in favor of "Next.js (App Router)", since `create-next-app@latest`
  resolved to v16. Filled in real run instructions in `README.md` and
  `docs/DEVELOPMENT.md`.
- Stopped at the Phase 1 / Milestone 1 checkpoint per the "one milestone per session"
  rule; database schema (Milestone 2) is next, pending user "Continue".

## 2026-09-12 — Phase 0: Architecture & Planning
- Inspected repository: confirmed empty/greenfield directory, no prior project or git history.
- Established technology stack: Next.js 14 + TypeScript + Tailwind + R3F/Three.js
  frontend, Next.js API routes + Prisma + PostgreSQL backend, Auth.js for auth,
  Cloudflare R2 for object storage, Vercel + Neon for hosting.
- Documented full system architecture, database design (hybrid relational/JSONB),
  component data model strategy, compatibility engine design, 3D workspace/engine
  design, and cloud deployment architecture in `project-management/ARCHITECTURE.md`.
- Recorded key trade-off decisions as ADRs in `project-management/DECISIONS.md`.
- Wrote the phased `DEVELOPMENT_ROADMAP.md` (Phases 1-6 + MVP definition).
- Created the full project-management continuity system (`PROJECT_STATUS.md`,
  `CURRENT_PHASE.md`, `SESSION_CHECKPOINT.md`, `TODO.md`, `token-budget.json`, this file).
- Created the repository skeleton (`apps/web`, `packages/database`,
  `packages/compatibility-engine`, `packages/component-models`,
  `packages/three-d-engine`, `packages/shared`, `docs`, `infrastructure`, `scripts`,
  `docker`) with placeholder READMEs, plus root `README.md`, `.env.example`, `.gitignore`.
- Initialized git repository, made initial commit.
- No application code, database schema, or API implementation yet — by design, per
  the phased plan. Stopped at the Phase 0 checkpoint to await explicit user
  instruction before Phase 1 implementation begins.
