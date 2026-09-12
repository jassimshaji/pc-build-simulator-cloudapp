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
3. `[x]` Auth: Auth.js Credentials provider, register/login pages, JWT session with a
   `role` claim, `requireRole()` server helper, middleware-protected routes. **Done
   2026-09-12** — next-auth v4 (not v5, see ADR-007), no Prisma adapter (not needed
   for Credentials + JWT). Verified end-to-end against the live dev server: register
   → 201, credentials sign-in → session carries id+role, `/admin` returns a 307
   redirect for a `USER`-role session and 200 after promoting to `ADMIN` in the DB
   and re-authenticating. `middleware.ts` written as `proxy.ts` per Next.js 16's
   renamed convention (confirmed the deprecation warning disappears).
4. `[x]` Base app shell UI: top nav, the three-panel workspace layout (inventory /
   3D area placeholder / details+compatibility), responsive breakpoints, dark
   "engineering tool" theme. **Done 2026-09-12** — committed dark theme (not tied
   to OS preference), session-aware nav (`components/nav.tsx`) shown on every page,
   `/workspace` route with the three-panel + bottom summary bar layout (all
   placeholder content — real data is Milestones 5+/Phases 2-4). Verified visually
   via a Playwright screenshot check at desktop (1280px) and mobile (400px) widths:
   no horizontal overflow, panels correctly stack vertically on narrow screens, no
   console errors, `pnpm build`/`typecheck`/`lint` all pass.
5. `[x]` `/api/components` (list/search/filter/get-by-id) backed by real DB data.
   **Done 2026-09-12** — `GET /api/components` (category/brand/q/minPrice/maxPrice/
   page/limit query params, Zod-validated), `GET /api/components/categories`,
   `GET /api/components/:id`. Added `packages/shared`'s `apiSuccess`/`apiError`
   envelope (used by these routes and retrofitted onto `/api/auth/register`).
   `apps/web/app/workspace/page.tsx`'s category list now queries Prisma directly for
   real seeded data instead of a hardcoded array (which was deleted). Verified
   against the live dev server: list/filter/search/pagination/404/400-validation all
   checked with real requests, and the workspace page's rendered HTML confirmed to
   contain all 12 real category labels. **Phase 1 is now complete.**

**Checkpoint** after each milestone; stop for explicit "Continue" at the end of the phase (or earlier if a milestone alone fills a session).

---

## PHASE 2 — Component Inventory System
1. `[x]` `packages/component-models`: Zod schemas for all 13+ category spec shapes
   (Motherboard, CPU, GPU, RAM, SSD, PSU, Case, Fan, AIO, Air Cooler, Monitor, Case
   LCD, generic/future) + hot-field extraction functions. **Done 2026-09-12** — one
   schema file per category + `src/registry.ts` as the single
   validate/extract-hot-fields lookup point; hot-field promotion strictly follows
   the fields documented in ARCHITECTURE.md §4.1 (no new hot columns invented). 34
   Vitest tests (schema valid/invalid cases + registry fallback/extraction) all
   pass; full workspace typecheck/build/test all green.
2. `[x]` Admin inventory dashboard: list/search components, low-stock/out-of-stock
   views, recently-updated view. **Done 2026-09-12** — `apps/web/lib/inventory.ts`
   (`getInventoryOverview()`, `searchAllComponents()`), `GET /api/inventory`
   (role-gated), and a rewritten `/admin` page (stat tiles, native-form search
   admins can see ALL components including unavailable ones — unlike the public
   `/api/components`, three-panel-consistent dark styling). Verified against the
   live dev server with real data: temporarily set one seeded component
   out-of-stock and another low-stock, confirmed both the API response and the
   rendered dashboard HTML reflected them correctly, confirmed search-by-model
   works, confirmed `/api/inventory` 401s when unauthenticated, then reverted the
   test stock changes.
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
