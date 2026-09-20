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
- [COMPLETED] Rules: CPU socket, RAM, GPU clearance, case form factor, cooling, storage interface
- [COMPLETED] Power calculator + PSU wattage/connector checks
- [COMPLETED] `/api/compatibility/check` + text-only build flow UI
- [COMPLETED] Vitest coverage for every compatibility rule (required, not optional)

## Phase 4 — 3D Workspace Foundation
- [COMPLETED] three-d-engine scaffold + R3F canvas + camera controls
- [COMPLETED] Procedural generators: Case, Motherboard, CPU, RAM, GPU, PSU
- [COMPLETED] Installation zone system generated from case spec + zone highlighting
- [COMPLETED] Click-to-place interaction wired to compatibility engine
- [COMPLETED] Remaining procedural generators: Fan, AIO, Air Cooler, SSD, Monitor, Case LCD
- [COMPLETED] Real GLTF asset loading path (lazy, Suspense, Draco) + resolveComponentAsset

## Phase 5 — Build Management
- [COMPLETED] Save/load/rename/duplicate/delete builds (camera viewpoint saved in workspaceState and restored on load + shared view; API verified live incl. ownership isolation and junk-camera rejection)
- [COMPLETED] Build sharing (share slug, public read-only view) — API + /shared/[slug] verified live; browser click-through not done
- [COMPLETED] Build summary panel (components, compatibility, power) — workspace + shared view; browser click-through not done

## Phase 6 — Simulation Features
- [COMPLETED] Fan orientation + case pressure — mounts assigned front, rear, top (cycling); normal blade intakes at front and exhausts at rear/top, reverse blade flips; net CFM -> positive/negative/balanced; panel in workspace + shared view, live-verified
- [COMPLETED] Simple airflow visualization (animated particles per fan: orange = exhaust, blue = intake; "Show airflow" toggle in workspace, always on in shared view) — live-verified
- [COMPLETED] Thermal, performance and noise estimation — rule-based heuristics (packages/three-d-engine/src/estimates.ts), shown as an Estimates panel in the workspace + shared view; labelled as rough estimates, performance is a relative 0-100 score not FPS. Live-verified

## Optional / post-MVP
- [COMPLETED] Slot limits: one case, motherboard, CPU, PSU (client-side)
- [COMPLETED] Rate limiting on sign-in, registration and upload URLs (in-memory)
- [COMPLETED] Enforced upload sizes (signed Content-Length)
- [COMPLETED] Heat-balance thermal model
- [TODO] Shared rate-limit store (Redis/Upstash) for serverless
- [TODO] Magic-byte checks on uploaded files
- [TODO] First deployment (Vercel + Neon + R2) — needs accounts
- [TODO] Real case geometry and real 3D models

## Cross-cutting / ongoing
- [COMPLETED] Testing strategy execution — unit (3 packages: 243 tests), API integration (apps/web/tests: 64 tests, real Postgres test DB, every route incl. auth matrix/ownership/CSV/uploads) and critical-UI Playwright (apps/web/e2e: 13 flows). Found + fixed a real 500 (deleting a component used by a build). See docs/DEVELOPMENT.md
- [COMPLETED] Expanded docs/API.md (builds, sharing, shared view, status-code conventions; removed stale "planned routes"), docs/DATABASE.md (PCBuild/BuildComponent semantics, workspaceState shape, UNPLACED, shareSlug, 20-component seed, test DB) and docs/DEVELOPMENT.md (testing layers + setup)
- [COMPLETED] CI workflow (.github/workflows/ci.yml: Postgres 17 service, install --frozen-lockfile, prisma generate, typecheck, lint, all Vitest suites, Playwright, failure artifacts). YAML validated and every step reproduced locally; NOT yet run on GitHub — this folder is not a git repo and nothing has been pushed
