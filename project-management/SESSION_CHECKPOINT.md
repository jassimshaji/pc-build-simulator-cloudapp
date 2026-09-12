SESSION DATE: 2026-09-12

CURRENT PHASE: Phase 2 — Component Inventory System (Milestone 3 of 6 complete)

CURRENT TASK: None in progress — awaiting user instruction for Milestone 4 (stock
management + brand/category management).

LAST COMPLETED STEP: Phase 2, Milestone 3 (admin CRUD + image upload), fully
verified via a real browser session against the live dev server.

**Object storage detour (read this before assuming R2/MinIO/anything is set up):**
- No Cloudflare R2 bucket exists. Asked the user how to handle image storage for
  this milestone; they asked for an open-source option. Attempted MinIO (the
  obvious S3-compatible, Windows-binary, open-source choice) — discovered mid-session
  that MinIO's community/open-source server has been discontinued (`dl.min.io`
  returns a 410 Gone archival notice for all downloads; `winget install
  MinIO.Server`/`MinIO.Client` both fail for the same reason). This is very recent
  (2026) and not something knowable in advance.
- Asked the user again; they chose **SeaweedFS** as the replacement (another
  open-source, actively maintained, S3-compatible server). Downloaded
  `windows_amd64.zip` from `github.com/seaweedfs/seaweedfs`'s latest release,
  extracted `weed.exe` to `C:\seaweedfs\weed.exe` (outside the repo — no winget
  package exists for it either, so it's a manual binary like the Postgres/Node
  installs were).
- Wrote `infrastructure/seaweedfs/s3-config.json` (checked into the repo — it's a
  local-dev-only credential, same trust level as the Postgres pcbuilder/pcbuilder
  password already documented in plaintext elsewhere): one `pcbuilder` read/write
  identity, plus an `anonymous` read-only identity so uploaded images are viewable
  via plain URLs without needing signed GET requests.
- Started it with: `weed server -dir=C:\seaweedfs\data -s3 -s3.port=8333
  -s3.config=<path>\infrastructure\seaweedfs\s3-config.json -s3.autoCreateBucket=true
  -ip=127.0.0.1 -master.port=9333 -volume.port=8080 -filer.port=8888`.
- Verified end-to-end with a throwaway Node script using `@aws-sdk/client-s3`
  before writing any app code: created the `pc-builder-assets` bucket, put/got an
  object, confirmed anonymous GET works (200) while anonymous PUT is still
  rejected (403) — matching how a real R2 bucket configured for public read would
  behave.
- **Hit and fixed a real gotcha:** a presigned PUT URL (`getSignedUrl` from
  `@aws-sdk/s3-request-presigner`) failed with `400 BadDigest` against SeaweedFS.
  Root cause: newer `@aws-sdk/client-s3` versions default to embedding a checksum
  (computed from the body at *signing* time, which is empty/unknown for a
  not-yet-uploaded file) into the presigned URL's query string, which then can't
  match whatever bytes the client actually PUTs later. Fixed by setting
  `requestChecksumCalculation: "WHEN_REQUIRED"` on the `S3Client` constructor
  (`apps/web/lib/storage.ts`). This is a general AWS SDK v3 gotcha, not
  SeaweedFS-specific — would hit the same thing against real S3/R2.
- All of this is written up as ADR-008 in `project-management/DECISIONS.md` and in
  `docs/DEVELOPMENT.md`'s new "Object storage / image uploads" section (exact
  install + per-session start commands), since a future session/machine will need
  to redo the manual binary install (no automated way to detect "SeaweedFS isn't
  running" other than image uploads failing to connect).

**Application code:**
- `apps/web/lib/storage.ts` (new): S3 client configured entirely from env vars
  (`S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`,
  `S3_BUCKET_NAME`, `S3_PUBLIC_URL`, `S3_FORCE_PATH_STYLE`) — swapping to real R2
  in production is a config change, not a code change. Exports
  `ALLOWED_IMAGE_CONTENT_TYPES`, `MAX_UPLOAD_BYTES` (advisory only — presigned PUT
  can't enforce a byte limit the way presigned POST conditions could; acceptable
  since uploads are admin-only, documented as a known limitation), `buildAssetKey`,
  `createUploadUrl`, `getPublicAssetUrl`.
- `apps/web/app/api/assets/route.ts` (new): `POST`, role-gated, Zod-validates
  `{filename, contentType}` against the allowed image MIME types, returns
  `{uploadUrl, publicUrl, key}`.
- `apps/web/app/api/components/route.ts`: added `POST` (create) — validates the
  shared fields itself, delegates `specifications` validation entirely to
  `@pcbuilder/component-models`'s `validateSpecifications(categoryKey, ...)`,
  derives hot columns via `extractHotFields`, upserts the brand by name, 409s on a
  duplicate SKU, auto-creates a zero-stock `Inventory` row alongside the component.
- `apps/web/app/api/components/[id]/route.ts`: added `PATCH` (partial update;
  category/SKU immutable; re-validates + re-derives hot fields only if
  `specifications` is included) and `DELETE` (catches Prisma's `P2003` foreign-key
  violation as a friendly 409 rather than a raw 500 — currently unreachable since no
  builds exist yet, but handled for when Phase 5 adds them).
- `apps/web/lib/zod-form.ts` (new): the real engineering centerpiece of this
  milestone. Introspects a Zod v4 object schema into a flat `FieldDescriptor[]`
  (name/kind/required/enumOptions/defaultValue/children-for-nested-objects) and
  converts submitted form values back into a plausible specifications object.
  **Verified Zod v4's actual runtime shape empirically with throwaway scripts
  before writing this** (v4 reworked its internals substantially vs. v3): every
  schema exposes `.def.type` as a string discriminator ("string"/"number"/
  "boolean"/"enum"/"array"/"object"/"optional"/"default"/...), and stable *public*
  accessors `.unwrap()` (ZodOptional → inner), `.removeDefault()` (ZodDefault →
  inner, with `.def.defaultValue` as a plain value not a function), `.element`
  (ZodArray → element schema), `.shape` (ZodObject → field map), `.options`
  (ZodEnum → string array) — used those public accessors rather than reaching
  further into `.def` than necessary, for stability against future Zod patch
  releases. Falls back to a plain string field for anything not explicitly
  handled (unions, records like `driveBays`) — those fields are all optional in
  every schema, so leaving them blank in the form still validates fine server-side.
- `apps/web/app/admin/components/component-form.tsx` (new, client component): the
  actual dynamic form. Category select (disabled in edit mode) drives
  `describeSpecSchema(getSpecSchema(categoryKey))` via `useMemo`, re-rendering the
  spec fields whenever category changes. Base fields (SKU/brand/model/price/
  description/available/images) plus the dynamic spec fields, using **uncontrolled**
  inputs read via `new FormData(form)` on submit (deliberate — avoids tracking
  React state per dynamically-changing field, which would be significantly more
  code for no real benefit here). Image upload: file input → `POST /api/assets` →
  PUT the file to the returned `uploadUrl` → push `publicUrl` into local state, with
  a remove button per uploaded image.
- `apps/web/app/admin/components/new/page.tsx` and
  `apps/web/app/admin/components/[id]/edit/page.tsx` (new server components):
  fetch categories (and, for edit, the existing component) directly via Prisma,
  render `<ComponentForm>`. Both re-check `requireRole` themselves (redirect to
  `/login`), same belt-and-suspenders pattern as the existing `/admin` page.
- `apps/web/app/admin/delete-component-button.tsx` (new client component):
  `confirm()` + `DELETE /api/components/:id` + `router.refresh()`.
- `apps/web/app/admin/page.tsx`: added a "New component" link and an Actions column
  (Edit link + delete button) to every `ComponentTable` row.
- Added `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, and
  `@pcbuilder/component-models` (workspace) to `apps/web`'s dependencies.

**Verification — a real Playwright browser session against the live dev server**
(not API-only curl checks, because the actual risk area this milestone was the
dynamic form's client-side behavior):
- Registered + promoted a test admin (`crud-check@example.com`), logged in through
  the real `/login` form.
- Navigated to `/admin/components/new`, selected category "Monitor" (previously
  zero components existed in this category), filled in SKU/brand/model/price and
  every Monitor-specific field (screenSizeInches/resolution/refreshRateHz/
  panelType/etc. — confirmed via a full-page screenshot that all fields render
  correctly, matching `monitorSpecSchema` exactly), uploaded a real 1×1 PNG through
  the actual presigned-URL flow, submitted, confirmed redirect to `/admin`.
- Confirmed the new component appears via the dashboard's search (`?q=`).
- Edited its price through `/admin/components/:id/edit`, confirmed the new price
  persisted by re-opening the edit page and reading the input's value back
  (279.99, not the original 299.99) — and confirmed the uploaded image URL was
  still attached after the edit round-trip.
- Deleted it via the dashboard's Delete button (handled the native `confirm()`
  dialog), confirmed it no longer appears in search afterward.
- **Debugging note for future sessions:** hit Next.js dev mode's classic "slow
  first compile" — the very first Playwright run's `waitForSelector("#sku")`
  timed out at 30s because `/admin/components/new` was compiling for the first
  time; a second run against the same (still-running) dev server succeeded
  instantly because the route was now warmed up server-side. Not a real bug —
  documented here so nobody "fixes" a phantom timeout issue later.
- `pnpm typecheck` (9/9), `pnpm --filter web run lint` (clean), and `pnpm build`
  (6/6, all new routes listed, one pre-existing cosmetic Turbopack warning about
  `export * from "@prisma/client"` in `packages/database/src/index.ts` being CJS —
  not new this session, not blocking, not fixed — could be addressed later by
  listing explicit named exports instead of `export *`) all pass.
- Cleaned up afterward: deleted the test admin user, stopped the dev server and
  SeaweedFS process, removed all scratch scripts/screenshots/test images.

FILES CREATED:
- apps/web/lib/storage.ts, apps/web/lib/zod-form.ts
- apps/web/app/api/assets/route.ts
- apps/web/app/admin/components/component-form.tsx
- apps/web/app/admin/components/new/page.tsx
- apps/web/app/admin/components/[id]/edit/page.tsx
- apps/web/app/admin/delete-component-button.tsx
- infrastructure/seaweedfs/s3-config.json

FILES MODIFIED:
- apps/web/app/api/components/route.ts (added POST), apps/web/app/api/components/[id]/route.ts
  (added PATCH, DELETE), apps/web/app/admin/page.tsx (New component link, Actions column)
- apps/web/package.json (added @aws-sdk/client-s3, @aws-sdk/s3-request-presigner,
  @pcbuilder/component-models)
- apps/web/.env.local, apps/web/.env.example, .env.example (root) — added S3_* vars
- infrastructure/README.md, docs/API.md (documented the 3 new component-mutation
  routes + /api/assets, trimmed the "planned" table), docs/DEVELOPMENT.md (real
  object-storage setup section + corrected two stale paragraphs from earlier
  milestones), project-management/DECISIONS.md (ADR-008),
  project-management/DEVELOPMENT_ROADMAP.md, project-management/TODO.md,
  project-management/CURRENT_PHASE.md, project-management/PROJECT_STATUS.md,
  project-management/CHANGELOG.md (this checkpoint's sibling docs)

DATABASE CHANGES: none to the schema. (One test component created/edited/deleted
during verification, plus one test admin user — both cleaned up afterward.)

API CHANGES: POST /api/components, PATCH /api/components/:id, DELETE
/api/components/:id, POST /api/assets — all new, all role-gated.

FRONTEND CHANGES: `/admin/components/new`, `/admin/components/:id/edit` (new pages);
`/admin` dashboard tables now have Edit/Delete actions and a "New component" link.

3D ENGINE CHANGES: none — packages/three-d-engine is still an empty stub.

KNOWN ISSUES:
- Deleting a component doesn't clean up its uploaded image objects in storage
  (orphaned files) — acceptable for now, not a regression to "fix," just not yet
  built (real systems often handle this via storage lifecycle rules instead).
- `packages/database/src/index.ts`'s `export * from "@prisma/client"` produces a
  cosmetic Turbopack build warning (CJS module, exports only known at runtime) —
  pre-existing, not from this session, not blocking, not fixed.
- SeaweedFS is NOT auto-starting — must be manually started each session that
  needs image upload to actually work (see docs/DEVELOPMENT.md). It was stopped at
  the end of this session.

TEST STATUS: no new automated tests this session (CRUD/UI wiring, verified by a
real Playwright browser session end-to-end instead — appropriate for this kind of
work, same reasoning as Milestones 2 and 5). `packages/component-models`'s 34 tests
from Milestone 1 still pass.

NEXT STEP: When the user says "Continue": re-read this file + PROJECT_STATUS.md +
CURRENT_PHASE.md + TODO.md, confirm `pnpm install && pnpm build` still passes and
Postgres is running (SeaweedFS is NOT required unless testing image upload
specifically), then implement Phase 2, Milestone 4 (stock management + brand/
category management): a faster dedicated stock-quantity-update flow (the edit form
already covers "mark unavailable" via its checkbox — Milestone 4 is about stock
numbers specifically, and standalone brand/category management screens (currently
brands are only created implicitly by typing a new name in the component form, and
categories have no admin UI at all — they're fixed seed data). Stop at that
checkpoint rather than also building CSV import/export (Milestone 5) in the same
session.

EXACT COMMANDS TO RUN THE PROJECT LOCALLY:
  pnpm install
  pnpm dev                     # apps/web on http://localhost:3000

For image upload specifically (not required for most other work):
  & "C:\seaweedfs\weed.exe" server -dir=C:\seaweedfs\data -s3 -s3.port=8333 `
    -s3.config="<repo-path>\infrastructure\seaweedfs\s3-config.json" `
    -s3.autoCreateBucket=true -ip=127.0.0.1 -master.port=9333 -volume.port=8080 -filer.port=8888

One-time per machine / after a fresh clone (all already done on this machine):
  cp packages/database/.env.example packages/database/.env
  pnpm --filter @pcbuilder/database run db:migrate
  pnpm --filter @pcbuilder/database run db:seed
  cp apps/web/.env.example apps/web/.env.local   # fill in DATABASE_URL + generate NEXTAUTH_SECRET; S3_* defaults match infrastructure/seaweedfs/s3-config.json

Other root scripts: `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test`.

Local Postgres on THIS machine: native Windows service `postgresql-x64-17` on
localhost:5432, superuser `postgres`/`postgres`, app role `pcbuilder`/`pcbuilder`
owning database `pcbuilder`.

PATH note (still applies): if `node`/`pnpm`/`npm`/`psql` report "not recognized" in a
fresh shell, prepend, e.g. in PowerShell:
  $env:Path += ";C:\Program Files\nodejs;$env:APPDATA\npm;C:\Program Files\PostgreSQL\17\bin"
