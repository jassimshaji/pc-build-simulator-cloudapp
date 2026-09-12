# Architecture Summary

This is a short onboarding summary. The canonical, detailed architecture (full
rationale, schema, compatibility engine design, 3D engine design, cloud deployment) is
in [`project-management/ARCHITECTURE.md`](../project-management/ARCHITECTURE.md) —
read that for anything beyond a quick orientation.

## In one paragraph

A Next.js 14 (App Router) monorepo app renders a React Three Fiber 3D workspace where
users assemble a PC from a component inventory backed by PostgreSQL (via Prisma) with
a hybrid relational/JSONB schema. A framework-agnostic `packages/compatibility-engine`
validates every placement (socket match, clearance, power budget, etc.) and a
`packages/three-d-engine` renders either an uploaded GLTF model or a parameterized
procedural fallback for each component. Auth.js handles login/RBAC (USER / ADMIN /
INVENTORY_MANAGER). The app deploys to Vercel, the database to Neon, and 3D/image
assets to Cloudflare R2.

## Map of the monorepo

| Path | Purpose |
|---|---|
| `apps/web` | Next.js UI + API route handlers |
| `packages/database` | Prisma schema, migrations, seed scripts |
| `packages/compatibility-engine` | Pure TS compatibility rules + power calculator |
| `packages/component-models` | Zod schemas per component category |
| `packages/three-d-engine` | R3F scene primitives + procedural model generators |
| `packages/shared` | Cross-cutting utilities |

See the full document for diagrams, the database schema, the compatibility engine's
rule structure, the 3D installation-zone system, and the cloud deployment diagram.
