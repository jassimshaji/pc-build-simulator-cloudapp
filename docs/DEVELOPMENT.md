# Development Guide

Status: design-stage — filled in fully once Phase 1, Milestone 1 (monorepo scaffold)
lands. For now this records the intended setup and testing strategy.

## Intended local setup (once scaffolded)

```
pnpm install
cp .env.example .env.local   # fill in DATABASE_URL etc.
docker compose -f docker/docker-compose.yml up -d   # local Postgres
pnpm --filter database exec prisma migrate dev
pnpm --filter database exec prisma db seed
pnpm --filter web dev
```

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
