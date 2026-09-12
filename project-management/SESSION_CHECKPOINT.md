SESSION DATE: 2026-09-12

CURRENT PHASE: Phase 2 — Component Inventory System (Milestone 4 of 6 complete)

CURRENT TASK: None in progress — awaiting user instruction for Milestone 5 (CSV
import/export).

LAST COMPLETED STEP: Phase 2, Milestone 4 (stock management + brand/category
management), fully verified against the live dev server (API calls + a Playwright
UI pass).

- `apps/web/app/api/inventory/update/route.ts` (new): `POST`, role-gated, Zod
  schema `{ componentId, stockQuantity?, lowStockThreshold? }`, upserts the
  `Inventory` row (in practice always exists already — every component gets one on
  creation in Milestone 3 — upsert is just defensive), stamps `lastRestockedAt =
  new Date()` whenever `stockQuantity` is included. This is intentionally a
  separate route from `PATCH /api/components/:id` (which edits the Component
  itself) — a dedicated fast path for the routine "adjust stock" action.
- `apps/web/app/admin/stock-cell.tsx` (new client component): replaces the plain
  stock-quantity text in every dashboard `ComponentTable` row with a small number
  input; a "Save" link only appears once the value actually differs from the
  server value (`isDirty` check), calls the update route, then
  `router.refresh()`.
- `apps/web/app/api/brands/route.ts` (new): `GET` (public — every brand with
  `_count.components`) and `POST` (role-gated, upserts nothing — this is an
  explicit create, 409 on duplicate name; distinct from `POST /api/components`'s
  implicit brand-upsert-by-name, which stays as-is for the common "type a new
  brand while creating a component" flow).
- `apps/web/app/api/brands/[id]/route.ts` (new): `PATCH` (rename/logoUrl, 409 on
  duplicate name via Prisma's `P2002`, 404 via `P2025`) and `DELETE` (counts
  referencing `Component` rows first, 409 with the count in the message if any
  exist, never a bare foreign-key-violation 500).
- `apps/web/app/api/components/categories/route.ts`: added `POST` (role-gated,
  `{ key (regex-enforced UPPER_SNAKE_CASE), label, sortOrder }`, 409 on duplicate
  key). Comment reiterates ARCHITECTURE.md §4.3: a new key with no matching
  `@pcbuilder/component-models` schema just falls back to the generic permissive
  schema — nothing else needs to change for the category to accept components.
- `apps/web/app/api/components/categories/[id]/route.ts` (new): `PATCH`
  (`{ label?, sortOrder? }` only — `key` is deliberately NOT patchable, since
  component-models' registry and every existing `Component` row key off of it) and
  `DELETE` (same in-use-count guard pattern as brands).
- `apps/web/app/admin/brands/page.tsx` + `brand-form.tsx` (create) +
  `brand-row-actions.tsx` (inline rename toggle, delete disabled with a
  tooltip when `componentCount > 0`) — all new.
- `apps/web/app/admin/categories/page.tsx` + `category-form.tsx` (create, key
  auto-uppercased as typed) + `category-row-actions.tsx` (inline label/sortOrder
  edit, delete disabled when in use) — all new.
- `apps/web/app/admin/page.tsx`: added "Brands"/"Categories" nav links next to
  "New component"; swapped the plain stock-quantity cell for `<StockCell>`;
  updated the trailing "lands in a later milestone" note to point at CSV
  import/export + 3D asset manager (Milestones 5-6) instead of this milestone's
  now-done scope.

**Verification (live API calls first, then a Playwright browser pass for the UI
pieces the API calls can't cover):**
- Registered + promoted a test admin (`stock-check@example.com`).
- Brands: created "TestBrandXYZ" via `POST /api/brands` → renamed to
  "TestBrandRenamed" via `PATCH` → deleted it (0 components, succeeded, 200).
  Then attempted `DELETE` on the real seeded "AMD" brand (1 component) → correctly
  409'd.
- Categories: created a real "HDD" / "Hard Drive" / sortOrder 200 category via
  `POST` → relabeled it to "Hard Disk Drive" / sortOrder 205 via `PATCH` (confirmed
  both fields changed) → deleted it (0 components, succeeded). Then attempted
  `DELETE` on the real seeded "CPU" category (2 components) → correctly 409'd.
- Inventory: set the Intel CPU's stock to 42 via `POST /api/inventory/update`,
  confirmed via `GET /api/components/:id` that `inventory.stockQuantity` read back
  as 42, then reverted to 25.
- Playwright: logged in as the test admin, screenshotted `/admin/brands` (correct
  Delete disabled/enabled states matching real component counts) and
  `/admin/categories` (all 12 categories listed with correct counts — CPU showing
  2, matching the two seeded CPUs), then on the dashboard used the inline
  `StockCell` to set NZXT H510's stock to 77 and confirmed via a screenshot that
  the saved value (77) persisted and the component now appeared at the top of
  "Recently updated."
- **Found and cleaned up a leftover from Milestone 3's own testing**: a
  "TestBrand" row with 0 components, created implicitly by the Milestone 3
  Playwright test's `brandName` field and never removed since deleting the test
  Component doesn't cascade-delete the Brand it referenced. Deleted it this
  session. (Worth remembering: brand/category rows created incidentally during
  future test runs won't auto-clean themselves either — check for stragglers.)
- Reverted the H510 stock change back to 25 and deleted the test admin user
  afterward; confirmed via direct SQL that all 7 seeded components show
  `stockQuantity = 25` again.
- `pnpm typecheck` (9/9), `pnpm --filter web run lint` (clean), and `pnpm build`
  (6/6, all 18 routes listed, same pre-existing cosmetic `export *` Turbopack
  warning as before — not new, not fixed, not blocking) all pass.

FILES CREATED:
- apps/web/app/api/inventory/update/route.ts
- apps/web/app/api/brands/route.ts, apps/web/app/api/brands/[id]/route.ts
- apps/web/app/api/components/categories/[id]/route.ts
- apps/web/app/admin/stock-cell.tsx
- apps/web/app/admin/brands/page.tsx, brand-form.tsx, brand-row-actions.tsx
- apps/web/app/admin/categories/page.tsx, category-form.tsx, category-row-actions.tsx

FILES MODIFIED:
- apps/web/app/api/components/categories/route.ts (added POST)
- apps/web/app/admin/page.tsx (nav links, StockCell wiring, updated footer note)
- docs/API.md (documented the 5 new routes, trimmed the "planned" table),
  project-management/DEVELOPMENT_ROADMAP.md, project-management/TODO.md,
  project-management/CURRENT_PHASE.md, project-management/PROJECT_STATUS.md,
  project-management/CHANGELOG.md (this checkpoint's sibling docs)

DATABASE CHANGES: none to the schema. (Throwaway brand/category rows and a stock
value change during testing, all reverted/deleted afterward.)

API CHANGES: `POST /api/inventory/update`, `GET`/`POST /api/brands`,
`PATCH`/`DELETE /api/brands/:id`, `POST /api/components/categories`,
`PATCH`/`DELETE /api/components/categories/:id` — five new routes, all
role-gated except the brands GET (public, matches the components-list route's
public-read pattern).

FRONTEND CHANGES: `/admin/brands`, `/admin/categories` (new pages); dashboard rows
now have an inline-editable stock cell.

3D ENGINE CHANGES: none — packages/three-d-engine is still an empty stub.

KNOWN ISSUES: none new this session. (Carried over, unchanged: orphaned storage
objects on component delete; the cosmetic `export *` build warning.)

TEST STATUS: no new automated tests this session (CRUD/UI wiring again, verified
live rather than with unit tests — same reasoning as Milestones 2, 3, and 5).
`packages/component-models`'s 34 tests from Milestone 1 still pass.

NEXT STEP: When the user says "Continue": re-read this file + PROJECT_STATUS.md +
CURRENT_PHASE.md + TODO.md, confirm `pnpm install && pnpm build` still passes and
Postgres is running, then implement Phase 2, Milestone 5 (CSV import/export for
bulk inventory operations). Before writing parsing code, worth deciding (ask the
user if unclear) how `specifications` should be represented in a CSV cell — the
natural choice is a single JSON-encoded string per row, validated the same way as
the JSON API body via `@pcbuilder/component-models`'s `validateSpecifications`, but
confirm this doesn't conflict with any expectation the user has for how the CSV
should look (e.g. if they want one column per common spec field instead — that
would be a materially different, more complex design). Stop at that checkpoint
rather than also building the 3D asset manager (Milestone 6) in the same session.

EXACT COMMANDS TO RUN THE PROJECT LOCALLY:
  pnpm install
  pnpm dev                     # apps/web on http://localhost:3000

Try it: `/admin/brands` and `/admin/categories` for the new management screens;
the dashboard's stock numbers are now inline-editable (click into the box, change
the number, a "Save" link appears).

One-time per machine / after a fresh clone (all already done on this machine):
  cp packages/database/.env.example packages/database/.env
  pnpm --filter @pcbuilder/database run db:migrate
  pnpm --filter @pcbuilder/database run db:seed
  cp apps/web/.env.example apps/web/.env.local   # fill in DATABASE_URL + generate NEXTAUTH_SECRET; S3_* only needed for image upload

Other root scripts: `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test`.

Local Postgres on THIS machine: native Windows service `postgresql-x64-17` on
localhost:5432, superuser `postgres`/`postgres`, app role `pcbuilder`/`pcbuilder`
owning database `pcbuilder`. SeaweedFS (image upload only, not needed for this
milestone's work) is NOT running — see docs/DEVELOPMENT.md to start it if needed.

PATH note (still applies): if `node`/`pnpm`/`npm`/`psql` report "not recognized" in a
fresh shell, prepend, e.g. in PowerShell:
  $env:Path += ";C:\Program Files\nodejs;$env:APPDATA\npm;C:\Program Files\PostgreSQL\17\bin"
