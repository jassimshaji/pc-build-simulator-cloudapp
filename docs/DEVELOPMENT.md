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

## Testing strategy

- **Unit tests (Vitest):** `packages/component-models` — implemented (Phase 2,
  Milestone 1): 34 tests across `tests/categories.test.ts` (every category schema,
  valid + invalid cases) and `tests/registry.test.ts` (fallback to the generic
  schema, hot-field extraction per category). Run with
  `pnpm --filter @pcbuilder/component-models test`, or `pnpm test` from the root to
  run every workspace package's tests via Turborepo.
  `packages/compatibility-engine` (every rule must have a test — required by project
  standards, not optional, still pending — Phase 3) and `packages/three-d-engine`
  (procedural generator output dimensions, still pending — Phase 4) are next.
- **Integration/API tests (Vitest):** API route handlers against a test database.
- **Critical UI tests (Playwright, later phase):** register/login, add component to
  build, compatibility warning appears, save/load a build.

Run tests with `pnpm test` (root, runs all workspaces) once configured.

## Code quality rules

TypeScript throughout, Zod validation at every boundary, compatibility logic
centralized in `packages/compatibility-engine` only, 3D rendering logic modular in
`packages/three-d-engine`, no premature abstractions. See the root `AGENTS`/project
brief quality rules for the full list — these are enforced by convention and code
review, not currently by a custom lint rule.
