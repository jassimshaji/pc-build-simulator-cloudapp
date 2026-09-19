# packages/database

Prisma schema, migrations, generated client, and the seed script.

**Status:** complete. `prisma/schema.prisma` defines User, Brand, ComponentCategory,
Component, Inventory, ThreeDAsset, CompatibilityRule, PCBuild and BuildComponent (design
rationale: `../../project-management/ARCHITECTURE.md` §4); one migration (`init`);
`src/index.ts` exports a singleton `PrismaClient` (plus everything from
`@prisma/client`).

`prisma/seed.ts` is idempotent (upserts) and seeds:
- all **12 component categories**,
- **11 brands** and the **8 compatibility rule** definitions,
- **20 components covering every category**, each with an `Inventory` row (stock 25) and a
  `PROCEDURAL_FALLBACK` `ThreeDAsset`. Every component's `specifications` is validated
  against its category's real schema at seed time and its hot columns are *derived* from
  that (never hand-duplicated — ADR-009). Several parts are deliberately awkward so the
  compatibility rules have something to catch (a 358 mm GPU, a Mini-ITX-only case, DDR4
  RAM, a 450 W PSU, an LGA1700 board); the API and browser tests look them up by SKU, so
  renaming or removing a SKU breaks tests.

Scripts (thin wrappers over the Prisma CLI, configured in `prisma.config.ts`, which loads
`.env` via `dotenv` — variables already in the environment win):
`db:generate`, `db:migrate`, `db:deploy`, `db:seed`, `db:studio`.

The automated tests run migrations and the seed against a separate `pcbuilder_test`
database — see `../../docs/DEVELOPMENT.md`. Setup and schema details, including how builds
and sharing are stored: `../../docs/DATABASE.md`.
