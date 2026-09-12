# Project Status

**Current phase:** Phase 1 — Core Cloud Application Foundation (Milestones 1-3 of 5 complete)
**Overall completion:** ~18%

## Completed
- Phase 0: full architecture, database design, compatibility engine design, 3D engine
  design, cloud deployment design, and the project-management continuity system.
- Phase 1, Milestone 1 — **Monorepo scaffold** (pnpm + Turborepo + real Next.js 16 app
  + 5 package stubs).
- Phase 1, Milestone 2 — **Database schema** (full Prisma schema, migration applied,
  12 categories/8 brands/7 components seeded, verified idempotent).
- Phase 1, Milestone 3 — **Auth:**
  - next-auth v4 (Credentials provider, JWT session strategy) wired into `apps/web`,
    querying the existing `User`/`Role` model directly (no Prisma adapter needed —
    ADR-007).
  - `POST /api/auth/register` (Zod-validated, bcryptjs-hashed) + `/api/auth/[...nextauth]`
    catch-all handler.
  - `/login` and `/register` pages (client components using `signIn`/fetch), home
    page shows session state and admin link when applicable.
  - Role travels in the JWT/session (`user.id`, `user.role`); module augmentation in
    `apps/web/types/next-auth.d.ts`.
  - `apps/web/proxy.ts` (Next.js 16's renamed `middleware.ts` convention) gates
    `/admin/:path*` by role; `apps/web/lib/requireRole.ts` is the authoritative
    server-side check for API routes/server components.
  - **Verified against the live dev server:** register → 201; credentials sign-in →
    session correctly carries id+role; `/admin` → 307 redirect for a `USER`-role
    session, 200 after promoting to `ADMIN` in the DB and re-authenticating; full
    workspace `pnpm typecheck`/`pnpm build`/`pnpm --filter web lint` all pass; test
    user cleaned up afterward.

## In progress
- Nothing — at a checkpoint awaiting user instruction to start Milestone 4 (base app
  shell UI).

## Remaining (see DEVELOPMENT_ROADMAP.md for full detail)
- Phase 1: base app shell UI (Milestone 4), first components API (Milestone 5).
- Phase 2: full inventory admin system.
- Phase 3: compatibility engine implementation + tests, power calculation.
- Phase 4: 3D workspace (R3F canvas, procedural generators, install zones, click-to-place).
- Phase 5: build save/load/share/summary.
- Phase 6: fan/airflow visualization.

## Known issues
- None currently.

## Blockers
- None. Node.js, pnpm, PostgreSQL, and now working auth are all installed/verified on
  this machine.

## Next recommended action
Say "Continue" to begin **Phase 1, Milestone 4: Base app shell UI** (top nav, the
three-panel workspace layout, responsive breakpoints, dark theme — building on the
existing auth state rather than replacing it). See `SESSION_CHECKPOINT.md` for exact
resume details.
