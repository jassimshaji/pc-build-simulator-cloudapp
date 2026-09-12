# Project Status

**Current phase:** Phase 1 — Core Cloud Application Foundation (Milestones 1-2 of 5 complete)
**Overall completion:** ~13%

## Completed
- Phase 0: full architecture, database design, compatibility engine design, 3D engine
  design, cloud deployment design, and the project-management continuity system.
- Phase 1, Milestone 1 — **Monorepo scaffold** (pnpm + Turborepo + real Next.js 16 app
  + 5 package stubs, all building/typechecking; `pnpm dev` verified serving on
  localhost:3000).
- Phase 1, Milestone 2 — **Database schema:**
  - Installed PostgreSQL 17 locally as a native Windows service (no Docker on this
    machine) — see ADR-006 in `DECISIONS.md` for exact setup/credentials notes.
  - Full Prisma schema in `packages/database/prisma/schema.prisma`: `User`, `Brand`,
    `ComponentCategory`, `Component` (hybrid relational/JSONB per ADR-002),
    `Inventory`, `ThreeDAsset`, `CompatibilityRule`, `PCBuild`, `BuildComponent`.
  - Initial migration (`init`) applied and verified against a real database.
  - `prisma/seed.ts` (upsert-based, safe to re-run): seeds all 12 planned component
    categories, 8 brands, 8 compatibility rule definitions, and 7 real-ish
    components (2 CPUs, 1 motherboard, 1 GPU, 1 RAM kit, 1 PSU, 1 case), each with an
    `Inventory` row and a `PROCEDURAL_FALLBACK` `ThreeDAsset` row.
  - `packages/database/src/index.ts` exports a singleton `PrismaClient`.
  - `docker/docker-compose.yml` added for anyone who does have Docker.
  - **Verified:** migration applies cleanly, seed runs and is idempotent on re-run
    (counts confirmed via direct SQL query), and the whole workspace still
    typechecks/builds (`pnpm typecheck`, `pnpm build`, 6/6 packages passing).

## In progress
- Nothing — at a checkpoint awaiting user instruction to start Milestone 3 (auth).

## Remaining (see DEVELOPMENT_ROADMAP.md for full detail)
- Phase 1: auth (Milestone 3), base app shell UI (Milestone 4), first components API
  (Milestone 5).
- Phase 2: full inventory admin system.
- Phase 3: compatibility engine implementation + tests, power calculation.
- Phase 4: 3D workspace (R3F canvas, procedural generators, install zones, click-to-place).
- Phase 5: build save/load/share/summary.
- Phase 6: fan/airflow visualization.

## Known issues
- None currently. (`apps/web` doesn't read from the database yet — expected, that's
  Milestone 5, not a bug.)

## Blockers
- None. Node.js, pnpm, and PostgreSQL are all installed and verified working on this
  machine.

## Next recommended action
Say "Continue" to begin **Phase 1, Milestone 3: Auth** (Auth.js Credentials provider +
Prisma adapter, register/login pages, JWT session with role claim, `requireRole()`
helper). See `SESSION_CHECKPOINT.md` for exact resume details.
