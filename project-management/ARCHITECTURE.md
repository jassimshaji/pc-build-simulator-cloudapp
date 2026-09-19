# Architecture — 3D PC Building Simulator & Inventory Platform

Status: Phase 0 (Architecture) — approved baseline for Phase 1 implementation.
Last updated: 2026-09-12

This document is the canonical, detailed architecture reference. `docs/ARCHITECTURE.md`
holds a shorter, onboarding-friendly summary that points back here for depth.

---

## 1. Technology Stack Decision

| Layer | Choice | Why |
|---|---|---|
| Monorepo tooling | pnpm workspaces + Turborepo | Fast incremental builds/caching, first-class support for the `apps/*` + `packages/*` split the spec asks for, no need for Nx's heavier config. |
| Frontend framework | Next.js (App Router, v16 as scaffolded) + React 19 + TypeScript | SSR/CSR hybrid, file-based routing, API routes double as the backend for the MVP, huge ecosystem, deploys natively to Vercel. Scaffolded with whatever is current stable at implementation time rather than pinned to a specific major named at planning time. |
| Styling / UI kit | Tailwind CSS + shadcn/ui (Radix primitives) | Fast to build a professional engineering-tool UI; shadcn components are copy-in (no opaque dependency), easy to theme for dark "workspace" look. |
| 3D rendering | Three.js + React Three Fiber (R3F) + @react-three/drei | R3F lets the 3D scene be expressed as React components co-located with app state (Zustand store), which keeps "select → highlight zone → place" interaction logic in one place instead of imperative Three.js scattered around. Drei gives OrbitControls, GLTF loading helpers, Html overlays for in-scene labels. |
| Backend | Next.js Route Handlers (`app/api/**`) for MVP; business logic lives in framework-agnostic packages | Avoids a premature microservice split. If load ever demands it, the route handlers are thin adapters over `packages/*` logic, so extracting a standalone service later is a lift-and-shift, not a rewrite. |
| Database | PostgreSQL | Relational integrity for Users/Builds/Inventory, strong JSONB support for flexible per-category specs, mature hosting options. |
| ORM | Prisma | Strong TypeScript typing end-to-end, migrations, good JSONB + relational modeling support. |
| Auth | Auth.js / next-auth v4 (v5 was still not what `next-auth@latest` resolved to at implementation time) — Credentials provider + JWT session, `authorize()` queries Prisma directly | Works in the App Router via a catch-all route handler + `next-auth/middleware`. Role travels in the JWT/session for RBAC. No `@auth/prisma-adapter` — see ADR-007: an adapter mainly matters for OAuth account linking/database sessions, neither of which this app uses yet; adding OAuth later means adding the adapter and its Account/Session tables then, not now. |
| Object storage (3D assets, images) | Cloudflare R2 (S3-compatible API) | No egress fees (3D/GLB assets are large and re-fetched often), S3-compatible so any S3 SDK/tooling works, pairs with Cloudflare CDN for delivery. |
| Hosting — web/API | Vercel | Zero-config Next.js deploys, preview deployments per PR, generous free tier for MVP. |
| Hosting — database | Neon (serverless Postgres) | Branching per-PR/preview environment, scales to zero in dev, standard Postgres (no lock-in), cheap to start. |
| CI/CD | GitHub Actions → Vercel | Lint/typecheck/test gate on PRs; Vercel handles the actual deploy on merge. |
| Testing | Vitest (unit/integration) + Playwright (critical e2e, later phase) | Fast, native ESM/TS support, works well in a pnpm monorepo. |
| Validation | Zod | Shared schemas between API route handlers and client forms; also used to validate the JSONB `specifications` blob per category. |
| State (3D workspace) | Zustand | Lightweight, avoids prop-drilling scene/selection state through the R3F tree; keeps compatibility-engine calls triggered from one place. |

**Rejected alternatives (documented for future reference, see `DECISIONS.md`):**
- Separate Express/Nest backend — unnecessary operational overhead for the MVP; revisit only if Next.js route handlers become a bottleneck (e.g., long-running model-generation jobs).
- MongoDB — relational integrity (FKs between builds/components/inventory) and transactional stock updates matter more here than schema flexibility; Postgres JSONB gets us the flexibility anyway.
- Babylon.js — R3F's React-first component model fits this app's "declarative scene driven by app state" shape better than Babylon's more imperative API.

---

## 2. System Architecture

```
                         ┌─────────────────────────┐
                         │        Browser          │
                         │  Next.js Client (React)  │
                         │  R3F 3D Workspace         │
                         └───────────┬─────────────┘
                                     │ HTTPS
                         ┌───────────▼─────────────┐
                         │   Cloudflare CDN/Edge    │  (static assets, GLB/GLTF, images)
                         └───────────┬─────────────┘
                                     │
                         ┌───────────▼─────────────┐
                         │   Vercel: Next.js App     │
                         │  ┌─────────────────────┐ │
                         │  │ App Router UI        │ │
                         │  ├─────────────────────┤ │
                         │  │ API Route Handlers   │ │  <- thin adapters
                         │  │  /api/components      │ │
                         │  │  /api/inventory       │ │
                         │  │  /api/builds          │ │
                         │  │  /api/compatibility   │ │
                         │  │  /api/assets          │ │
                         │  │  /api/auth            │ │
                         │  └─────────┬───────────┘ │
                         └────────────┼─────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        │                             │                             │
┌───────▼────────┐          ┌─────────▼─────────┐         ┌────────▼────────┐
│ packages/       │          │ packages/          │         │ packages/        │
│ compatibility-  │          │ database (Prisma)  │         │ three-d-engine   │
│ engine          │          │                    │         │ (procedural gen, │
│ (pure TS rules) │          │                    │         │  fallback logic) │
└─────────────────┘          └─────────┬──────────┘         └──────────────────┘
                                        │
                              ┌─────────▼──────────┐
                              │  Neon PostgreSQL     │
                              └──────────────────────┘

                              ┌──────────────────────┐
                              │  Cloudflare R2        │  (component images, GLTF/GLB
                              │  (object storage)      │   3D models, LCD placeholder
                              └──────────────────────┘   images)
```

**Key principle:** business logic (compatibility rules, power calculation, procedural
3D generation, spec validation) lives in framework-agnostic `packages/*` so it is
unit-testable in isolation and portable if the API layer ever moves off Next.js.

---

## 3. Repository Structure

```
pc-builder-platform/
│
├── apps/
│   └── web/                      # Next.js app (UI + API route handlers)
│
├── packages/
│   ├── database/                 # Prisma schema, migrations, generated client, seed scripts
│   ├── compatibility-engine/      # Pure TS rule engine (framework-agnostic)
│   ├── component-models/          # Shared TS types/Zod schemas for component categories
│   ├── three-d-engine/            # R3F scene primitives, procedural generators, asset loader/fallback
│   └── shared/                    # Cross-cutting utils (formatting, constants, API response envelope)
│
├── project-management/           # This continuity system (see below)
│
├── docs/                          # README/API/DATABASE/DEVELOPMENT/DEPLOYMENT docs
│
├── infrastructure/                 # IaC notes / env templates / provider setup docs
│
├── scripts/                       # One-off dev scripts (seed data, CSV import/export helpers)
│
├── docker/                        # docker-compose for local Postgres (dev convenience only)
│
├── README.md
└── package.json                   # pnpm workspace root
```

---

## 4. Database Architecture

### 4.1 Design principle: hybrid relational + JSONB

Every component category (CPU, GPU, RAM, Case, PSU, Motherboard, Cooling, Monitor, …)
has a long, category-specific spec list. Modeling every field as its own column would
mean a schema migration for every new category or field, and dozens of mostly-NULL
columns on a shared `Component` table.

Instead:

- `Component` holds fields that are **true of every category** (id, category, brand,
  model, sku, price, images, description, timestamps) plus a `specifications JSONB`
  column holding the full category-specific spec object (validated against a per-category
  Zod schema in `packages/component-models` before it's ever written).
- A small set of **compatibility-critical, heavily-queried** fields are *also* promoted
  to real, indexed columns on `Component` (nullable, category-dependent), because the
  compatibility engine and search/filter UI need to query/join on them efficiently and
  JSONB containment queries don't use a plain btree index well for range comparisons
  (e.g. "GPU length <= case max GPU length" is a numeric range check):
  - `socket` (CPU, Motherboard)
  - `formFactor` (Motherboard, Case, PSU, RAM)
  - `ramType` (RAM, Motherboard support)
  - `pcieGeneration`
  - `lengthMm`, `widthMm`, `heightMm` (GPU, Case, Cooling — clearance checks)
  - `tdpWatts` / `powerDrawWatts` (CPU, GPU — power budget calc)
  - `wattage` (PSU)
- A GIN index on `specifications` supports flexible filtering on the long tail of
  fields without needing a migration per field.

This is documented as a deliberate trade-off in `DECISIONS.md` (ADR-002).

### 4.2 Core entities (Prisma-level, Phase 1 scope)

```
User
  id, email, passwordHash, name, role (enum: USER | ADMIN | INVENTORY_MANAGER),
  createdAt, updatedAt

Brand
  id, name, logoUrl

ComponentCategory
  id, key (e.g. "CPU", "GPU", "MOTHERBOARD", ...), label, sortOrder
  -- new categories are DATA (a new row), never a schema/enum change

Component
  id, categoryId -> ComponentCategory, brandId -> Brand,
  model, sku, price, description,
  images (string[] of R2 URLs),
  specifications (Json)            -- full category-specific spec object
  -- promoted, indexed, nullable "hot" fields (see 4.1):
  socket, formFactor, ramType, pcieGeneration,
  lengthMm, widthMm, heightMm, tdpWatts, powerDrawWatts, wattage,
  isAvailable (boolean),
  createdAt, updatedAt

Inventory
  id, componentId -> Component (1:1),
  stockQuantity, lowStockThreshold, lastRestockedAt

ThreeDAsset
  id, componentId -> Component (nullable — a component may have no custom asset yet),
  kind (enum: GLTF_MODEL | PROCEDURAL_FALLBACK | PLACEHOLDER),
  url (R2 path, null if PROCEDURAL_FALLBACK),
  proceduralGeneratorKey (string, null unless PROCEDURAL_FALLBACK — e.g. "createGenericGPU"),
  source, licenseInfo, attribution, usageRights (free text / structured JSON),
  createdAt, updatedAt

CompatibilityRule
  id, key (e.g. "CPU_SOCKET_MATCH", "GPU_LENGTH_VS_CASE"), description,
  severity (enum: INFO | WARNING | ERROR), isActive
  -- rules are DATA-described but the actual comparison logic lives in
  -- packages/compatibility-engine; this table is for admin visibility/toggling,
  -- not a rule DSL (avoids building a rules-engine-in-a-database anti-pattern)

PCBuild
  id, userId -> User, name,
  workspaceState (Json — camera position, zoom, UI panel state),
  compatibilityStatus (Json — last computed CompatibilityReport snapshot),
  estimatedPowerWatts,
  isShared (boolean), shareSlug (nullable, unique),
  createdAt, updatedAt

BuildComponent
  id, buildId -> PCBuild, componentId -> Component,
  installedZoneKey (e.g. "PCIE_SLOT_1", "RAM_SLOT_2", "FRONT_FAN_1"),
  positionX, positionY, positionZ, rotationX, rotationY, rotationZ
```

### 4.3 Category system

`ComponentCategory` is a **data table, not an enum/type**, so "Phase 3: add HDD /
capture cards / RGB controllers" never requires a schema migration — just a new row
plus a new Zod spec schema in `packages/component-models`. The category `key` is what
the compatibility engine and UI switch on.

---

## 5. Component Data Model

Each category gets a **Zod schema** in `packages/component-models/src/categories/*.ts`
describing its `specifications` shape (the fields listed exhaustively in the project
brief: Motherboard, CPU, GPU, RAM, SSD, PSU, Case, Fans, AIO, Air Cooler, Monitor, Case
LCD, plus a generic/open schema for future categories). These schemas:

1. Validate admin input when a component is created/edited.
2. Drive the "hot field" promotion (a per-category mapping function extracts the
   subset of fields that get written to `Component`'s indexed columns).
3. Are consumed directly by the compatibility engine (typed access to
   `component.specifications` after a runtime parse, no `any`).
4. Are consumed by the 3D engine's procedural generators as the generator's parameter
   object (e.g. GPU spec → `createGenericGPU({ length, width, height, slotWidth, fanCount })`).

New categories (HDD, capture cards, RGB controllers, peripherals, …) are added by
writing one new Zod schema + one new procedural generator (or placeholder) — no
changes to `Component`, `PCBuild`, or the API routes.

---

## 6. Compatibility Engine Architecture

Lives entirely in `packages/compatibility-engine` (pure TypeScript, zero UI/DB
dependency — it receives plain component/spec objects and returns plain results, so
it's trivial to unit test and could run client-side for instant feedback or
server-side for the authoritative check on save).

```
compatibility-engine/
  src/
    types.ts                # CompatibilityResult, Severity, CompatibilityReport
    powerCalculator.ts       # estimateSystemPower(build) -> watts, with headroom multiplier
    rules/
      cpuSocket.ts           # CPU.socket === Motherboard.socket
      ramCompatibility.ts    # ramType match, capacity <= max, modules <= slots
      gpuClearance.ts        # gpu.lengthMm <= case.maxGpuLengthMm, width/slot checks
      psuPower.ts            # estimated power * headroom <= psu.wattage, connector checks
      caseFormFactor.ts      # motherboard.formFactor supported by case
      coolingCompatibility.ts# cooler socket support, radiator mount support, clearance
      storageInterface.ts    # M.2 slot availability, SATA port availability
    engine.ts                # runCompatibilityCheck(build): CompatibilityReport
    index.ts
  tests/
    *.spec.ts                # one suite per rule module (Vitest)
```

`engine.ts` runs every applicable rule (skipping rules whose required components
aren't present yet) and aggregates results:

```ts
interface CompatibilityResult {
  ruleKey: string;
  compatible: boolean;
  severity: "INFO" | "WARNING" | "ERROR";
  message: string;
  affectedComponents: string[]; // category keys, e.g. ["GPU", "CASE"]
}

interface CompatibilityReport {
  overallStatus: "OK" | "WARNING" | "ERROR";
  results: CompatibilityResult[];
  estimatedPowerWatts: number;
  recommendedPsuWattage: number; // estimated * headroom
}
```

The API route `/api/compatibility/check` and the client-side "live" check while
dragging components both call the *same* `runCompatibilityCheck`, so there is exactly
one source of truth for compatibility logic (per the "do not scatter compatibility
logic" requirement).

Power calculation: sums `tdpWatts`/`powerDrawWatts` across installed CPU, GPU,
motherboard baseline draw, per-stick RAM draw, per-drive storage draw, fan/AIO pump
draw, then applies a configurable headroom multiplier (default `1.25`) to produce
`recommendedPsuWattage`, compared against the installed PSU's `wattage`.

---

## 7. 3D Workspace / Engine Architecture

Lives in `packages/three-d-engine` (scene primitives + procedural generators, consumed
by `apps/web`'s workspace page) plus the R3F component tree in `apps/web`.

### 7.1 Interaction model

Native HTML5 drag-and-drop does not compose well with a WebGL canvas hit-testing its
own raycasts, so the spec's suggested alternative is adopted:

```
Select Component (inventory panel)
        ↓
Compatibility-aware valid zones highlight in the 3D scene
  (engine.ts is queried in "would this be compatible if placed here" mode)
        ↓
Click a highlighted zone → snap component into that zone
        ↓
runCompatibilityCheck(build) re-runs, panels update
```

A secondary "pick up and drag" mode (pointer-down on an installed component, drag,
release over a zone) is layered on top of the same click-to-place primitives once the
basic flow works — same underlying zone/snap system either way.

### 7.2 Installation zones

Each `PC_CASE` component defines a static list of zones (authored as data, not
hardcoded per-case JSX):

```ts
interface InstallationZone {
  key: string;                 // "MOBO_TRAY", "PSU_BAY", "PCIE_SLOT_1", "RAM_SLOT_2", ...
  acceptsCategory: CategoryKey;
  position: [number, number, number];
  rotation: [number, number, number];
  constraints?: Record<string, unknown>; // e.g. maxLengthMm for a GPU zone
}
```

Zones are generated from the case's `specifications` (e.g. `ramSlots: 4` produces 4
`RAM_SLOT_n` zones at computed offsets) — again avoiding a hand-authored zone list per
case model.

### 7.3 Procedural model generators (fallback system)

`packages/three-d-engine/src/procedural/*.ts` exports parameterized generators:

```
createGenericMotherboard({ formFactor })
createGenericCPU({ socket })
createGenericGPU({ length, width, height, slotWidth, fanCount })
createGenericRAM({ formFactor, height })
createGenericPSU({ formFactor, length })
createGenericCase({ formFactor, dimensions })
createGenericFan({ sizeMm, thicknessMm })
createGenericRadiator({ sizeMm, thicknessMm })
createGenericAIO({ radiatorSizeMm })
createGenericSSD({ formFactor })
```

Each returns a `THREE.Group` (or an R3F component wrapper) built from primitive
geometry, dimensioned from the component's own spec — so even a component with zero
custom art renders at roughly correct size/position/orientation.

**Asset resolution order** (`resolveComponentAsset(component)`):
1. `ThreeDAsset` row with `kind = GLTF_MODEL` and a real `url` → load via
   `useGLTF`/GLTFLoader (Draco-compressed, lazy-loaded, cached).
2. `ThreeDAsset` row with `kind = PROCEDURAL_FALLBACK` → call the named generator with
   the component's spec.
3. No `ThreeDAsset` row at all → infer a reasonable generator from `category.key` as a
   last-resort default.

License/attribution/source metadata is stored per the brief's requirement, surfaced in
the admin 3D asset manager — the app never auto-downloads third-party model files.

### 7.4 Performance

- GLTF/GLB assets loaded lazily per-component when actually placed or previewed (not
  at app startup).
- `useGLTF.preload` only for components visible in the current inventory page.
- Draco/meshopt compression expected on uploaded GLB assets (validated at upload).
- Instancing for repeated primitives (fan blades, screws) in procedural generators.
- R3F `<Suspense>` boundaries per model + simple loading placeholders.

---

## 8. Cloud Deployment Architecture

```
Developer → GitHub → GitHub Actions (lint/typecheck/test) → Vercel (build + deploy)
                                                                 │
                                                    ┌────────────┼─────────────┐
                                                    │                          │
                                              Neon PostgreSQL           Cloudflare R2
                                              (via Prisma,               (component images,
                                               pooled connection)         GLTF/GLB models)
```

- **Environments:** `local` (docker-compose Postgres + local `.env`), `preview`
  (Vercel preview deploy per PR, Neon DB branch per PR), `production`.
- **Secrets:** stored in Vercel project env vars + GitHub Actions secrets; never
  committed. `.env.example` documents every required variable with placeholder values.
- **CI gate:** typecheck → lint → unit tests (compatibility engine + API) must pass
  before merge; Vercel handles the actual build/deploy on merge to `main`.

---

## 9. Security Architecture

- Passwords hashed with `bcryptjs` (via Auth.js Credentials provider; the pure-JS
  `bcryptjs` was chosen over native `bcrypt` to avoid a native-module build step in
  environments without build tools readily available).
- RBAC enforced in API route handlers via a shared `requireRole()` helper reading the
  session JWT — never trust client-supplied role claims.
- All mutating API routes validate input with the matching Zod schema before touching
  Prisma.
- File uploads (component images, GLTF/GLB): validated by MIME type + magic-byte sniff
  + max size, uploaded directly to R2 via a short-lived signed URL (never proxied
  through a route handler as raw bytes beyond a small size cap), and never treated as
  executable content.
- Rate limiting on auth and asset-upload routes (simple in-memory/edge-KV token bucket
  for MVP; revisit with a proper rate-limit service if abuse is observed).

---

## 10. Risks & Technical Challenges

| Risk | Mitigation |
|---|---|
| HTML5 drag-and-drop doesn't work well with a WebGL canvas | Click-to-select → highlight zones → click-to-place is the primary interaction (documented in §7.1); pointer-drag is an enhancement layered on later. |
| No licensed 3D models at launch | Procedural generic geometry is the default and is architecturally first-class, not a stopgap (§7.3); admin can upload real GLB later per component without any code change. |
| JSONB spec flexibility vs. query performance | Hybrid model promotes only the fields actually needed for compatibility/filtering to real columns; GIN index covers the rest (§4.1, ADR-002). |
| Compatibility logic sprawl | Single `packages/compatibility-engine`, one `runCompatibilityCheck` entry point used by both client-side live feedback and the authoritative server check. |
| Power estimation accuracy | Starts as a rule-based sum + headroom multiplier (documented assumption, not marketed as precise); architecture leaves room for refining per-component draw curves later without touching the engine's public API. |
| Scope creep across 13 component categories + advanced simulation | Roadmap strictly sequences: auth/inventory/compatibility (text-only) → 3D workspace with 2-3 categories end-to-end → remaining categories → simulation/airflow. See `DEVELOPMENT_ROADMAP.md`. |
| Large GLTF assets hurting load performance | Lazy loading, Draco compression requirement, per-asset size cap enforced at upload. |

---

## 11. As-built notes (Phases 5-6 and testing)

The sections above are the original design. This records where the built system extends
or departs from it.

**Saved builds (extends §4.2).** `PCBuild` / `BuildComponent` are written by
`apps/web/app/api/builds/*`. A build's components are stored **one row per physical unit**
(three identical RAM kits = three rows); `installedZoneKey` is a zone key or the sentinel
`UNPLACED` (the case is always `UNPLACED` — it is the root container, not a zone
occupant). `packages/three-d-engine/src/buildSerialization.ts` converts to and from the
workspace's `{ quantity per component, zone -> component }` shape. `compatibilityStatus`
and `estimatedPowerWatts` are **server-computed snapshots**, recomputed on every create
and on every update that replaces the components — the client never supplies them.
`workspaceState` holds only a validated camera (`{ camera: { position, target } }`);
anything else a client sends is dropped. See ADR-010.

**Sharing.** `POST /api/builds/:id/share` sets `isShared` and mints a random 12-character
URL-safe `shareSlug` (72 bits); disabling clears the slug so an old link can never be
revived. `/shared/[slug]` is a public, read-only page that resolves only when
`isShared` is true and the slug matches. Every non-owner access to a private build is a
`404`, not `403`, so ids can't be probed (even for admins). See ADR-011.

**3D engine (extends §7).**
- The pure logic lives beside the renderer in `packages/three-d-engine`: build
  serialization, build summary, camera state, airflow and estimates. Only
  `WorkspaceCanvas.tsx` and `AirflowStream.tsx` need WebGL.
- "Add to build" auto-places into the first free compatible zone
  (`WorkspaceCanvasHandle.findFreeZone`); clicking a zone still works for choosing a slot.
- Fan mounts (`FAN_MOUNT_<n>`) are assigned faces front, rear, top (cycling) by
  `fanMountFace(index)`, because the case spec lists only supported fan sizes. Airflow
  derives fan direction from that same function (ADR-012).
- Scale is 1 scene unit = 1 meter; the default camera is about a meter from the case,
  aimed at its middle, and `CameraRig` records that as the "Reset view" state.

**Simulation (§7 mentioned airflow only as a future item).** Case pressure, fan flow
direction and animated particles are implemented. Thermal, noise and performance are
**rule-based estimates**, not simulations (`estimates.ts`), and are labelled as such in
the UI (ADR-013).

**Security (§9) — what is and isn't implemented.** Implemented: `bcryptjs` password
hashing, `requireRole()` on every gated route (plus `proxy.ts` for `/admin`), Zod
validation on every mutating route, presigned-URL uploads with a content-type
allowlist and a sanitized object key. **Not implemented**, contrary to the text above:
magic-byte sniffing, enforced upload size limits (presigned PUTs can't enforce them —
the constants in `lib/storage.ts` are advisory) and rate limiting on auth/upload routes.
Acceptable while uploads are admin-only; revisit before a public launch.

**UI kit (§1).** shadcn/ui was planned but never adopted; the UI is plain Tailwind CSS
components, which has been sufficient. The workspace is composed of hooks
(`apps/web/hooks/`) and single-purpose panels (`components/workspace/`) over small
primitives (`components/ui/`) — ADR-016. Light and dark themes work by overriding
Tailwind's palette variables under `<html data-theme>` (`app/theme.css`), with the 3D scene
receiving the theme as a prop — ADR-015.

**CI/CD (§8).** GitHub Actions is implemented (`.github/workflows/ci.yml`): Postgres
service, typecheck, lint, all unit + API-integration tests, and Playwright. The Vercel
deploy is still only a design.

**Testing.** Unit tests per package; API integration tests in `apps/web/tests` call the
route handlers against a separate real Postgres test database (only `requireRole` is
replaced); Playwright tests in `apps/web/e2e` run against a production build. See
ADR-014 and `docs/DEVELOPMENT.md`.
