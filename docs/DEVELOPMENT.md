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

`apps/web` still does not read component/inventory data from the database (no
non-auth API routes exist yet — that's Phase 1, Milestone 5).

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
