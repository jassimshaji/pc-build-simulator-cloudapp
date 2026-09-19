# Architecture Summary

This is a short onboarding summary. The canonical, detailed architecture (full
rationale, schema, compatibility engine design, 3D engine design, cloud deployment) is
in [`project-management/ARCHITECTURE.md`](../project-management/ARCHITECTURE.md) —
read that for anything beyond a quick orientation. Its section 11 records how the
as-built system differs from the original design.

## In one paragraph

A Next.js (App Router) monorepo app renders a React Three Fiber 3D workspace where
users assemble a PC from a component inventory backed by PostgreSQL (via Prisma) with
a hybrid relational/JSONB schema. A framework-agnostic `packages/compatibility-engine`
validates every placement (socket match, clearance, power budget, etc.), and a
`packages/three-d-engine` renders either an uploaded GLTF model or a parameterized
procedural fallback for each component. The same package holds the pure logic for
saved builds (row serialization, summary, camera state), fan airflow / case pressure and
the rule-based estimates. next-auth handles login and role-based access (USER / ADMIN /
INVENTORY_MANAGER). Users save builds, and can share them through an unguessable link
that opens a read-only public view. The target deployment is Vercel (app), Neon
(database) and Cloudflare R2 (assets); it has not been deployed yet.

## Map of the monorepo

| Path | Purpose |
|---|---|
| `apps/web` | Next.js UI + API route handlers, plus its API integration tests (`tests/`) and browser tests (`e2e/`) |
| `packages/database` | Prisma schema, migrations, seed script |
| `packages/compatibility-engine` | Pure TS compatibility rules + power calculator |
| `packages/component-models` | Zod schemas per component category |
| `packages/three-d-engine` | R3F canvas, procedural model generators, installation zones, and pure logic for builds / airflow / estimates / camera |
| `packages/shared` | API response envelope |
| `.github/workflows/ci.yml` | CI: typecheck, lint, all tests, browser tests |

## How a request flows

1. The workspace (`apps/web/app/workspace`) holds the in-progress build in client state.
2. Every change calls `POST /api/compatibility/check`, which loads the parts and runs
   `runCompatibilityCheck()` — the only place compatibility logic lives.
3. Saving calls `POST/PATCH /api/builds` with one row per physical unit
   (`{ componentId, installedZoneKey }`). The server recomputes the compatibility and
   power snapshot itself; it never trusts client-supplied results.
4. Reopening (`/workspace?build=<id>`) and the public view (`/shared/<slug>`) both load
   through `apps/web/lib/builds.ts`, which maps the saved rows back to the workspace's
   shape.

See the full document for diagrams, the database schema, the compatibility engine's
rule structure, the 3D installation-zone system, and the cloud deployment diagram.
