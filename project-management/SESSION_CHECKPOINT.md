SESSION DATE: 2026-09-12

CURRENT PHASE: Phase 1 COMPLETE (all 5 milestones). Next: Phase 2 — Component Inventory System.

CURRENT TASK: None in progress — awaiting user instruction for Phase 2, Milestone 1
(`packages/component-models`).

LAST COMPLETED STEP: Phase 1, Milestone 5 (components API — the final Phase 1
milestone), fully verified against the live dev server.
- `packages/shared/src/apiResponse.ts` (new): `ApiSuccess<T>`/`ApiFailure`/
  `ApiResponse<T>` types plus `apiSuccess(data)`/`apiError(message, issues?)`
  helpers — the `{ data, error }` envelope every route should return, never both
  populated. Exported from `packages/shared/src/index.ts` (this package was an
  empty stub until now). Added `"@pcbuilder/shared": "workspace:*"` to
  `apps/web`'s dependencies.
- Retrofitted `apps/web/app/api/auth/register/route.ts` to use `apiSuccess`/
  `apiError` instead of hand-rolled `{ data, error }` object literals — same
  behavior, now using the shared helper for consistency (verified with a live
  request afterward; still returns 201/{id,email}).
- `apps/web/app/api/components/route.ts` (new): `GET` — Zod query schema
  (`category`, `brand`, `q`, `minPrice`/`maxPrice` via `z.coerce.number()`, `page`
  default 1, `limit` default 20 max 100), builds a `Prisma.ComponentWhereInput`
  (imported `Prisma` as a named export from `@pcbuilder/database`, which re-exports
  everything from `@prisma/client`), filters to `isAvailable: true` plus whatever
  optional filters were supplied, `model: { contains: q, mode: "insensitive" }` for
  search. Returns `{ items, total, page, limit, totalPages }` with `category`/
  `brand`/`inventory` included per item.
- `apps/web/app/api/components/categories/route.ts` (new): `GET` — all
  `ComponentCategory` rows ordered by `sortOrder`. Deliberately did NOT add a
  separate `/api/components/search` route (it was in the original planned-routes
  table in docs/API.md) — the `q` param on the list route already does this;
  documented that decision in docs/API.md so nobody re-adds a duplicate route later.
- `apps/web/app/api/components/[id]/route.ts` (new): `GET` — one `Component` with
  `category`/`brand`/`inventory`/`threeDAssets` included, 404 via `apiError` if not
  found. Uses the Next.js 16 App Router convention `{ params }: { params:
  Promise<{ id: string }> }` then `await params` (confirmed this exact shape by
  reading `node_modules/next/dist/docs/.../route.md`'s dynamic-segment example
  rather than assuming — this is NOT the old synchronous `params` object from
  older Next versions).
- Confirmed static-segment-over-dynamic-segment routing works as expected:
  `/api/components/categories` (literal) and `/api/components/[id]` (dynamic) both
  exist under `app/api/components/` with no conflict — Next.js resolves the literal
  segment first, standard behavior.
- Rewired `apps/web/app/workspace/page.tsx` to query
  `prisma.componentCategory.findMany({ orderBy: { sortOrder: "asc" } })` directly
  (it's a server component — querying Prisma directly is correct here, not fetching
  its own API route over HTTP) instead of importing a hardcoded array. Deleted
  `apps/web/lib/categories.ts` (the placeholder from Milestone 4) since nothing
  references it anymore.
- **Verified against the real running dev server** (not just typecheck): `GET
  /api/components/categories` → all 12 real categories with correct sortOrder; `GET
  /api/components` (no filters) → all 7 seeded components; `?category=GPU` → just
  the RTX 4070; `?q=ryzen` → just the 7800X3D; `?limit=1` → `total=7,
  totalPages=7, items.length=1` (pagination math correct); `GET
  /api/components/:realId` → full detail with category/brand/inventory populated
  correctly; `GET /api/components/does-not-exist` → 404 with the expected error
  envelope; `GET /api/components?minPrice=notanumber` → 400 with Zod's flattened
  field error. Also re-verified `/workspace`'s rendered HTML contains all 12 real
  category labels (not the old hardcoded 12 — same labels, but now sourced from the
  database, confirmed by checking the page renders after the hardcoded file was
  deleted and the build still succeeds).
- `pnpm typecheck` (8/8 packages, including the new `packages/shared` build/
  typecheck tasks), `pnpm --filter web run lint` (clean), and `pnpm build` (6/6,
  all three new routes listed in the route table) all pass.
- Cleaned up: deleted the two ad hoc test users created during verification
  (`envelope-check@example.com` and, from the previous Milestone 3 session,
  `tester@example.com` — already gone), stopped the dev server, removed temp
  log/SQL scratch files each time.

FILES CREATED:
- packages/shared/src/apiResponse.ts
- apps/web/app/api/components/route.ts
- apps/web/app/api/components/categories/route.ts
- apps/web/app/api/components/[id]/route.ts

FILES MODIFIED:
- packages/shared/src/index.ts (now exports apiResponse instead of being empty)
- packages/shared/package.json is unchanged (no new deps needed for this package)
- apps/web/package.json (added @pcbuilder/shared workspace dependency)
- apps/web/app/api/auth/register/route.ts (uses apiSuccess/apiError now)
- apps/web/app/workspace/page.tsx (queries Prisma for categories instead of a
  hardcoded array)
- packages/shared/README.md, docs/API.md (documented the three new routes + the
  envelope convention + why there's no separate /search route),
  project-management/DEVELOPMENT_ROADMAP.md, project-management/TODO.md,
  project-management/CURRENT_PHASE.md, project-management/PROJECT_STATUS.md,
  project-management/CHANGELOG.md (this checkpoint's sibling docs)

FILES DELETED:
- apps/web/lib/categories.ts (superseded by the real Prisma query; nothing else
  referenced it)

DATABASE CHANGES: none to the schema — only read queries added at the application
layer. (Two throwaway test users were created and deleted during manual
verification, as in every session so far; not part of the seed data.)

API CHANGES: three new public GET routes, all documented above and in docs/API.md.
No mutating component routes yet (create/update/delete are Phase 2's admin CRUD).

FRONTEND CHANGES: `/workspace` now shows real category data from the database
instead of a hardcoded placeholder list; otherwise unchanged from Milestone 4's
layout.

3D ENGINE CHANGES: none — packages/three-d-engine is still an empty stub.

KNOWN ISSUES: none new.

TEST STATUS: still no automated test suite (expected until Phase 3, where the
compatibility engine gets required Vitest coverage). This milestone's correctness
was verified by exercising the real running server with real seeded data across
every documented behavior (filter/search/paginate/detail/404/validation-error),
which is the right verification method for CRUD-shaped routes with no complex
business logic yet.

NEXT STEP: When the user says "Continue": re-read this file + PROJECT_STATUS.md +
CURRENT_PHASE.md + TODO.md, confirm `pnpm install && pnpm build` still passes and
Postgres is running, then start PHASE 2 (Component Inventory System), Milestone 1:
`packages/component-models` — Zod schemas for every component category's spec shape
(Motherboard, CPU, GPU, RAM, SSD, PSU, Case, Fan, AIO, Air Cooler, Monitor, Case LCD,
plus a generic/open schema for future categories — see ARCHITECTURE.md §5) and the
per-category "hot field" extraction functions that populate `Component`'s indexed
columns (socket/formFactor/ramType/pcieGeneration/lengthMm etc., per ARCHITECTURE.md
§4.1). This is pure package/type work — no UI, no new API routes yet (the admin
dashboard and CRUD that consume these schemas are Phase 2 Milestones 2-3). Stop at
that checkpoint rather than also building the admin dashboard in the same session.

EXACT COMMANDS TO RUN THE PROJECT LOCALLY:
  pnpm install
  pnpm dev                     # apps/web on http://localhost:3000

Try the new routes: `curl http://localhost:3000/api/components/categories`,
`curl http://localhost:3000/api/components?category=GPU`,
`curl http://localhost:3000/api/components?q=ryzen&limit=5`.

One-time per machine / after a fresh clone (all already done on this machine):
  cp packages/database/.env.example packages/database/.env
  pnpm --filter @pcbuilder/database run db:migrate
  pnpm --filter @pcbuilder/database run db:seed
  cp apps/web/.env.example apps/web/.env.local   # fill in DATABASE_URL + generate NEXTAUTH_SECRET

Other root scripts: `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test`.

Local Postgres on THIS machine: native Windows service `postgresql-x64-17` on
localhost:5432, superuser `postgres`/`postgres`, app role `pcbuilder`/`pcbuilder`
owning database `pcbuilder`.

PATH note (still applies): if `node`/`pnpm`/`npm`/`psql` report "not recognized" in a
fresh shell, prepend, e.g. in PowerShell:
  $env:Path += ";C:\Program Files\nodejs;$env:APPDATA\npm;C:\Program Files\PostgreSQL\17\bin"

Playwright note (from the Milestone 4 checkpoint, still true): not a project
dependency, was installed ad hoc into a scratch directory outside the repo for
visual verification and not needed again unless another UI-heavy milestone needs
the same kind of check.
