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
- **`PCBuild`** / **`BuildComponent`** — a user's saved build, its workspace/camera
  state, last compatibility report snapshot, estimated power, and the per-slot
  placed components (position/rotation, installed zone key).

## Seed data

`packages/database/prisma/seed.ts` seeds all 12 planned component categories (even
ones with zero components yet, so adding real components later is pure data entry),
8 brands, 8 compatibility rule definitions, and 7 real-ish components (2 CPUs, 1
motherboard, 1 GPU, 1 RAM kit, 1 PSU, 1 case) each with an `Inventory` row and a
`PROCEDURAL_FALLBACK` `ThreeDAsset` pointing at the (not-yet-implemented) generic
generator it'll use once `packages/three-d-engine` exists.

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
