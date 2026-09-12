# Current Phase

**Phase 3 — Compatibility Engine & Power Calculation: IN PROGRESS**

Milestone 1 (`packages/compatibility-engine` scaffold) is done: `CompatibilityResult`/
`CompatibilityReport`/`CompatibilityRule` types plus `BuildComponentInput`/
`CompatibilityCheckInput` per ARCHITECTURE.md §6, and a real `runCompatibilityCheck()`
entry point wired to an empty rule list (always reports `OK`, 0 watts, until rules
and the power calculator exist).

## Next up: Milestone 2 — Compatibility rules
CPU↔socket, RAM↔motherboard, GPU↔case clearance, case↔form factor,
cooling↔socket/mount, storage interface availability — each rule in its own file
under `packages/compatibility-engine/src/rules/`, registered in `engine.ts`'s `RULES`
list, with its own Vitest suite (this phase requires full coverage per rule — not
optional, per the project brief). Milestone 3 (power calculator) and Milestone 4
(`/api/compatibility/check` + build flow UI) follow. See `DEVELOPMENT_ROADMAP.md` →
Phase 3 for the full milestone list.

Waiting for explicit user instruction ("Continue" / "Resume development") before
starting Milestone 2. See `SESSION_CHECKPOINT.md` for exact resume state.

## Housekeeping note
A prior session's edit had corrupted `project-management/DECISIONS.md` (ADR-007's
heading lost, merged into ADR-008 — found and fixed in the Phase 2, Milestone 5
session). A quick skim of the other project-management docs this session found
nothing else similarly corrupted.
