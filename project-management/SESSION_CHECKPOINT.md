SESSION DATE: 2026-09-12

CURRENT PHASE: Phase 2 — Component Inventory System (Milestone 2 of 6 complete)

CURRENT TASK: None in progress — awaiting user instruction for Milestone 3 (admin CRUD).

LAST COMPLETED STEP: Phase 2, Milestone 2 (admin inventory dashboard), fully
verified against the live dev server with real (temporarily modified) data.
- `apps/web/lib/inventory.ts` (new): `InventoryRow`/`InventoryOverview` types plus
  two functions:
  - `getInventoryOverview()`: total component count (`prisma.component.count()`),
    out-of-stock (`where: { inventory: { stockQuantity: { lte: 0 } } }` — a plain
    constant comparison, pushed to the DB), low-stock (narrowed to in-stock rows
    via `{ stockQuantity: { gt: 0 } }` in the DB, then filtered in JS for
    `stockQuantity <= lowStockThreshold` — Prisma's `where` can't compare two
    columns on the same row without raw SQL, so this is a deliberate, commented
    hybrid rather than either a full-table JS filter or premature raw SQL), and
    the 5 most recently updated components (`orderBy: { updatedAt: "desc" }, take:
    5`). Runs all four queries via `Promise.all`.
  - `searchAllComponents(query)`: case-insensitive `OR` match against `model` or
    `sku`, capped at 50 results. Deliberately does NOT filter `isAvailable: true`
    (unlike the public `/api/components` from Milestone 5) — admins need to see
    everything they manage, including components a shopper wouldn't see.
  - Both use a shared `Prisma.ComponentGetPayload<{ include: ... }>` type (`Prisma`
    imported from `@pcbuilder/database`) and a `toRow()` mapper flattening
    category/brand/inventory relations into one flat row shape for the UI/API.
- `apps/web/app/api/inventory/route.ts` (new): `GET`, gated via
  `requireRole(["ADMIN", "INVENTORY_MANAGER"])`, returns
  `apiSuccess(getInventoryOverview())` or the role-check's own 401/403 via
  `apiError`.
- `apps/web/app/admin/page.tsx` (rewritten from Milestone 3's placeholder): reads
  `searchParams` (Next.js 16 App Router convention — `Promise<{ q?: string }>`,
  awaited, same pattern as the dynamic-route `params` fix from Milestone 5), calls
  `getInventoryOverview()` and (if `q` present) `searchAllComponents(q)` in
  parallel via `Promise.all`. Renders: 3 stat tiles (total/low-stock/out-of-stock
  counts), a plain `<form method="GET">` search box (deliberately NO client
  component/JS — a native GET form re-triggers the server component with `?q=`,
  which is simpler and sufficient for this milestone), and a small
  `ComponentTable` helper component rendering out-of-stock/low-stock/
  recently-updated/search-result tables (model + an "unavailable" badge when
  `isAvailable` is false, SKU, category, brand, stock, updated date). Kept the
  existing `requireRole` + `redirect("/login")` guard from Milestone 3 at the top.
- **Verified against the live dev server with real, temporarily-modified data**
  (not just empty-state screenshots): registered a test admin user, promoted to
  `ADMIN` via direct SQL, set the seeded RTX 4070's stock to 0 and the RAM kit's
  stock to 3 (threshold is 5) via SQL, signed in via the credentials flow, then:
  `GET /api/inventory` → `outOfStock=1` (RTX 4070, qty 0), `lowStock=1` (RAM, qty
  3/threshold 5), `recent=5` — all correct. `GET /admin` HTML → contained "GeForce
  RTX 4070", "Vengeance" (the low-stock RAM), and "Total components" — confirmed
  all three dashboard sections actually render real data, not just typecheck.
  `GET /admin?q=ryzen` → HTML contained "Ryzen 7 7800X3D" — search works.
  Unauthenticated `GET /api/inventory` → 401, confirming the role gate holds.
  Reverted both components' stock back to 25 and deleted the test admin user
  afterward; confirmed via a direct SQL query that all 7 seeded components show
  `stockQuantity = 25` again.
- `pnpm typecheck` (8/8), `pnpm --filter web run lint` (clean), and `pnpm build`
  (6/6, `/api/inventory` listed in the route table) all pass.

FILES CREATED:
- apps/web/lib/inventory.ts
- apps/web/app/api/inventory/route.ts

FILES MODIFIED:
- apps/web/app/admin/page.tsx (full rewrite: stat tiles, search form, three data
  tables, replacing the Milestone-3 placeholder text)
- docs/API.md (documented GET /api/inventory, moved it out of the "planned" table),
  project-management/DEVELOPMENT_ROADMAP.md, project-management/TODO.md,
  project-management/CURRENT_PHASE.md, project-management/PROJECT_STATUS.md,
  project-management/CHANGELOG.md (this checkpoint's sibling docs)

DATABASE CHANGES: none to the schema. (Two components' stock quantities were
temporarily changed via direct SQL for verification, then reverted — confirmed back
to the seeded state of 25 each.)

API CHANGES: added `GET /api/inventory` (role-gated).

FRONTEND CHANGES: `/admin` is now a real dashboard instead of a placeholder — see
above.

3D ENGINE CHANGES: none — packages/three-d-engine is still an empty stub.

KNOWN ISSUES: none new. Note for whoever picks up Milestone 3 (admin CRUD + image
upload): no Cloudflare R2 bucket is provisioned on this machine/account yet, so
"upload to object storage" as literally described in ARCHITECTURE.md §8 isn't
immediately actionable — that milestone will likely need either a stub/local file
path (documented as temporary) or a pause to get real R2 credentials from the user
before wiring up actual uploads. Flagged in CURRENT_PHASE.md so it isn't a surprise
mid-session.

TEST STATUS: no new automated tests this session (this milestone is CRUD-adjacent
UI/API wiring with no complex business logic — verified by exercising the real
server with real data, same reasoning as Milestone 5). `packages/component-models`'s
34 tests from the previous session still pass.

NEXT STEP: When the user says "Continue": re-read this file + PROJECT_STATUS.md +
CURRENT_PHASE.md + TODO.md, confirm `pnpm install && pnpm build` still passes and
Postgres is running, then implement Phase 2, Milestone 3 (admin CRUD): a per-category
dynamic spec form in `/admin` (or a new `/admin/components/new` /
`/admin/components/[id]/edit` route) generated from `@pcbuilder/component-models`'s
Zod schemas, `POST /api/components` and `PATCH`/`DELETE /api/components/:id`
(role-gated), and image upload. Read the "known issues" note above about R2 before
assuming real object storage is ready to wire up — ask the user how to proceed if it
matters for that session's scope. Stop at that checkpoint rather than also building
stock/brand/category management (Milestone 4) in the same session.

EXACT COMMANDS TO RUN THE PROJECT LOCALLY:
  pnpm install
  pnpm dev                     # apps/web on http://localhost:3000

Try it: register a user, promote it to ADMIN
(`UPDATE "User" SET role = 'ADMIN' WHERE email = '...'`), log in, visit `/admin` —
real stat tiles, search box, and out-of-stock/low-stock/recently-updated tables (all
seeded components currently show stockQuantity=25, so those two sections will be
empty on a fresh seed unless you manually lower some inventory rows to test).

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
