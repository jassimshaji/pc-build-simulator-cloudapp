# PC Builder Platform

A cloud-based 3D PC building simulator and component inventory system. Browse a
catalog of real PC parts, assemble a build in an interactive 3D workspace, get live
compatibility and power-draw feedback, see how the case breathes (fan direction,
pressure, airflow) and rough thermal/noise/performance estimates, then save and share
the build. An admin area manages the catalog, stock, and 3D assets.

**Status:** Phases 0-6 are complete — every phase in the roadmap. What remains is
polish and post-MVP ideas (see [Known limitations](#known-limitations)). CI runs
typecheck, lint, all unit/integration tests and the browser tests on every push.
Live status: [`project-management/PROJECT_STATUS.md`](project-management/PROJECT_STATUS.md).

## Features

**For builders**
- **Browse and search** the catalog by category, brand, text and price, with full
  specifications for every part (12 categories: CPU, motherboard, GPU, RAM, SSD, PSU,
  case, air cooler, AIO, fan, monitor, case LCD).
- **3D workspace** (`/workspace`): add a case and it appears immediately; every other
  part is drawn as a procedural model sized from its real specs (or an uploaded
  `.glb`). "Add to build" drops a part into the first free compatible slot, or select a
  part, click a highlighted zone and it snaps there. Orbit / zoom / pan, "Reset view".
- **Live compatibility + power**: 15 rules (CPU socket, RAM type/capacity/modules, GPU
  length/slot width, case form factor, cooler socket/clearance/radiator mount, M.2/SATA
  ports, PSU wattage/connectors) re-check on every change, with an estimated power draw
  and recommended PSU size.
- **Build summary**: component count, total price, power, issue counts, and which
  essentials (CPU, motherboard, RAM, SSD, PSU, case) are still missing.
- **Airflow**: fans mount on the front, rear and top; a normal fan intakes at the front
  and exhausts at the rear/top, a reverse-blade fan flips that. The panel reports net
  CFM and positive / negative / balanced case pressure, and animated particles show each
  fan's direction (toggle "Show airflow").
- **Estimates** (rule-based, clearly labelled rough): CPU/GPU load temperature from
  cooler capacity and case airflow, case-fan noise (dBA, summed logarithmically) and a
  relative 0-100 performance score with CPU/GPU bottleneck detection.
- **Save and manage builds** (`/builds`): save, reopen (including your camera
  viewpoint), rename, duplicate, delete.
- **Share**: turn on sharing to get an unguessable link (`/shared/<slug>`) anyone can
  open in a read-only view — no account needed. Turning sharing off kills the link.
- **Light and dark themes**: a sun/moon toggle in the nav switches the whole UI, including
  the 3D scene's backdrop, grid and airflow colours. Dark is the default; the choice is
  remembered and applied before first paint (no flash).

**For admins** (`ADMIN` / `INVENTORY_MANAGER`, at `/admin`)
- Inventory dashboard: stat tiles, search, low/out-of-stock views, inline stock editor.
- Component CRUD through a dynamic per-category form generated from the Zod schemas,
  with image upload to S3-compatible storage.
- Brand and category management, CSV import/export (upsert by SKU, per-row error
  reporting), and a 3D asset manager (upload a GLTF/GLB, pick a procedural generator, or
  mark a placeholder; record source/license/attribution).

## Technology

| Area | Choice |
| --- | --- |
| Frontend | Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS 4 |
| 3D | three.js, React Three Fiber, `@react-three/drei` |
| Backend | Next.js route handlers; business logic in framework-agnostic `packages/*` |
| Database | PostgreSQL via Prisma 6 |
| Auth | next-auth v4 (Credentials + JWT) with roles `USER` / `ADMIN` / `INVENTORY_MANAGER` |
| Validation | Zod, at every API boundary |
| Object storage | S3-compatible: SeaweedFS locally, Cloudflare R2 in production |
| Tests | Vitest (unit + API integration), Playwright (browser) |
| Monorepo | pnpm workspaces + Turborepo, GitHub Actions CI |
| Target hosting | Vercel (app) + Neon (Postgres) + Cloudflare R2 — a design, **not yet deployed** |

Why each choice was made: [`project-management/ARCHITECTURE.md`](project-management/ARCHITECTURE.md)
§1 and [`project-management/DECISIONS.md`](project-management/DECISIONS.md).

## Repository structure

```
apps/web/                    Next.js app: pages, API routes, lib/, components/
  app/                       routes (workspace, builds, shared/[slug], admin/*, api/*)
  components/                shared UI: ui/ primitives, workspace/ panels, side panels, nav, theme toggle
  hooks/                     useTheme, useBuildDraft, useBuildPersistence, useCompatibilityReport, ...
  tests/                     API integration tests (Vitest, real Postgres test DB)
  e2e/                       critical-flow browser tests (Playwright)
  test-support/              test-database preparation shared by both
packages/
  database/                  Prisma schema, migrations, seed
  component-models/          Zod schemas per component category + hot-field extraction
  compatibility-engine/      Pure TS rule engine + power calculator
  three-d-engine/            R3F canvas, procedural generators, installation zones, and the
                             pure logic behind builds, airflow, estimates and camera state
  shared/                    API response envelope
project-management/          Roadmap, status, decisions, changelog, session checkpoints
docs/                        API, database, development, deployment, architecture summary
infrastructure/              Local object-storage (SeaweedFS) config
docker/                      docker-compose for a local Postgres
.github/workflows/ci.yml     CI
```

## Getting started

Requires **Node.js 20+** (`.nvmrc`), **pnpm** (the version is pinned in `package.json`;
`corepack enable` picks it up) and **PostgreSQL 17+**.

```bash
pnpm install

# 1. Database: create a role/database (see docs/DATABASE.md), then
cp packages/database/.env.example packages/database/.env
pnpm --filter @pcbuilder/database run db:migrate
pnpm --filter @pcbuilder/database run db:seed     # 12 categories, 11 brands, 20 components

# 2. App environment
cp apps/web/.env.example apps/web/.env.local     # set DATABASE_URL and a NEXTAUTH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 3. Run
pnpm dev                                         # http://localhost:3000
```

Register at `/register`, then open `/workspace`. To try the admin area, promote your
account (the role is read at login, so sign in again afterwards):

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'you@example.com';
```

Image and 3D-model uploads need an S3-compatible server; locally that is SeaweedFS —
setup (including a Windows gotcha with paths containing spaces) is in
[`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md). Nothing else depends on it.

### Root scripts

```bash
pnpm dev         # run apps/web
pnpm build       # build every package and the app
pnpm typecheck   # typecheck everything (the web app runs `next typegen` first)
pnpm lint        # lint
pnpm test        # all Vitest suites, incl. the web API integration tests
pnpm --filter web test:e2e   # Playwright browser tests
```

## Testing

| Layer | Where | Count |
| --- | --- | --- |
| Unit | `packages/component-models`, `compatibility-engine`, `three-d-engine` | 248 |
| Web unit + API integration (Vitest, real Postgres) | `apps/web/tests` | 76 |
| Browser (Playwright) | `apps/web/e2e` | 16 |

The web tests use their own `pcbuilder_test` database (create it once —
`CREATE DATABASE pcbuilder_test OWNER pcbuilder;`); migrations and seed are applied
automatically before each run. Details, layers and troubleshooting:
[`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md#testing-strategy). Every compatibility rule
is required to have unit-test coverage.

## Documentation

| Document | What's in it |
| --- | --- |
| [`docs/API.md`](docs/API.md) | Every API route: auth, request/response shapes, status codes |
| [`docs/DATABASE.md`](docs/DATABASE.md) | Schema, build/share semantics, seed data, test database |
| [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) | Local setup, object storage, testing, CI |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Target cloud architecture, CI, environment variables |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Short architecture orientation |
| [`project-management/ARCHITECTURE.md`](project-management/ARCHITECTURE.md) | Full architecture and rationale |
| [`project-management/DECISIONS.md`](project-management/DECISIONS.md) | Architecture decision records |
| [`project-management/DEVELOPMENT_ROADMAP.md`](project-management/DEVELOPMENT_ROADMAP.md) | Phases and milestones |

Each package has its own README describing its modules.

## Known limitations

- **Not deployed.** The Vercel + Neon + R2 setup is a design; nothing is hosted yet.
- **No slot limits.** You can add several CPUs or GPUs; the compatibility rules tolerate
  it but nothing enforces "one CPU per build". Thermal/performance estimates use the
  first CPU/GPU listed.
- **Approximate layouts.** Zone positions are a schematic floor plan, not real case
  geometry (for example the PSU bay can sit partly outside the case wireframe). Models
  are generic procedural shapes unless a `.glb` is uploaded per component.
- **Estimates are heuristics**, not simulations or benchmarks; performance is a relative
  score, not FPS. Only case fans count toward noise/airflow (no GPU/CPU cooler fans, no
  AIO radiator fans).
- **Orphaned uploads:** deleting a component doesn't delete its files from object storage.
- **Upload hardening is minimal.** Uploads are admin-only and checked against a
  content-type allowlist; the size limits are advisory (presigned PUTs can't enforce
  them) and there is no magic-byte sniffing. There is no rate limiting on sign-in,
  registration or uploads. Fine for a trusted-admin MVP, worth adding before public launch.
- **Cosmetic:** a Turbopack `export *` warning about `@prisma/client` appears in builds.

## Continuing development

The project keeps a session-continuity system in `project-management/`. To resume, read
`SESSION_CHECKPOINT.md` first (exact state and next steps), then `PROJECT_STATUS.md` and
`TODO.md`.
