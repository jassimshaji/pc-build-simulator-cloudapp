SESSION DATE: 2026-09-12

CURRENT PHASE: Phase 2 — Component Inventory System (Milestone 5 of 6 complete)

CURRENT TASK: None in progress — awaiting user instruction for Milestone 6 (3D asset
manager, the last Phase 2 milestone).

LAST COMPLETED STEP: Phase 2, Milestone 5 (CSV import/export), fully verified — and
along the way, found and fixed a real pre-existing data bug plus a real pre-existing
documentation corruption, neither introduced this session.

**CSV import/export implementation:**
- `apps/web/lib/csv.ts` (new): `CSV_COLUMNS` (sku, categoryKey, brandName, model,
  price, description, images, isAvailable, stockQuantity, lowStockThreshold,
  specifications), `componentToCsvRow()`, and `parseCsvRow()` (throws a plain
  `Error` with a human-readable message on any problem — the import route catches
  this per-row). `images` and `specifications` are JSON-encoded into a single CSV
  cell each — decided without needing to ask the user, since it's a technical
  encoding question with a clear answer (mirrors exactly what the JSON API already
  accepts for these fields, so a round trip through export → hand-edit → import
  goes through the same validation path either way).
- `apps/web/app/api/components/export/route.ts` (new): `GET`, role-gated, streams
  every component (available or not) as `Papa.unparse`'d CSV with
  `Content-Disposition: attachment`.
- `apps/web/app/api/components/import/route.ts` (new): `POST`, role-gated, reads a
  `multipart/form-data` `file` field, `Papa.parse`s it, upserts by SKU (existing →
  `update`, re-validating `specifications` and recomputing hot fields; new →
  `create` + `Inventory` row). Deliberately NOT one all-or-nothing transaction —
  each row is processed independently and a bad one is collected into a `failed`
  array (`{ row, sku?, error }`, 1-indexed counting the header as row 1) rather than
  aborting the whole file.
- `apps/web/app/admin/import-export/page.tsx` + `import-export-panel.tsx` (new):
  an "Export CSV" download link (plain `<a href>` to the API route — deliberately
  NOT `next/link`, since it triggers a file download rather than a page
  navigation; added an eslint-disable comment explaining why, to stop the
  `@next/next/no-html-link-for-pages` rule) and a file-input "Import" flow showing
  a created/updated/failed summary. Linked from `/admin`'s nav row.
- Added `papaparse` + `@types/papaparse` to `apps/web`.

**Verification — and what it surfaced:**
- Live-tested export → download → hand-edit (via a throwaway Node script, not
  PowerShell — PowerShell 5.1's string handling on Windows kept mangling the CSV
  content across multiple attempts, so a Node script doing the whole
  login→export→append→import round trip in one process was more reliable) → adding
  one new valid row (a Monitor... actually SSD row) and one deliberately-broken row
  (bad category key) → re-import.
- **Debugging detour, root-caused and fixed in the TEST SCRIPT (not the app):** the
  first re-import attempt failed with cryptic PapaParse "Trailing quote malformed"
  errors. Root cause: `Papa.unparse` defaults to CRLF (`\r\n`) line endings, but my
  test script appended new rows with plain `\n` — the resulting mixed-line-ending
  file confused PapaParse's tokenizer in a way that looked like a data corruption
  bug but wasn't. Fixed by matching CRLF in the appended test rows. Worth
  remembering: a hand-built CSV for testing needs consistent line endings matching
  whatever produced the rest of the file.
- **After fixing the test script, the SAME re-import attempt failed again — this
  time for a real reason:** 6 of the 7 real seeded components failed
  `validateSpecifications` with errors like `"socket": "expected string, received
  undefined"`. This is a genuine pre-existing bug, not caused by this session's
  CSV work — `packages/database/prisma/seed.ts` (written in Phase 1, Milestone 2,
  before `@pcbuilder/component-models` existed) had set hot-column values
  (`socket`, `tdpWatts`, `formFactor`, `ramType`, `pcieGeneration`,
  `lengthMm`/`widthMm`/`heightMm`, `wattage`) as separate literal Prisma fields
  alongside a `specifications` object that, for CPU/GPU/Motherboard/PSU/RAM, never
  included those same fields — contradicting ADR-002's own stated design (hot
  columns are promoted *in addition to* full data in `specifications`, not instead
  of it). Nothing had caught this before because nothing had re-validated the seed
  data against the real schemas since they didn't exist yet when seed.ts was
  written.
- **Fixed at the root:** rewrote `seed.ts` so every component's `specifications`
  object is the complete, schema-correct spec, then derives hot columns via the
  SAME `validateSpecifications()`/`extractHotFields()` functions
  `POST /api/components` uses — no more hand-duplicated literals. Added
  `@pcbuilder/component-models` as a dependency of `@pcbuilder/database` for this.
  **Also fixed the upsert itself**: the `update` branch was previously a no-op
  `{}`, meaning even a corrected seed script would have silently failed to fix
  already-seeded rows — changed it to mirror `create`, so re-running the seed
  against a live database actually corrects drifted data. Ran `pnpm --filter
  @pcbuilder/database run db:seed` against the live (already-seeded) database;
  confirmed via direct SQL (`specifications->'socket'` now returns `"AM5"` etc.
  where it previously didn't exist) and via a second CSV round-trip that all 7
  real components — plus the throwaway new SSD row — now import cleanly (only the
  deliberately-broken row still fails, as intended).
- Cleaned up afterward: deleted the throwaway SSD test component and its Inventory
  row, deleted the test user, removed the two ad hoc Node test scripts.
- `pnpm typecheck` (9/9), `pnpm build` (6/6, `/api/components/export` and
  `/api/components/import` listed), and `pnpm test` (component-models' 34 tests
  still pass) all pass.

**Unrelated documentation fix found and repaired this session:** while adding
ADR-009 for the seed-data bug, discovered `project-management/DECISIONS.md` was
already corrupted from an earlier session — ADR-007's heading ("## ADR-007:
next-auth v4...") had been lost, with its body text instead merged onto the tail
end of ADR-008's last paragraph (readable as "...frequent part of the dev
loop.: next-auth v4 (not v5), and no Prisma adapter..."), and the whole ADR-007
section ended up positioned AFTER ADR-008 instead of before it. The actual ADR-007
content was intact and correct, just missing its heading and misplaced. Rewrote the
whole file with ADR-007 restored to its proper heading/position between ADR-006 and
ADR-008, then appended ADR-009. Worth a quick skim of DECISIONS.md next session to
confirm nothing else looks off, since this wasn't caught for at least 2-3 sessions.

FILES CREATED:
- apps/web/lib/csv.ts
- apps/web/app/api/components/export/route.ts
- apps/web/app/api/components/import/route.ts
- apps/web/app/admin/import-export/page.tsx, import-export-panel.tsx

FILES MODIFIED:
- apps/web/app/admin/page.tsx (Import/Export nav link)
- apps/web/package.json (papaparse, @types/papaparse)
- packages/database/package.json (added @pcbuilder/component-models dependency)
- packages/database/prisma/seed.ts (specifications as single source of truth, hot
  columns derived via extractHotFields, update branch mirrors create)
- docs/API.md (documented the two new routes), docs/DATABASE.md (seed data section
  rewritten to explain the derive-don't-duplicate pattern and why),
  project-management/DECISIONS.md (repaired ADR-007, added ADR-009),
  project-management/DEVELOPMENT_ROADMAP.md, project-management/TODO.md,
  project-management/CURRENT_PHASE.md, project-management/PROJECT_STATUS.md,
  project-management/CHANGELOG.md (this checkpoint's sibling docs)

DATABASE CHANGES: `specifications` corrected (in place, via re-running the seed —
not a migration) for CPU-AMD-7800X3D, CPU-INTEL-13600K, MB-ASUS-B650A,
GPU-NVIDIA-RTX4070, RAM-CORSAIR-VENGEANCE-32GB-DDR5, PSU-SEASONIC-FOCUS-850 (6 of
the 7 seeded components — CASE-NZXT-H510 was already correct). No schema/migration
changes.

API CHANGES: `GET /api/components/export`, `POST /api/components/import` — both new.

FRONTEND CHANGES: `/admin/import-export` (new page).

3D ENGINE CHANGES: none — packages/three-d-engine is still an empty stub.

KNOWN ISSUES: none new. (Carried over, unchanged: orphaned storage objects on
component delete; the cosmetic Turbopack `export *` build warning.)

TEST STATUS: no new automated tests this session — this milestone's correctness
(including the seed-data bug) was found and confirmed via live export/import round
trips against the real server and real database, which is exactly the kind of
integration-level issue a unit test wouldn't have caught anyway (it was a data
problem, not a logic problem). `packages/component-models`'s 34 tests still pass.

NEXT STEP: When the user says "Continue": re-read this file + PROJECT_STATUS.md +
CURRENT_PHASE.md + TODO.md, confirm `pnpm install && pnpm build` still passes and
Postgres is running, then implement Phase 2, Milestone 6 (3D asset manager — the
last Phase 2 milestone): an admin UI to upload a GLTF/GLB file per component (via
the same presigned-URL pattern as image upload in `apps/web/lib/storage.ts`,
extended to accept model MIME types / file extensions), assign/change a
`ThreeDAsset`'s `kind` (`GLTF_MODEL`/`PROCEDURAL_FALLBACK`/`PLACEHOLDER`) and
`proceduralGeneratorKey`, and record `source`/`licenseInfo`/`attribution`/
`usageRights`. See ARCHITECTURE.md §7.3 for the asset-resolution design this feeds.
After this milestone, Phase 2 is complete and Phase 3 (compatibility engine) is
next — that'll be a good point to also do a broader sanity pass over
project-management docs given the DECISIONS.md corruption found this session.

EXACT COMMANDS TO RUN THE PROJECT LOCALLY:
  pnpm install
  pnpm dev                     # apps/web on http://localhost:3000

Try it: `/admin/import-export` — "Export CSV" downloads the current catalog;
re-upload it (or a hand-edited copy) via the file input to see the import summary.

One-time per machine / after a fresh clone (all already done on this machine):
  cp packages/database/.env.example packages/database/.env
  pnpm --filter @pcbuilder/database run db:migrate
  pnpm --filter @pcbuilder/database run db:seed
  cp apps/web/.env.example apps/web/.env.local   # fill in DATABASE_URL + generate NEXTAUTH_SECRET; S3_* only needed for image upload

Other root scripts: `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test`.

Local Postgres on THIS machine: native Windows service `postgresql-x64-17` on
localhost:5432, superuser `postgres`/`postgres`, app role `pcbuilder`/`pcbuilder`
owning database `pcbuilder`. SeaweedFS (image upload only) is NOT running — see
docs/DEVELOPMENT.md to start it if Milestone 6 needs it.

PATH note (still applies): if `node`/`pnpm`/`npm`/`psql` report "not recognized" in a
fresh shell, prepend, e.g. in PowerShell:
  $env:Path += ";C:\Program Files\nodejs;$env:APPDATA\npm;C:\Program Files\PostgreSQL\17\bin"
