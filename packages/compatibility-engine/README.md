# packages/compatibility-engine

Pure TypeScript, framework-agnostic compatibility rule engine and power calculator.
Single source of truth for all compatibility logic — never duplicate rules in the UI
or API layer.

**Status:** scaffold (Phase 3, Milestone 1). `src/types.ts` has the
`CompatibilityResult`/`CompatibilityReport`/`CompatibilityRule` shapes from
`../../project-management/ARCHITECTURE.md` §6, plus `BuildComponentInput`/
`CompatibilityCheckInput` describing the engine's plain-data input. `src/engine.ts`
has the real `runCompatibilityCheck()` entry point, wired to an empty rule list —
it always returns an `OK` report with no results and 0 estimated power, since no
rules or power calculation exist yet.

Rule modules (`rules/cpuSocket.ts`, `rules/ramCompatibility.ts`, etc. — Milestone 2)
and the power calculator (`powerCalculator.ts` — Milestone 3) are next. See
`../../project-management/DEVELOPMENT_ROADMAP.md` for the full Phase 3 milestone
list.
