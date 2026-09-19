SESSION DATE: 2026-09-19

CURRENT PHASE: ALL PHASES (0-6) COMPLETE, plus cross-cutting tests, docs and CI. Pushed
to `origin/main` (https://github.com/jassimshaji/pc-build-simulator-cloudapp); CI passing.

CURRENT TASK: None in progress — awaiting user instruction.

LAST COMPLETED STEP: UI modularity + light/dark theme (ADR-015, ADR-016), then docs updated.
Before that: documentation refresh (README, package READMEs, docs/*, ARCHITECTURE.md §11).

WHAT EXISTS (one-paragraph map)
- `apps/web`: pages `/`, `/login`, `/register`, `/workspace`, `/builds`, `/shared/[slug]`,
  `/admin/*`; API routes under `app/api/**` (documented in `docs/API.md`); shared logic in
  `lib/` (`builds.ts`, `buildDraft.ts`, `compatibility.ts`, `requireRole.ts`, `theme.ts`, ...);
  state/effects in `hooks/`; UI in `components/` (`ui/` primitives, `workspace/` panels, shared
  side panels, `scene-canvas`, `theme-toggle`); tests in `tests/` (Vitest) and `e2e/` (Playwright).
- `packages/three-d-engine`: renderer (`WorkspaceCanvas`, `AirflowStream`) + pure logic
  (`buildSerialization`, `buildSummary`, `cameraState`, `airflow`, `estimates`, zones,
  procedural generators, `resolveComponentAsset`).
- `packages/compatibility-engine` (15 rules + power), `packages/component-models` (Zod per
  category), `packages/database` (Prisma + 20-component seed), `packages/shared`.

KEY DESIGN POINTS TO KNOW BEFORE CHANGING THINGS
- Builds are stored one `BuildComponent` row per unit; `UNPLACED` marks units not in a
  zone (the case is always `UNPLACED`). The server recomputes the compatibility/power
  snapshot; `workspaceState` accepts only a validated camera (ADR-010).
- Non-owners get 404 on private builds, admins included; disabling sharing deletes the
  slug (ADR-011).
- `fanMountFace(index)` (front, rear, top) is the single source of truth for fan mount
  faces; both the zone generator and the airflow model use it (ADR-012).
- Estimates are labelled rule-based heuristics (ADR-013).
- Theming: light mode is a second set of Tailwind palette variables under
  `<html data-theme="light">` (`app/theme.css`); components never check the theme, so use the
  normal zinc/status classes (ADR-015). The 3D scene takes a `theme` prop.
- The workspace is hooks + single-purpose panels (ADR-016); keep new logic in a hook or a pure
  `lib/` function rather than growing `build-workspace.tsx`.
- The seed's SKUs are part of the tests' contract — don't rename/remove them casually.
- `apps/web` typecheck runs `next typegen` first (fresh checkouts have no route types).

VERIFICATION AT THIS CHECKPOINT
- `pnpm typecheck`, `pnpm --filter web run lint`, `pnpm test` (324 Vitest tests) and
  `pnpm --filter web test:e2e` (16 Playwright flows) pass locally. GitHub Actions passed on
  `60ed66f`; the UI/theme commit is pushed after this checkpoint was written — check its run.

KNOWN ISSUES (none blocking): orphaned storage objects on component delete; cosmetic
Turbopack `export *` warning; slot uniqueness not enforced; zone click targets are small
zoomed out; estimates use the first CPU/GPU only; ARCHITECTURE.md §9 items not built
(magic-byte sniffing, enforced upload sizes, rate limiting). Full list: PROJECT_STATUS.md.

NEXT STEP: Nothing is queued. When the user says "Continue", ask what they want or pick
from PROJECT_STATUS.md -> Remaining (first deployment, then pre-launch hardening).

HOW TO RUN LOCALLY
  pnpm install
  cp packages/database/.env.example packages/database/.env
  cp apps/web/.env.example apps/web/.env.local     # DATABASE_URL + NEXTAUTH_SECRET (S3_* only for uploads)
  pnpm --filter @pcbuilder/database run db:migrate
  pnpm --filter @pcbuilder/database run db:seed
  pnpm dev                                          # http://localhost:3000
Tests: `pnpm test`; browser tests `pnpm --filter web test:e2e`. The web tests need a
`pcbuilder_test` Postgres database (`CREATE DATABASE pcbuilder_test OWNER pcbuilder;`) —
migrations and seed are applied automatically. Full detail: `docs/DEVELOPMENT.md`.

MACHINE NOTES (this Windows dev machine, may differ elsewhere)
- Node and pnpm are installed but may not be on PATH in a fresh shell; prepend
  `C:\Program Files\nodejs` and `%APPDATA%\npm`.
- Local Postgres: a native Windows service on localhost:5432 (role `pcbuilder`, databases
  `pcbuilder` and `pcbuilder_test`).
- SeaweedFS (only for uploads) is a plain process, not a service: start it with the
  launcher described in `docs/DEVELOPMENT.md` (it needs short 8.3 paths and non-8080
  volume/filer ports here).
- Git: the working folder is a clone of `origin/main`. Commits are authored as
  `JassimShaji <jassimshaji20@gmail.com>` to match the repo history; the machine's global
  git identity is a placeholder, so pass `-c user.name=... -c user.email=...` or set a
  repo-local identity.
- A registered `jassimshaji20@gmail.com` account promoted to ADMIN exists in the LOCAL
  development database only (never committed; sign in again after any role change).
