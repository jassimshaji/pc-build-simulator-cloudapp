# packages/compatibility-engine

Pure TypeScript, framework-agnostic compatibility rule engine and power calculator.
Single source of truth for all compatibility logic — never duplicate rules in the UI
or API layer.

**Status:** scaffold + rules (Phase 3, Milestones 1-2). `src/types.ts` has the
`CompatibilityResult`/`CompatibilityReport`/`CompatibilityRule` shapes from
`../../project-management/ARCHITECTURE.md` §6, plus `BuildComponentInput`/
`CompatibilityCheckInput` describing the engine's plain-data input. `src/engine.ts`
has the real `runCompatibilityCheck()` entry point, running all 13 rules under
`src/rules/` (`cpuSocket`, `ramCompatibility`, `gpuClearance`, `caseFormFactor`,
`coolingCompatibility`, `storageInterface`) and aggregating an `overallStatus`.
`estimatedPowerWatts`/`recommendedPsuWattage` are still hardcoded `0` — the power
calculator is next.

`powerCalculator.ts` (Milestone 3) and the PSU wattage/connector rule are next. See
`../../project-management/DEVELOPMENT_ROADMAP.md` for the full Phase 3 milestone
list.
