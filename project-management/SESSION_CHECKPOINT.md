SESSION DATE: 2026-09-12

CURRENT PHASE: Phase 1 — Core Cloud Application Foundation (Milestones 1-2 of 5 complete)

CURRENT TASK: None in progress — awaiting user instruction for Milestone 3 (auth).

LAST COMPLETED STEP: Phase 1, Milestone 2 (database schema), fully verified.
- No Docker on this machine, so installed PostgreSQL 17 natively via
  `winget install PostgreSQL.PostgreSQL.17` (runs as a Windows service, no reboot
  needed). Confirmed via `Get-Service postgresql-x64-17` → Running.
- The silent winget install's `postgres` superuser password turned out to be
  literally `postgres` (found by trial, not documented anywhere) — see ADR-006 in
  DECISIONS.md. Created a dedicated `pcbuilder` role (`LOGIN PASSWORD 'pcbuilder'
  CREATEDB` — CREATEDB is required because `prisma migrate dev` creates a shadow
  database to diff against) and a `pcbuilder` database owned by it.
- Wrote `packages/database/prisma/schema.prisma`: full schema per
  ARCHITECTURE.md §4 — `User` (role enum USER/ADMIN/INVENTORY_MANAGER), `Brand`,
  `ComponentCategory` (data table, not enum), `Component` (hybrid relational/JSONB:
  `specifications Json` + promoted hot columns socket/formFactor/ramType/
  pcieGeneration/lengthMm/widthMm/heightMm/tdpWatts/powerDrawWatts/wattage),
  `Inventory` (1:1), `ThreeDAsset` (GLTF_MODEL/PROCEDURAL_FALLBACK/PLACEHOLDER),
  `CompatibilityRule` (admin-visible registry only, no logic in DB),
  `PCBuild`/`BuildComponent`.
- Added `@prisma/client`, `prisma`, `tsx`, `dotenv`, `@types/node` to
  `packages/database`'s package.json. Had to approve pnpm's build-script gate for
  `@prisma/client`/`@prisma/engines`/`esbuild`/`prisma` in `pnpm-workspace.yaml`'s
  `allowBuilds` (all legitimate native-binary postinstall scripts).
- Used Prisma 6's `prisma.config.ts` (not the deprecated `package.json#prisma` field)
  — note this REQUIRES `import "dotenv/config"` at the top, because a config file
  present disables Prisma's automatic `.env` loading. Without that import you get
  "Environment variable not found: DATABASE_URL" even with a valid `.env` file
  sitting right there — non-obvious, worth remembering.
- Ran `prisma migrate dev --name init` against `packages/database/.env`
  (`DATABASE_URL=postgresql://pcbuilder:pcbuilder@localhost:5432/pcbuilder?schema=public`,
  gitignored) — applied cleanly, migration file at
  `packages/database/prisma/migrations/20260912083554_init/migration.sql`.
- Wrote `packages/database/prisma/seed.ts`: seeds all 12 planned
  `ComponentCategory` rows (CPU, MOTHERBOARD, GPU, RAM, SSD, PSU, CASE, AIR_COOLER,
  AIO_COOLER, FAN, MONITOR, CASE_LCD — even ones with zero components yet), 8
  `Brand` rows, 8 `CompatibilityRule` definitions, and 7 real-ish `Component` rows
  (AMD Ryzen 7 7800X3D, Intel Core i5-13600K, ASUS ROG STRIX B650-A, NVIDIA RTX 4070,
  Corsair Vengeance DDR5 32GB, Seasonic Focus GX-850, NZXT H510), each with an
  `Inventory` row and a `PROCEDURAL_FALLBACK` `ThreeDAsset` row naming the (not yet
  implemented) generic generator it'll use. Upsert-based, confirmed idempotent by
  running it twice.
- Verified row counts directly via `psql` (12/8/7/7/7/8 across the six tables) and
  re-ran `pnpm typecheck` + `pnpm build` across the whole workspace (all 6 packages
  pass) — had to add `@types/node` to `packages/database` to fix a `process.env`
  typecheck error in `src/index.ts` first.
- Updated `docs/DATABASE.md` (real schema summary + setup steps), `docs/DEVELOPMENT.md`
  (real DB setup commands), `README.md`, `packages/database/README.md`,
  `DEVELOPMENT_ROADMAP.md`/`TODO.md` (Milestone 2 checked off), and added ADR-006 to
  `DECISIONS.md` documenting the native-Postgres-instead-of-Docker choice and the
  Windows-specific gotchas above.

FILES CREATED:
- packages/database/prisma/schema.prisma
- packages/database/prisma/seed.ts
- packages/database/prisma/migrations/20260912083554_init/migration.sql (+ migration_lock.toml)
- packages/database/prisma.config.ts
- packages/database/.env (gitignored — DATABASE_URL for local pcbuilder role/db)
- packages/database/.env.example
- docker/docker-compose.yml

FILES MODIFIED:
- packages/database/package.json (added prisma/@prisma/client/tsx/dotenv/@types/node,
  db:generate/db:migrate/db:deploy/db:seed/db:studio scripts, removed the deprecated
  package.json#prisma field in favor of prisma.config.ts)
- packages/database/src/index.ts (now exports a singleton PrismaClient instead of
  the empty placeholder)
- pnpm-workspace.yaml (allowBuilds entries for prisma-related native postinstall scripts)
- docs/DATABASE.md, docs/DEVELOPMENT.md, README.md, packages/database/README.md,
  docker/README.md, project-management/DEVELOPMENT_ROADMAP.md,
  project-management/TODO.md, project-management/DECISIONS.md (ADR-006),
  project-management/CURRENT_PHASE.md, project-management/PROJECT_STATUS.md,
  project-management/CHANGELOG.md (this checkpoint's sibling docs)

DATABASE CHANGES: Initial schema created and migrated (see above). Live in a local
PostgreSQL 17 instance on this machine (`pcbuilder` database, `pcbuilder` role).
Production database (Neon) has not been provisioned — that's a later deployment step,
not part of this milestone.

API CHANGES: none yet — no API routes exist in apps/web (Phase 1, Milestone 5).

FRONTEND CHANGES: none this session — apps/web is unchanged from Milestone 1 (still
the default Next.js starter page, does not read from the database).

3D ENGINE CHANGES: none — packages/three-d-engine is still an empty stub. (The seed
data's `proceduralGeneratorKey` values like "createGenericCPU" are forward references
to functions that don't exist yet — that's intentional, Phase 4 work.)

KNOWN ISSUES: none new this session.

TEST STATUS: still no real automated tests anywhere (expected — Phase 3 is where
required test coverage starts, for the compatibility engine). Database correctness
this session was verified manually (migration status, direct SQL row counts, seed
re-run idempotency) rather than via an automated test suite, which is appropriate for
a schema/seed milestone with no business logic yet.

NEXT STEP: When the user says "Continue": re-read this file + PROJECT_STATUS.md +
CURRENT_PHASE.md + TODO.md, confirm `pnpm install && pnpm build` still passes and the
local Postgres service is still running (`Get-Service postgresql-x64-17`), then
implement Phase 1, Milestone 3 (auth): add Auth.js (NextAuth v5) to `apps/web` with
the Credentials provider + Prisma adapter (pointing at `@pcbuilder/database`'s
`prisma` client and the existing `User` model/`Role` enum), register/login pages, JWT
session with a `role` claim, a shared `requireRole()` server helper, and
middleware-protected routes. Stop at that checkpoint rather than also building the
app shell UI (Milestone 4) in the same session.

EXACT COMMANDS TO RUN THE PROJECT LOCALLY:
  pnpm install
  pnpm dev                                              # apps/web on http://localhost:3000

Database (one-time per machine, or after a fresh clone):
  cp packages/database/.env.example packages/database/.env   # already done on this machine
  pnpm --filter @pcbuilder/database run db:migrate
  pnpm --filter @pcbuilder/database run db:seed
  pnpm --filter @pcbuilder/database run db:studio       # optional: browse data

Other root scripts: `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test`.

Local Postgres on THIS machine: native Windows service `postgresql-x64-17` on
localhost:5432, superuser `postgres`/`postgres`, app role `pcbuilder`/`pcbuilder`
owning database `pcbuilder` (CREATEDB granted, needed for Prisma's shadow database).

PATH note (still applies): if `node`/`pnpm`/`npm`/`docker`/`psql` report "not
recognized" in a fresh shell, prepend, e.g. in PowerShell:
  $env:Path += ";C:\Program Files\nodejs;$env:APPDATA\npm;C:\Program Files\PostgreSQL\17\bin"
