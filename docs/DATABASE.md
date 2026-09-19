# Database

PostgreSQL via Prisma. Schema lives in `packages/database/prisma/schema.prisma`; the
full design rationale (hybrid relational/JSONB approach) is in
[`project-management/ARCHITECTURE.md`](../project-management/ARCHITECTURE.md) §4 and
[`project-management/DECISIONS.md`](../project-management/DECISIONS.md) (ADR-002).

## Local setup

Requires a local PostgreSQL server (17 recommended). Either run one via Docker
(`docker compose -f docker/docker-compose.yml up -d`, see `docker/README.md`) or use
a natively installed Postgres. Create a role/database matching `DATABASE_URL`:

```sql
CREATE ROLE pcbuilder LOGIN PASSWORD 'pcbuilder' CREATEDB; -- CREATEDB needed for Prisma's shadow database
CREATE DATABASE pcbuilder OWNER pcbuilder;
```

Then, from `packages/database`:

```
cp .env.example .env          # DATABASE_URL=postgresql://pcbuilder:pcbuilder@localhost:5432/pcbuilder?schema=public
pnpm --filter @pcbuilder/database run db:migrate   # applies prisma/migrations
pnpm --filter @pcbuilder/database run db:seed      # seeds categories/brands/components
```

Prisma config lives in `prisma.config.ts` (Prisma 6's config-file convention, replaces
the old `package.json#prisma.seed` field) and explicitly loads `.env` via `dotenv`
since a config file present disables Prisma's automatic env loading.

## Schema summary

- **`User`** — id, email (unique), passwordHash, name, `role` (`USER` / `ADMIN` /
  `INVENTORY_MANAGER`).
- **`Brand`**, **`ComponentCategory`** — lookup tables. `ComponentCategory` is a *data*
  table (key/label/sortOrder), not an enum — new categories are new rows, never a
  migration.
- **`Component`** — category/brand FKs, model/sku/price/description/images,
  `specifications Json` (full category-specific spec object), plus a curated set of
  nullable "hot" columns promoted for compatibility/filter queries: `socket`,
  `formFactor`, `ramType`, `pcieGeneration`, `lengthMm`/`widthMm`/`heightMm`,
  `tdpWatts`/`powerDrawWatts`, `wattage`. Indexed on `categoryId`, `brandId`, `socket`,
  `formFactor`, `ramType`.
- **`Inventory`** — 1:1 with `Component`, stock quantity + low-stock threshold.
- **`ThreeDAsset`** — 0:1 (nullable FK) per `Component`, `kind`
  (`GLTF_MODEL` / `PROCEDURAL_FALLBACK` / `PLACEHOLDER`), url or
  `proceduralGeneratorKey`, plus source/license/attribution metadata.
- **`CompatibilityRule`** — admin-visible registry of rule keys/severity/active flag.
  The actual comparison logic lives in `packages/compatibility-engine` (Phase 3), not
  in the database.
- **`PCBuild`** — a user's saved build (`userId`, cascade-deleted with the user).
  Columns beyond `name`:
  - `workspaceState Json?` — currently `{ "camera": { "position": [x,y,z], "target": [x,y,z] } }`
    (scene units = meters). Written only through `sanitizeWorkspaceState` in
    `apps/web/lib/builds.ts`, which validates the camera and drops everything else,
    so the column never holds arbitrary client JSON.
  - `compatibilityStatus Json?` / `estimatedPowerWatts Int?` — a snapshot of the last
    `CompatibilityReport`, recomputed server-side on every create and on every
    update that replaces the components. Used for the public shared view and list
    views so they don't recompute.
  - `isShared Boolean` / `shareSlug String? @unique` — sharing. `shareSlug` is a
    random 12-character URL-safe token (72 bits) set when sharing is enabled and
    **cleared to null when it is disabled**, so an old link can never be revived;
    re-enabling mints a new one. A build is publicly readable only when
    `isShared` is true *and* the slug matches.
- **`BuildComponent`** — one row **per physical unit** in a build (three identical
  RAM kits are three rows), cascade-deleted with the build. `installedZoneKey` is
  the installation zone it occupies (`MOBO_TRAY`, `RAM_SLOT_1`, `FAN_MOUNT_2`, ...)
  or the sentinel **`UNPLACED`** for units that are in the build but not placed into
  a 3D zone (the case is always `UNPLACED` — it is the root container, not a zone
  occupant). `packages/three-d-engine/src/buildSerialization.ts` converts between
  these rows and the workspace's `{ quantity per component, zone -> component }`
  shape. `positionX/Y/Z` and `rotationX/Y/Z` exist but are unused today (a zone
  determines placement). `componentId` is `RESTRICT`: a component used in any build
  cannot be deleted (the API returns 409).

## Test database

Automated tests use their own `pcbuilder_test` database (never the dev one); see
`docs/DEVELOPMENT.md` (Testing strategy). `apps/web/test-support/testDatabase.ts`
applies migrations and the seed to it before every run.

## Seed data

`packages/database/prisma/seed.ts` seeds all 12 component categories, 11 brands,
8 compatibility rule definitions, and 20 real-ish components covering **every**
category (2 CPUs, 2 motherboards, 2 GPUs, 2 RAM kits, 2 PSUs, 2 cases, 2 SSDs, 2
fans, 1 air cooler, 1 AIO, 1 monitor, 1 case LCD), each with an `Inventory` row
(stock 25) and a `PROCEDURAL_FALLBACK` `ThreeDAsset` for the generic generator in
`packages/three-d-engine`. Several are deliberately awkward so compatibility rules
have something to catch — a 358 mm GPU, a Mini-ITX-only case with a 55 mm cooler
limit, DDR4 RAM, a 450 W PSU, an LGA1700 board — and the API/E2E tests rely on
them (look them up by SKU).

Each component's `specifications` is validated against its category's real
`@pcbuilder/component-models` schema at seed time (`validateSpecifications` /
`extractHotFields` — the same functions `POST /api/components` uses), and the
hot columns are *derived* from that validated data rather than hand-duplicated —
`packages/database` depends on `@pcbuilder/component-models` for exactly this. An
earlier version of this file set hot-column values (socket, tdpWatts, etc.) as
separate literals alongside a `specifications` object that didn't also contain
them; that drifted out of sync once the Zod schemas were added in a later
milestone (discovered via a CSV export → re-import round trip in Phase 2,
Milestone 5, which failed validation on exactly those fields). Keeping
`specifications` as the single source of truth, with hot columns always derived
from it, is what prevents that class of bug from recurring.

The seed is upsert-based (both the `create` and `update` branches set the same
fields) and safe to re-run against an already-seeded database — re-running it is
in fact how the bug above was fixed live, without needing a migration reset.
