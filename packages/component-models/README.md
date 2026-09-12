# packages/component-models

Shared TypeScript types and Zod schemas describing each component category's
`specifications` shape (Motherboard, CPU, GPU, RAM, SSD, PSU, Case, Fan, AIO, Air
Cooler, Monitor, Case LCD, and a generic/open schema for future categories), plus the
per-category "hot field" extraction functions used to populate `Component`'s indexed
columns.

**Status:** package stub only (`@pcbuilder/component-models`, empty `src/index.ts`,
`zod` dependency wired in). The per-category schemas are scheduled as Phase 2,
Milestone 1 in `../../project-management/DEVELOPMENT_ROADMAP.md`. See
`../../project-management/ARCHITECTURE.md` §5.
