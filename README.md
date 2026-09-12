# PC Builder Platform

A cloud-based 3D PC building simulation and component inventory management system.
Browse real/configurable PC components, assemble a build in an interactive 3D
workspace, get live compatibility and power-draw feedback, and save/share builds. An
admin dashboard manages the component catalog, stock, and 3D assets.

**Project status:** Phase 0 (architecture) complete, no application code yet. See
`project-management/PROJECT_STATUS.md` for the live status and
`project-management/SESSION_CHECKPOINT.md` for exact resume instructions.

## Project Overview

See `project-management/ARCHITECTURE.md` for the full architecture (tech stack,
database design, compatibility engine, 3D engine, cloud deployment) and
`project-management/DEVELOPMENT_ROADMAP.md` for the phased build plan and MVP
definition.

## Technology Stack

- **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS, shadcn/ui
- **3D:** Three.js, React Three Fiber, @react-three/drei
- **Backend:** Next.js API route handlers, business logic in framework-agnostic
  `packages/*`
- **Database:** PostgreSQL via Prisma
- **Auth:** Auth.js (Credentials + JWT, role-based access: USER / ADMIN / INVENTORY_MANAGER)
- **Object storage:** Cloudflare R2 (component images, GLTF/GLB 3D models)
- **Hosting:** Vercel (app) + Neon (Postgres) + Cloudflare R2 (storage)

Full justification for each choice is in `project-management/ARCHITECTURE.md` §1 and
`project-management/DECISIONS.md`.

## Repository Structure

```
pc-builder-platform/
├── apps/web/                    # Next.js app (UI + API routes)
├── packages/
│   ├── database/                # Prisma schema, migrations, seed scripts
│   ├── compatibility-engine/    # Pure TS compatibility rule engine
│   ├── component-models/        # Shared TS types / Zod schemas per component category
│   ├── three-d-engine/          # R3F scene primitives + procedural 3D model generators
│   └── shared/                  # Cross-cutting utilities
├── project-management/          # Development continuity system (status, roadmap, checkpoints)
├── docs/                        # API / database / development / deployment docs
├── infrastructure/              # Env/provider setup notes
├── scripts/                     # Dev scripts (seeding, CSV import/export helpers)
└── docker/                      # docker-compose for local Postgres
```

## Installation & Running Locally

Requires Node.js 20+ and pnpm.

```
pnpm install
pnpm dev          # starts apps/web at http://localhost:3000
```

Other useful root scripts (run via Turborepo across all workspace packages):

```
pnpm build        # build all packages/apps
pnpm typecheck     # typecheck all packages/apps
pnpm lint          # lint all packages/apps
pnpm test          # run tests in all packages/apps
```

`apps/web` now has working registration/login (`/register`, `/login`), sessions
(next-auth v4, JWT strategy carrying the user's role), and a role-gated `/admin`
placeholder — but no other real pages/API yet (no component/inventory data flows
through it). `packages/database` has a real Prisma schema, migration, and seed data
(see `docs/DATABASE.md`). The other `packages/*` are still empty stubs pending Phases
2-4. See `project-management/PROJECT_STATUS.md` for live status.

Setup requires a local PostgreSQL server (`docs/DATABASE.md`) and an `apps/web/.env.local`
(`docs/DEVELOPMENT.md` has the exact steps, including generating an auth secret).

## Running Tests

Testing strategy is documented in `docs/DEVELOPMENT.md`. Compatibility-engine rules
require full Vitest coverage per project requirements (Phase 3).

## Deployment

See `docs/DEPLOYMENT.md` for the target cloud architecture (Vercel + Neon + Cloudflare R2).

## Continuing Development

This project uses a session-continuity system under `project-management/`. To resume
work in a new session, say "Continue" or "Resume development" — read
`project-management/SESSION_CHECKPOINT.md` first for exact state.
