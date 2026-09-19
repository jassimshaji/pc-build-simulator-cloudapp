# Development Guide

## Local setup (current — Phase 1, Milestone 1 scope)

Requires Node.js 20+ (LTS) and pnpm (`corepack enable` or `npm i -g pnpm`).

```
pnpm install
pnpm dev              # runs apps/web via Turborepo -> http://localhost:3000
```

Other root scripts: `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test` — each
runs across every workspace package via Turborepo.

`apps/web` is a real app (auth, admin CRUD, component APIs — see below).
`packages/database` and `packages/component-models` have real code;
`packages/compatibility-engine`, `packages/three-d-engine`, and `packages/shared`'s
non-`apiResponse` parts are still stubs pending Phases 3-4.

## Database (Phase 1, Milestone 2 — done)

Requires a local Postgres (either `docker compose -f docker/docker-compose.yml up -d`,
or a natively installed server). See `docs/DATABASE.md` for full schema/setup detail.

```
cp packages/database/.env.example packages/database/.env   # adjust DATABASE_URL if needed
pnpm --filter @pcbuilder/database run db:migrate   # apply migrations (creates a shadow DB — role needs CREATEDB)
pnpm --filter @pcbuilder/database run db:seed      # seed categories/brands/components
pnpm --filter @pcbuilder/database run db:studio    # optional: browse data in Prisma Studio
```

## Auth (Phase 1, Milestone 3 — done)

`apps/web` needs its own env file (Next.js reads env vars from the app's own
directory, not the monorepo root):

```
cp apps/web/.env.example apps/web/.env.local
# then fill in DATABASE_URL (same as packages/database/.env) and generate NEXTAUTH_SECRET:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Then `pnpm dev` and visit `/register` to create an account, `/login` to sign in, `/`
shows session state, `/admin` is gated to `ADMIN`/`INVENTORY_MANAGER` roles (redirects
everyone else). To promote a user to admin for local testing (no admin UI yet):

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'you@example.com';
```

## Object storage / image uploads (Phase 2, Milestone 3 — done)

Component image uploads need an S3-compatible object store. Production targets
Cloudflare R2 (ARCHITECTURE.md §8); locally this runs against a self-hosted
**SeaweedFS** server (open-source, actively maintained — MinIO's community server
was discontinued as of this writing, see `project-management/DECISIONS.md` ADR-008).

One-time setup (Windows; no package manager has it, so this is a manual binary
download):

```powershell
New-Item -ItemType Directory -Force -Path "C:\seaweedfs"
Invoke-WebRequest -Uri "https://github.com/seaweedfs/seaweedfs/releases/latest/download/windows_amd64.zip" -OutFile "C:\seaweedfs\windows_amd64.zip"
Expand-Archive -Path "C:\seaweedfs\windows_amd64.zip" -DestinationPath "C:\seaweedfs" -Force
```

Every dev session, start it before `pnpm dev` if you need image upload to work
(nothing else in the app depends on it being up):

```powershell
& "C:\seaweedfs\weed.exe" server `
  -dir=C:\seaweedfs\data `
  -s3 -s3.port=8333 `
  -s3.config="<repo-path>\infrastructure\seaweedfs\s3-config.json" `
  -s3.autoCreateBucket=true `
  -ip=127.0.0.1 -master.port=9333 -volume.port=8080 -filer.port=8888
```

`apps/web/.env.local` needs the matching `S3_*` vars (see `apps/web/.env.example`) —
already set on this machine to match the config above (`pcbuilder`/`pcbuilderlocaldev`
credentials, bucket `pc-builder-assets`, endpoint `http://127.0.0.1:8333`).

Unlike Postgres (installed as an actual Windows service, always running), SeaweedFS
is a plain background process you start manually — there's no Windows service
registration for it here. If image upload tests fail with a connection error, check
whether `weed.exe` is actually running.

**Troubleshooting — stuck in a raft leader-election loop:** if `weed.err.log` shows
repeating `masterclient.go: ... failed to receive from 127.0.0.1:9333: rpc error:
... Not current leader` and the S3 port never opens, the single-node cluster's
persisted state in `-dir` (`C:\seaweedfs\data`) most likely references a different
IP than the one it's currently being started with (e.g. it previously
self-discovered the machine's LAN IP instead of `127.0.0.1`, or vice versa). Fix:
stop `weed.exe`, delete the contents of `C:\seaweedfs\data`, and restart — it's a
fresh local dev store, safe to reset (re-upload anything you need afterward).

**Troubleshooting — `-s3.config` path with spaces (e.g. under `C:\Users\Some
Name\...`):** when starting `weed.exe` via a script/API rather than typing the
command directly in a terminal (e.g. PowerShell's `Start-Process -ArgumentList`),
an unquoted path containing a space gets truncated at the space by `weed.exe`'s own
flag parser, silently pointing it at the wrong (nonexistent) config file. Wrap the
whole `-s3.config=...` argument in one string with embedded literal double quotes
around the path, e.g. `'-s3.config="C:\Users\Some Name\...\s3-config.json"'` as a
single array element — not `-s3.config=`, `"C:\Users\Some Name\..."` as two.

**Troubleshooting — every presigned upload gets 403 `InvalidAccessKeyId` and the server
log says "Available keys: 0" / ignores `-ip` and the port flags:** the S3 identities were
never loaded because `weed.exe` was silently ignoring flags. On a machine whose user path
contains a space, either (a) pass every path as an 8.3 short name (`C:\Users\ANANDB~1\...`;
get one via `(New-Object -ComObject Scripting.FileSystemObject).GetFolder($path).ShortPath`),
and (b) launch it with `Start-Process -ArgumentList @(...)` rather than the `&` call
operator. If port 8080 is already taken (`Get-NetTCPConnection -State Listen -LocalPort
8080`), use different `-volume.port`/`-filer.port` values (e.g. 9080/9888) — S3 stays on
8333 so `.env.local` doesn't change. A ready-made launcher for this is kept outside the
repo at `%USERPROFILE%\seaweedfs\start-seaweedfs.ps1`.

## Testing strategy

Unit, API-integration and browser layers, all implemented. `pnpm test` (root) runs the
unit and API-integration suites; the browser tests are separate because they build
and start the app.

| Layer | Where | What it covers | Run |
| --- | --- | --- | --- |
| Unit | `packages/component-models` | every category spec schema (valid + invalid), registry fallback, hot-field extraction | `pnpm --filter @pcbuilder/component-models test` |
| Unit | `packages/compatibility-engine` | every compatibility rule + the power calculator (required for every rule) | `pnpm --filter @pcbuilder/compatibility-engine test` |
| Unit | `packages/three-d-engine` | procedural generators, zone generation, placement, asset resolution, build (de)serialization, summary, airflow, estimates, camera state | `pnpm --filter @pcbuilder/three-d-engine test` |
| API integration | `apps/web/tests/*.test.ts` (Vitest) | every route handler against a real Postgres test database: auth matrix (401/403), validation (400), conflicts (409), ownership isolation, sharing, CSV round-trip, uploads | `pnpm --filter web test` |
| Critical UI | `apps/web/e2e/*.spec.ts` (Playwright) | register/login/logout, role gating, adding parts + live compatibility error, save/list/reopen/rename/duplicate/delete a build, sharing + revoking a link | `pnpm --filter web test:e2e` |

### API integration tests

They call the exported route handlers directly (`GET(request)`, `POST(request)`, ...)
with real `Request` objects, against a **separate database** so development data is
never touched. One-time setup (a role with `CREATEDB`, as in DATABASE.md):

```sql
CREATE DATABASE pcbuilder_test OWNER pcbuilder;
```

The default URL is `postgresql://pcbuilder:pcbuilder@localhost:5432/pcbuilder_test`;
override with `TEST_DATABASE_URL`. Before each run, `tests/globalSetup.ts` applies
all migrations and re-runs the seed against that database (both idempotent), so every
test can rely on the seeded catalog (look components up by SKU with
`componentBySku`). Tests create their own users/components with a per-run prefix and
clean them up afterwards.

The only thing replaced is `requireRole` (there is no real next-auth JWT outside a
Next request): the mock in `tests/setup.ts` reproduces its exact 401/403/ok contract
for a session set with `loginAs(user)`. The real implementation has its own test
(`tests/requireRole.test.ts`).

### Browser (Playwright) tests

`playwright.config.ts` builds the app, starts it with `next start` on **port 3100**
(so it never collides with `pnpm dev` on 3000) pointed at the same test database, and
runs the flows in `e2e/`. Locally, `PW_CHANNEL=msedge` uses an installed Edge with no
download; otherwise install Playwright's Chromium once with
`pnpm --filter web exec playwright install chromium`. If a server is already up on
3100 it is reused (handy while iterating: build once, `next start -p 3100`, re-run).

```powershell
$env:PW_CHANNEL = "msedge"   # optional
pnpm --filter web test:e2e
```

### CI

`.github/workflows/ci.yml` runs on every push to `main` and every pull request: a
Postgres 17 service (which creates the test database), install, Prisma generate,
typecheck, lint, all Vitest suites, then the Playwright suite (traces/screenshots
are uploaded as artifacts when it fails).

## Code quality rules

TypeScript throughout, Zod validation at every boundary, compatibility logic
centralized in `packages/compatibility-engine` only, 3D rendering logic modular in
`packages/three-d-engine`, no premature abstractions. See the root `AGENTS`/project
brief quality rules for the full list — these are enforced by convention and code
review, not currently by a custom lint rule.
