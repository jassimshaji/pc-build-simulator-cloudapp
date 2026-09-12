# packages/database

Prisma schema, migrations, generated client, and seed scripts.

**Status:** implemented (Phase 1, Milestone 2). `prisma/schema.prisma` has the full
schema (User, Brand, ComponentCategory, Component, Inventory, ThreeDAsset,
CompatibilityRule, PCBuild, BuildComponent — see
`../../project-management/ARCHITECTURE.md` §4), one migration (`init`) applied, and
`prisma/seed.ts` seeds categories/brands/compatibility rules/a handful of real
components. `src/index.ts` exports a singleton `PrismaClient` instance.

See `../../docs/DATABASE.md` for setup instructions and a schema summary.

Scripts: `db:generate`, `db:migrate`, `db:deploy`, `db:seed`, `db:studio` (all thin
wrappers over the Prisma CLI, configured via `prisma.config.ts`).
