# packages/component-models

Shared TypeScript types and Zod schemas describing each component category's
`specifications` shape (CPU, Motherboard, GPU, RAM, SSD, PSU, Case, Air Cooler, AIO
Cooler, Fan, Monitor, Case LCD, plus a permissive generic schema for future
categories), plus the per-category "hot field" extraction functions used to populate
`Component`'s indexed columns.

**Status:** implemented (Phase 2, Milestone 1). One file per category under
`src/categories/*.ts`, each exporting `<name>SpecSchema` (Zod) + a type +
`extract<Name>HotFields()`. `src/registry.ts` is the single lookup point —
`validateSpecifications(categoryKey, data)` and `extractHotFields(categoryKey, data)`
— that everything else (future admin forms, API routes) should go through rather
than switching on category keys itself; unknown category keys fall back to the
permissive `genericSpecSchema`. 34 Vitest tests in `tests/` cover every schema
(valid + invalid cases) and the registry's fallback/extraction behavior. See
`../../project-management/ARCHITECTURE.md` §5 and §4.1 (hot-field rationale).

Run tests: `pnpm --filter @pcbuilder/component-models test`.
