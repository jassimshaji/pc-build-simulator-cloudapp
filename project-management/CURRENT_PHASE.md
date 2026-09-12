# Current Phase

**Phase 3 — Compatibility Engine & Power Calculation: IN PROGRESS**

Milestones 1-3 are done:
1. `packages/compatibility-engine` scaffold — `CompatibilityResult`/
   `CompatibilityReport`/`CompatibilityRule` types, `runCompatibilityCheck()`.
2. 13 compatibility rules across 6 files under `src/rules/` (CPU↔socket,
   RAM↔motherboard, GPU↔case/motherboard, case↔form factor, cooling↔CPU/case,
   storage interface).
3. `src/powerCalculator.ts` (`estimateSystemPower`, `calculateRecommendedPsuWattage`
   with a 1.25 default headroom multiplier) wired into `engine.ts`, plus
   `src/rules/psuPower.ts` (PSU wattage check + an advisory connector-count
   check). 108 tests passing workspace-wide.

## Next up: Milestone 4 — `/api/compatibility/check` + build flow UI
An API route that accepts a set of component selections, builds a
`CompatibilityCheckInput` from real `Component` rows (categoryKey, hot fields,
specifications, quantity), calls `runCompatibilityCheck()`, and returns the
`CompatibilityReport`. Then a text-only (no 3D — that's Phase 4) build creation
flow: pick components per category, see live compatibility warnings/errors and
the estimated power draw update as selections change. See
`DEVELOPMENT_ROADMAP.md` → Phase 3 for the full milestone list; Milestone 5
(confirming full Vitest coverage) follows.

Waiting for explicit user instruction ("Continue" / "Resume development") before
starting Milestone 4. See `SESSION_CHECKPOINT.md` for exact resume state.
