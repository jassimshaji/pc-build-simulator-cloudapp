SESSION DATE: 2026-09-12

CURRENT PHASE: Phase 1 — Core Cloud Application Foundation (Milestones 1-3 of 5 complete)

CURRENT TASK: None in progress — awaiting user instruction for Milestone 4 (base app shell UI).

LAST COMPLETED STEP: Phase 1, Milestone 3 (auth), fully verified end-to-end.
- `pnpm add next-auth bcryptjs zod` in `apps/web` resolved to `next-auth@4.24.15`
  (not v5 — ARCHITECTURE.md originally said "NextAuth v5" as a Phase 0 planning
  placeholder; updated to reflect what's actually installed, see ADR-007 in
  DECISIONS.md) and `zod@4.6.2` (v4, not v3 — used `z.email()` top-level function,
  not the v3-style `.string().email()` chain, since v4 encourages the former).
  Removed `@types/bcryptjs` immediately after installing it — bcryptjs ships its own
  types and the package just warns you don't need the stub.
- Added `"@pcbuilder/database": "workspace:*"` to `apps/web`'s dependencies so the
  auth code can import the shared Prisma client singleton.
- `apps/web/lib/auth.ts`: `NextAuthOptions` with a Credentials provider whose
  `authorize()` looks up `User` via Prisma directly and compares
  `bcrypt.compare(password, user.passwordHash)` — no `@auth/prisma-adapter` (ADR-007:
  not needed for Credentials + JWT, only matters for OAuth/database sessions).
  `session: { strategy: "jwt" }`, `jwt`/`session` callbacks copy `id`/`role` onto the
  token/session.
- `apps/web/types/next-auth.d.ts`: module augmentation adding `id`/`role: Role` to
  `next-auth`'s `User`/`Session` and `next-auth/jwt`'s `JWT` interfaces.
- `apps/web/lib/requireRole.ts`: `requireRole(allowedRoles: Role[])` — re-reads the
  server session via `getServerSession`, returns a typed ok/401/403 result. This is
  the pattern every future admin API route should copy; never trust a
  client-supplied role.
- `apps/web/app/api/auth/[...nextauth]/route.ts`: standard next-auth v4 App Router
  catch-all (`NextAuth(authOptions)` exported as both GET and POST).
- `apps/web/app/api/auth/register/route.ts`: Zod-validated
  (`email`/`password` min 8/`name` optional), checks for an existing user (409),
  hashes with `bcrypt.hash(password, 12)`, creates the `User` (role defaults to
  `USER` per the Prisma schema).
- `apps/web/app/providers.tsx` (client component wrapping `SessionProvider`) is now
  rendered inside `apps/web/app/layout.tsx`'s `<body>`.
- `apps/web/app/login/page.tsx` and `apps/web/app/register/page.tsx`: minimal
  (undecorated — real design is Milestone 4) client-component forms using
  `signIn("credentials", { redirect: false })` and a fetch to `/api/auth/register`
  respectively.
- `apps/web/app/page.tsx` rewritten from the create-next-app marketing template to a
  minimal server component that reads `getServerSession` and shows either
  login/register links or "Signed in as X (ROLE)" + a sign-out button
  (`apps/web/app/sign-out-button.tsx`, a small client component) + an admin link when
  the role qualifies.
- `apps/web/app/admin/page.tsx`: minimal placeholder server component that calls
  `requireRole(["ADMIN", "INVENTORY_MANAGER"])` itself (belt-and-suspenders on top of
  the proxy-level gate) and redirects to `/login` if not authorized.
- **IMPORTANT naming gotcha, already fixed:** Next.js 16 deprecated the
  `middleware.ts` file convention in favor of `proxy.ts` (confirmed by reading
  `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md` per the
  AGENTS.md instruction in apps/web to check the bundled docs for this version — "the
  functionality remains the same," just renamed, same default-export function shape
  works). The auth route protection file is `apps/web/proxy.ts`, NOT
  `apps/web/middleware.ts` — don't recreate the old name. It uses
  `next-auth/middleware`'s `withAuth()` wrapped in a default export, matcher
  `["/admin/:path*"]`.
- `apps/web/.env.local` (gitignored) and `apps/web/.env.example` created —
  `DATABASE_URL` (same value as `packages/database/.env`) + `NEXTAUTH_SECRET` +
  `NEXTAUTH_URL` (next-auth v4 reads these exact names, not `AUTH_SECRET`/`AUTH_URL`
  which are the v5 names the root `.env.example` originally had — root
  `.env.example` was corrected too). A real random secret was generated via
  `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` and
  is sitting in the gitignored `apps/web/.env.local` on this machine.
- Verified end-to-end against the actual running dev server (not just typecheck):
  `POST /api/auth/register` → 201; CSRF + credentials sign-in flow → `GET
  /api/auth/session` correctly returns `{"user":{"id":...,"role":"USER",...}}`; `GET
  /admin` with that session → 307 redirect (blocked, correct); promoted the test user
  to `ADMIN` directly via `psql` (`UPDATE "User" SET role = 'ADMIN' WHERE email =
  ...`), re-authenticated (JWT role only updates on next sign-in, not automatically —
  expected JWT behavior, not a bug), `GET /admin` → 200 with the correct session data
  rendered. Test user was deleted afterward; dev server stopped; temp log/SQL files
  cleaned up.
- Confirmed `pnpm typecheck`, `pnpm build` (all 6 packages, including a rebuilt
  `web` with no more "middleware deprecated" warning after the `proxy.ts` rename),
  and `pnpm --filter web run lint` all pass clean.

FILES CREATED:
- apps/web/lib/auth.ts, apps/web/lib/requireRole.ts
- apps/web/types/next-auth.d.ts
- apps/web/app/api/auth/[...nextauth]/route.ts, apps/web/app/api/auth/register/route.ts
- apps/web/app/providers.tsx, apps/web/app/sign-out-button.tsx
- apps/web/app/login/page.tsx, apps/web/app/register/page.tsx, apps/web/app/admin/page.tsx
- apps/web/proxy.ts (route-protection; NOT middleware.ts, see naming gotcha above)
- apps/web/.env.local (gitignored), apps/web/.env.example

FILES MODIFIED:
- apps/web/package.json (added @pcbuilder/database, next-auth, bcryptjs, zod)
- apps/web/app/layout.tsx (wraps children in <Providers>, updated page title/description)
- apps/web/app/page.tsx (replaced create-next-app marketing template with a minimal
  session-aware placeholder)
- .env.example (root — corrected AUTH_SECRET/AUTH_URL to the actual v4 env var names
  NEXTAUTH_SECRET/NEXTAUTH_URL)
- project-management/ARCHITECTURE.md (auth stack row + password-hashing line
  corrected to match what's actually installed), project-management/DECISIONS.md
  (ADR-007), project-management/DEVELOPMENT_ROADMAP.md,
  project-management/TODO.md, docs/API.md (auth routes documented as implemented),
  docs/DEVELOPMENT.md (real auth setup/testing steps), README.md,
  project-management/CURRENT_PHASE.md, project-management/PROJECT_STATUS.md,
  project-management/CHANGELOG.md (this checkpoint's sibling docs)

DATABASE CHANGES: none to the schema itself this session (still the Milestone 2
schema) — only data changes (a test user created, promoted, then deleted; not part of
the seed data).

API CHANGES: added `/api/auth/register` and `/api/auth/[...nextauth]` (the latter is
next-auth's own catch-all, not hand-written route logic).

FRONTEND CHANGES: `/login`, `/register`, `/admin` pages added; `/` (home) rewritten to
be session-aware; `app/layout.tsx` wraps everything in a SessionProvider. All still
intentionally minimal/undecorated — real visual design is Milestone 4.

3D ENGINE CHANGES: none — packages/three-d-engine is still an empty stub.

KNOWN ISSUES: none new. (The home page and admin placeholder are deliberately plain —
not a bug, just scoped out of this milestone.)

TEST STATUS: still no automated test suite (expected until Phase 3). This milestone's
correctness was verified by exercising the real running server (register/login/
session/role-gate) rather than unit tests, which is appropriate for auth wiring with
no business logic yet.

NEXT STEP: When the user says "Continue": re-read this file + PROJECT_STATUS.md +
CURRENT_PHASE.md + TODO.md, confirm `pnpm install && pnpm build` still passes and
Postgres is still running, then implement Phase 1, Milestone 4 (base app shell UI):
top nav (with sign-in/sign-out state and an admin link, building on what already
exists rather than replacing it), the three-panel workspace layout (inventory panel /
3D area placeholder / details+compatibility panel) per the brief's suggested layout,
responsive breakpoints, and a dark "engineering tool" theme. Stop at that checkpoint
rather than also starting the components API (Milestone 5) in the same session.

EXACT COMMANDS TO RUN THE PROJECT LOCALLY:
  pnpm install
  pnpm dev                     # apps/web on http://localhost:3000

One-time per machine / after a fresh clone (both already done on this machine):
  cp packages/database/.env.example packages/database/.env   # then adjust if needed
  pnpm --filter @pcbuilder/database run db:migrate
  pnpm --filter @pcbuilder/database run db:seed
  cp apps/web/.env.example apps/web/.env.local                # then fill in DATABASE_URL + generate NEXTAUTH_SECRET

Try it: visit /register to create an account, /login to sign in, / shows session
state, /admin is gated (promote via `UPDATE "User" SET role = 'ADMIN' WHERE email =
...` — no admin UI to do this yet, that's Phase 2).

Other root scripts: `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test`.

Local Postgres on THIS machine: native Windows service `postgresql-x64-17` on
localhost:5432, superuser `postgres`/`postgres`, app role `pcbuilder`/`pcbuilder`
owning database `pcbuilder`.

PATH note (still applies): if `node`/`pnpm`/`npm`/`psql` report "not recognized" in a
fresh shell, prepend, e.g. in PowerShell:
  $env:Path += ";C:\Program Files\nodejs;$env:APPDATA\npm;C:\Program Files\PostgreSQL\17\bin"
