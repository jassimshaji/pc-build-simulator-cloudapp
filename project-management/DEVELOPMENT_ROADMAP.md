# Development Roadmap

See `ARCHITECTURE.md` for the full technical design behind these milestones, and
`TODO.md` / `SESSION_CHECKPOINT.md` for live task-level tracking. Phases below map to
the priority order in the original project brief; each phase is broken into small
milestones sized to fit one development session under the token budget in
`token-budget.json`.

Legend: `[ ]` not started · `[~]` in progress · `[x]` complete

---

## PHASE 0 — Architecture & Planning
- [x] Inspect repo / confirm greenfield project
- [x] Technology stack decision
- [x] System architecture + repo structure
- [x] Database architecture (hybrid relational/JSONB design)
- [x] Component data model strategy
- [x] Compatibility engine architecture
- [x] 3D workspace/engine architecture
- [x] Cloud deployment architecture
- [x] Project-management continuity system (this file + siblings)

**Checkpoint: end of Phase 0.** Waits for explicit user "Continue" before Phase 1 work begins.

---

## PHASE 1 — Core Cloud Application Foundation
Milestones (each independently shippable):
1. `[x]` Monorepo scaffold: pnpm workspace + Turborepo config, root `package.json`,
   `apps/web` Next.js + TS + Tailwind skeleton, `packages/*` package.json stubs,
   shared `tsconfig.base.json`, ESLint/Prettier config. **Done 2026-09-12** — verified
   `pnpm install`, `pnpm typecheck`, `pnpm build` all pass across all 6 workspace
   packages, and `pnpm dev` serves the Next.js app on localhost:3000 (HTTP 200).
2. `[x]` `packages/database`: Prisma schema for User/Brand/ComponentCategory/Component/
   Inventory/ThreeDAsset/CompatibilityRule/PCBuild/BuildComponent, initial migration,
   seed script with a handful of real-ish components per category. **Done
   2026-09-12** — installed PostgreSQL 17 locally (no Docker on this machine),
   migration applied and verified against a real database, seed script run
   (12 categories, 8 brands, 8 compatibility rule definitions, 7 components) and
   confirmed idempotent on re-run. `docker/docker-compose.yml` also added for
   anyone who does have Docker.
3. `[ ]` Auth: Auth.js Credentials provider + Prisma adapter, register/login pages,
   JWT session with `role` claim, `requireRole()` server helper, middleware-protected
   routes.
4. `[ ]` Base app shell UI: top nav, the three-panel workspace layout (inventory /
   3D area placeholder / details+compatibility), responsive breakpoints, dark
   "engineering tool" theme.
5. `[ ]` `/api/components` (list/search/filter/get-by-id) backed by real DB data.

**Checkpoint** after each milestone; stop for explicit "Continue" at the end of the phase (or earlier if a milestone alone fills a session).

---

## PHASE 2 — Component Inventory System
1. `[ ]` `packages/component-models`: Zod schemas for all 13+ category spec shapes
   (Motherboard, CPU, GPU, RAM, SSD, PSU, Case, Fan, AIO, Air Cooler, Monitor, Case
   LCD, generic/future) + hot-field extraction functions.
2. `[ ]` Admin inventory dashboard: list/search components, low-stock/out-of-stock
   views, recently-updated view.
3. `[ ]` Admin CRUD: create/edit/delete component, per-category dynamic spec form
   generated from the Zod schema, image upload to R2.
4. `[ ]` Stock management: update quantity, mark unavailable, brand/category
   management screens.
5. `[ ]` CSV import/export for bulk inventory operations.
6. `[ ]` 3D asset manager: upload GLTF/GLB, assign procedural fallback, record
   source/license/attribution.

---

## PHASE 3 — Compatibility Engine & Power Calculation (text-first, no 3D yet)
1. `[ ]` `packages/compatibility-engine` scaffold + `CompatibilityResult`/`Report` types.
2. `[ ]` Rules: CPU↔socket, RAM↔motherboard, GPU↔case clearance, case↔form factor,
   cooling↔socket/mount, storage interface availability.
3. `[ ]` Power calculator + PSU wattage/connector check.
4. `[ ]` `/api/compatibility/check` route + build creation flow (component picker,
   no 3D) that surfaces live compatibility/warnings and estimated power.
5. `[ ]` Vitest coverage for every rule (the brief calls this out explicitly as
   required, not optional).

---

## PHASE 4 — 3D Workspace Foundation
1. `[ ]` `packages/three-d-engine` scaffold, R3F canvas mounted in the workspace page,
   camera controls (orbit/zoom/pan/reset).
2. `[ ]` Procedural generators for Case, Motherboard, CPU, RAM, GPU, PSU (the
   components needed for a minimal end-to-end build).
3. `[ ]` Installation zone system generated from a placed Case's spec; zone
   highlighting on component selection.
4. `[ ]` Click-to-place interaction wired to the compatibility engine (zones only
   highlight/accept when compatible; placing triggers a real compatibility
   re-check).
5. `[ ]` Remaining procedural generators: Fan, AIO, Air Cooler, SSD, Monitor, Case LCD
   placeholder surface.
6. `[ ]` Asset fallback resolution (`resolveComponentAsset`) wired to real
   `ThreeDAsset` records + GLTF loading path (lazy, Suspense, Draco).

---

## PHASE 5 — Build Management
1. `[ ]` Save/load/rename/duplicate/delete builds, persisting `workspaceState`
   (camera) and `BuildComponent` placements.
2. `[ ]` Build sharing (share slug, read-only public view).
3. `[ ]` Build summary panel: component list, compatibility status, power estimate.

---

## PHASE 6 — Simulation Features (visual/rule-based first)
1. `[ ]` Fan orientation (intake/exhaust, forward/reverse blade) visualization + case
   pressure summary (positive/negative/neutral).
2. `[ ]` Simple airflow visualization (animated particles or directional arrows along
   defined intake→exhaust paths).
3. `[ ]` (Future/backlog, not MVP) Thermal simulation, FPS/performance estimation,
   noise estimation — architecture should not need to change to add these, but they
   are explicitly out of scope until the MVP above is solid.

---

## MVP Definition (target: end of Phase 5)
A user can register/login, browse components with full specs, assemble a build in the
3D workspace with at least Case/Motherboard/CPU/RAM/GPU/PSU/Storage/Cooling/Fans,
get live compatibility + power feedback, save and reload the build, and an admin can
manage inventory (CRUD, stock, images, 3D assets) through a dashboard. Photorealistic
models, thermal physics, real-time monitoring, and performance benchmarking are
explicitly deferred past MVP.

---

## Session Workflow Reminder
Every session: read `PROJECT_STATUS.md` → `SESSION_CHECKPOINT.md` → `TODO.md` →
inspect actual code → pick ONE milestone above → implement → test → update all
project-management docs → stop at the checkpoint and wait for "Continue."
