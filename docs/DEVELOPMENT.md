# Development Guide

## Local setup (current — Phase 1, Milestone 1 scope)

Requires Node.js 20+ (LTS) and pnpm (`corepack enable` or `npm i -g pnpm`).

```
pnpm install
pnpm dev              # runs apps/web via Turborepo -> http://localhost:3000
```

Other root scripts: `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test` — each
runs across every workspace package via Turborepo.

Only `apps/web` does anything right now (the Next.js starter page). The `packages/*`
workspaces are empty stubs (`export {}`) that typecheck/build successfully but have no
real code yet — that lands in Phases 2-4.

## Database (Phase 1, Milestone 2 — done)

Requires a local Postgres (either `docker compose -f docker/docker-compose.yml up -d`,
or a natively installed server). See `docs/DATABASE.md` for full schema/setup detail.

```
cp packages/database/.env.example packages/database/.env   # adjust DATABASE_URL if needed
pnpm --filter @pcbuilder/database run db:migrate   # apply migrations (creates a shadow DB — role needs CREATEDB)
pnpm --filter @pcbuilder/database run db:seed      # seed categories/brands/components
pnpm --filter @pcbuilder/database run db:studio    # optional: browse data in Prisma Studio
```

`apps/web` does not yet read from the database (no API routes exist yet — that's
Phase 1, Milestone 5).

## Testing strategy

- **Unit tests (Vitest):** `packages/compatibility-engine` (every rule must have a
  test — required by project standards, not optional), `packages/component-models`
  (Zod schema validation), `packages/three-d-engine` (procedural generator output
  dimensions).
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
