SESSION DATE: 2026-09-12

CURRENT PHASE: Phase 2 COMPLETE (all 6 milestones). Next: Phase 3 — Compatibility
Engine & Power Calculation.

CURRENT TASK: None in progress — awaiting user instruction for Phase 3, Milestone 1
(`packages/compatibility-engine` scaffold).

LAST COMPLETED STEP: Phase 2, Milestone 6 (3D asset manager — the final Phase 2
milestone), fully verified against the live dev server.

- `apps/web/lib/storage.ts`: added `ALLOWED_MODEL_CONTENT_TYPES` (`model/gltf-binary`,
  `model/gltf+json`, `application/octet-stream` — the last one because browsers
  almost never report a real MIME type for `.glb`) and `MAX_MODEL_UPLOAD_BYTES`
  (50MB, vs. 10MB for images). `buildAssetKey()` now takes a `prefix` param
  (`"components"` default, `"models"` for 3D assets) so uploaded models land under
  a `models/` key prefix instead of mixed in with images.
- `apps/web/app/api/assets/route.ts`: generalized to accept an optional
  `purpose: "image" | "model"` field (default `"image"`), selecting the matching
  content-type allowlist and key prefix. Same route now serves both the Milestone
  3 image-upload flow and this milestone's model-upload flow — no duplicate route.
- `apps/web/lib/threeDAssets.ts` (new): `PROCEDURAL_GENERATORS` — the 10 generator
  names ARCHITECTURE.md §7.3 documents (`createGenericCPU`, `createGenericGPU`,
  etc.) — and `DEFAULT_GENERATOR_BY_CATEGORY` (a suggested default per category
  key, not enforced). None of these functions exist yet
  (`packages/three-d-engine` is an empty stub until Phase 4) — recording which
  generator a component should use is a data decision the admin can make now,
  same pattern as categories existing before their Zod schema does.
- `apps/web/app/api/components/[id]/asset/route.ts` (new): `PUT`, role-gated. Zod
  schema with `.refine()` cross-field checks: `url` required when `kind ===
  "GLTF_MODEL"`, `proceduralGeneratorKey` required when `kind ===
  "PROCEDURAL_FALLBACK"`. Upserts — finds the component's existing `ThreeDAsset`
  (by `componentId`, taking the first if one exists) and updates it, or creates
  one if none exists. Full `PUT` replace semantics: fields not in the body are
  cleared (set to `null`), not left alone — confirmed this is what actually
  happened when testing (switching kinds without re-sending license/attribution
  cleared them, which is correct for `PUT`, not a bug).
- `apps/web/app/admin/components/[id]/asset/page.tsx` + `asset-form.tsx` (new):
  server component fetches the component + its existing `threeDAssets[0]`; client
  form lets the admin pick `kind` (select), and conditionally shows either a
  generator dropdown (`PROCEDURAL_FALLBACK`) or a file input wired to the same
  upload-then-PUT flow as component images, just with `purpose: "model"` and
  `.glb`/`.gltf` accept filter (`GLTF_MODEL`). Common fields:
  source/licenseInfo/attribution/usageRights.
- `apps/web/app/admin/page.tsx`: added a "3D Asset" link next to Edit/Delete in
  every dashboard table row.

**Verification — live API test first, then a real GLB-shaped upload, then a
Playwright UI pass:**
- Registered + promoted a test admin, found an existing component (Intel CPU) with
  its seeded `PROCEDURAL_FALLBACK` asset already in place.
- Requested a model upload URL (`purpose: "model"`), PUT 8 real bytes (a fake
  `glTF` magic-number header) to it — 200. Confirmed the object is publicly
  readable afterward (200, exactly 8 bytes back).
- `PUT` the component's asset to `kind: "GLTF_MODEL"` with that URL plus
  source/licenseInfo/attribution/usageRights — 200, response reflects everything
  correctly, and critically the returned `id` was the SAME as the pre-existing
  seeded asset's id (`seed-asset-CPU-INTEL-13600K`) — confirming upsert, not a
  duplicate row.
- Confirmed validation: `PUT` with `kind: "GLTF_MODEL"` and no `url` → 400.
- Switched back to `kind: "PROCEDURAL_FALLBACK"` with `proceduralGeneratorKey:
  "createGenericCPU"` — 200, and confirmed via `GET /api/components/:id` that
  exactly ONE `ThreeDAsset` row still exists for the component (not two) — the
  same row had been updated twice, not duplicated.
- Playwright: logged in, navigated to a component's asset page via the new "3D
  Asset" dashboard link, confirmed the initial state shows `PROCEDURAL_FALLBACK`
  with the generator dropdown visible, switched the kind selector to
  `GLTF_MODEL` and confirmed the generator dropdown disappears and the file
  input appears — screenshotted both states.
- Cleaned up: reverted the test CPU's asset back to its exact original seeded
  state (already matched after the PROCEDURAL_FALLBACK switch — no extra revert
  needed), deleted the test admin user, removed the two throwaway Node/Playwright
  scripts.
- **SeaweedFS environment note for future sessions:** hit two real gotchas
  restarting it this session (documented in `docs/DEVELOPMENT.md`'s
  troubleshooting section): (1) starting it via `Start-Process -ArgumentList`
  with the `-s3.config` path as a separate unquoted array element truncates the
  path at the first space (this machine's profile path has one — `Jassim
  Shaji`) — fix is one array element with embedded literal quotes around the
  path; (2) after that failure the process got stuck in an endless raft
  leader-election retry loop even once restarted correctly, because its
  persisted single-node state in `-dir` referenced a different self-discovered
  IP than the one it was being started with — fix was wiping the data directory
  (safe, it's just local dev object storage) and restarting fresh.
- `pnpm typecheck` (9/9), `pnpm --filter web run lint` (clean), and `pnpm build`
  (6/6, 22 routes total including the two new ones) all pass.

FILES CREATED:
- apps/web/lib/threeDAssets.ts
- apps/web/app/api/components/[id]/asset/route.ts
- apps/web/app/admin/components/[id]/asset/page.tsx, asset-form.tsx

FILES MODIFIED:
- apps/web/lib/storage.ts (model content types/size limit, prefix-aware buildAssetKey)
- apps/web/app/api/assets/route.ts (purpose: "image" | "model")
- apps/web/app/admin/page.tsx ("3D Asset" link)
- docs/API.md (documented PUT /api/components/:id/asset, updated POST /api/assets'
  doc for the purpose field — removed the now-stale duplicate section from
  Milestone 3), docs/DEVELOPMENT.md (SeaweedFS troubleshooting notes for the two
  gotchas above), project-management/DEVELOPMENT_ROADMAP.md,
  project-management/TODO.md, project-management/CURRENT_PHASE.md,
  project-management/PROJECT_STATUS.md, project-management/CHANGELOG.md (this
  checkpoint's sibling docs)

DATABASE CHANGES: none to the schema. (One component's `ThreeDAsset` was
temporarily switched to `GLTF_MODEL` and back to its original
`PROCEDURAL_FALLBACK` state during testing — ended up byte-for-byte identical to
where it started.)

API CHANGES: `PUT /api/components/:id/asset` (new); `POST /api/assets` extended
(backward compatible — `purpose` defaults to `"image"`, so existing image-upload
callers are unaffected).

FRONTEND CHANGES: `/admin/components/:id/asset` (new page); dashboard tables gained
a "3D Asset" action link.

3D ENGINE CHANGES: none — `packages/three-d-engine` is still an empty stub. (The
generator names now recorded per component are forward references to functions
that land in Phase 4.)

KNOWN ISSUES: none new. (Carried over, unchanged: orphaned storage objects on
component delete; the cosmetic Turbopack `export *` build warning.)

TEST STATUS: no new automated tests this session — verified via live API calls, a
real presigned-upload round trip, and a Playwright UI pass, which is the right
verification method for this kind of upload/upsert wiring.
`packages/component-models`'s 34 tests still pass.

**PHASE 2 IS NOW COMPLETE.** All 6 milestones (component-models, admin inventory
dashboard, admin CRUD + image upload, stock/brand/category management, CSV
import/export, 3D asset manager) are done and verified.

NEXT STEP: When the user says "Continue": re-read this file + PROJECT_STATUS.md +
CURRENT_PHASE.md + TODO.md, confirm `pnpm install && pnpm build` still passes and
Postgres is running, then start PHASE 3 (Compatibility Engine & Power Calculation),
Milestone 1: `packages/compatibility-engine` scaffold — `CompatibilityResult`/
`CompatibilityReport`/`Severity` types per ARCHITECTURE.md §6, and the
`runCompatibilityCheck()` entry point shape, ahead of writing the actual rules
(Milestone 2: CPU↔socket, RAM↔motherboard, GPU↔case clearance, case↔form factor,
cooling↔socket/mount, storage interface) and the power calculator (Milestone 3).
This phase explicitly requires full Vitest test coverage on every rule — not
optional, per the project brief — so budget for writing real tests alongside the
rules, not as an afterthought. Stop at the scaffold checkpoint rather than also
writing the rules in the same session. Also worth a quick skim of the other
project-management docs sometime soon, given the DECISIONS.md corruption found and
fixed this session — confirm nothing else has quietly drifted.

EXACT COMMANDS TO RUN THE PROJECT LOCALLY:
  pnpm install
  pnpm dev                     # apps/web on http://localhost:3000

One-time per machine / after a fresh clone (all already done on this machine):
  cp packages/database/.env.example packages/database/.env
  pnpm --filter @pcbuilder/database run db:migrate
  pnpm --filter @pcbuilder/database run db:seed
  cp apps/web/.env.example apps/web/.env.local   # fill in DATABASE_URL + generate NEXTAUTH_SECRET; S3_* only needed for image/model upload

Other root scripts: `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test`.

Local Postgres on THIS machine: native Windows service `postgresql-x64-17` on
localhost:5432, superuser `postgres`/`postgres`, app role `pcbuilder`/`pcbuilder`
owning database `pcbuilder`. SeaweedFS is NOT running (stopped at end of session) —
see docs/DEVELOPMENT.md (including its new troubleshooting notes) to restart it if
a future session needs image/model upload to work; not needed for Phase 3.

PATH note (still applies): if `node`/`pnpm`/`npm`/`psql` report "not recognized" in a
fresh shell, prepend, e.g. in PowerShell:
  $env:Path += ";C:\Program Files\nodejs;$env:APPDATA\npm;C:\Program Files\PostgreSQL\17\bin"
