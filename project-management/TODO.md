# TODO

Status tags: `[TODO]` `[IN PROGRESS]` `[BLOCKED]` `[COMPLETED]`. Keep this list free
of duplicates — update status in place rather than re-adding a task.

## Phase 0 — Architecture & Planning
- [COMPLETED] Inspect repository / confirm greenfield project
- [COMPLETED] Technology stack decision
- [COMPLETED] System architecture + repository structure
- [COMPLETED] Database architecture (hybrid relational/JSONB)
- [COMPLETED] Component data model strategy (Zod schemas per category, hot-field promotion)
- [COMPLETED] Compatibility engine architecture
- [COMPLETED] 3D workspace/engine architecture
- [COMPLETED] Cloud deployment architecture
- [COMPLETED] Project-management continuity system
- [COMPLETED] Repo skeleton directories + root docs + git init

## Phase 1 — Core Cloud Application Foundation
- [COMPLETED] Monorepo scaffold (pnpm + Turborepo, apps/web Next.js/TS/Tailwind, packages/* stubs)
- [COMPLETED] Prisma schema + initial migration + seed script
- [COMPLETED] Auth (Auth.js v4 Credentials + JWT, RBAC roles, requireRole helper)
- [COMPLETED] Base app shell UI (nav, three-panel workspace layout, theme)
- [COMPLETED] `/api/components` list/search/filter/get-by-id backed by real data

## Phase 2 — Component Inventory System
- [COMPLETED] Zod schemas for all component category spec shapes
- [COMPLETED] Admin inventory dashboard (overview, low/out-of-stock, recently updated)
- [COMPLETED] Admin CRUD for components (dynamic per-category spec form, image upload)
- [COMPLETED] Stock management + brand/category management screens
- [COMPLETED] CSV import/export
- [COMPLETED] 3D asset manager (upload GLTF/GLB, assign procedural fallback, license metadata)

## Phase 3 — Compatibility Engine & Power Calculation
- [COMPLETED] Engine scaffold + result/report types
- [TODO] Rules: CPU socket, RAM, GPU clearance, case form factor, cooling, storage interface
- [TODO] Power calculator + PSU wattage/connector checks
- [TODO] `/api/compatibility/check` + text-only build flow UI
- [TODO] Vitest coverage for every compatibility rule (required, not optional)

## Phase 4 — 3D Workspace Foundation
- [TODO] three-d-engine scaffold + R3F canvas + camera controls
- [TODO] Procedural generators: Case, Motherboard, CPU, RAM, GPU, PSU
- [TODO] Installation zone system generated from case spec + zone highlighting
- [TODO] Click-to-place interaction wired to compatibility engine
- [TODO] Remaining procedural generators: Fan, AIO, Air Cooler, SSD, Monitor, Case LCD
- [TODO] Real GLTF asset loading path (lazy, Suspense, Draco) + resolveComponentAsset

## Phase 5 — Build Management
- [TODO] Save/load/rename/duplicate/delete builds
- [TODO] Build sharing (share slug, public read-only view)
- [TODO] Build summary panel (components, compatibility, power)

## Phase 6 — Simulation Features
- [TODO] Fan orientation + case pressure (intake/exhaust, forward/reverse blade)
- [TODO] Simple airflow visualization (particles/arrows)
- [TODO] (Backlog, post-MVP) Thermal simulation, performance estimation, noise estimation

## Cross-cutting / ongoing
- [TODO] Testing strategy execution (unit/integration/API/compatibility/critical UI)
- [TODO] Expand docs/API.md, docs/DATABASE.md as real endpoints/schema land
- [TODO] CI (GitHub Actions: lint/typecheck/test) once there is code to check
