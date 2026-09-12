# Database

Status: design-stage — no Prisma schema exists yet (Phase 1, Milestone 2). The full
entity design and the hybrid relational/JSONB rationale are in
[`project-management/ARCHITECTURE.md`](../project-management/ARCHITECTURE.md) §4 and
[`project-management/DECISIONS.md`](../project-management/DECISIONS.md) (ADR-002).

## Summary

- **Engine:** PostgreSQL (Neon in production, docker-compose Postgres locally).
- **ORM:** Prisma.
- **Core entities:** `User`, `Brand`, `ComponentCategory`, `Component`, `Inventory`,
  `ThreeDAsset`, `CompatibilityRule`, `PCBuild`, `BuildComponent`.
- **Key design choice:** `Component.specifications` is a JSONB column holding the full
  category-specific spec object (validated via Zod at the app layer), with a small set
  of compatibility/filter-critical fields also promoted to real indexed columns
  (`socket`, `formFactor`, `ramType`, `pcieGeneration`, `lengthMm`/`widthMm`/`heightMm`,
  `tdpWatts`/`powerDrawWatts`, `wattage`). New component categories or new spec fields
  never require a schema migration unless that field needs to become a hot compatibility
  field.

This file will gain the actual Prisma schema excerpt, ER diagram, and migration
history once Phase 1, Milestone 2 lands.
