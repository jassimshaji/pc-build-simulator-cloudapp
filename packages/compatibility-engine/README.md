# packages/compatibility-engine

Pure TypeScript, framework-agnostic compatibility rule engine and power calculator.
Single source of truth for all compatibility logic — never duplicate rules in the UI
or API layer.

**Status:** scaffold + rules + power calculator (Phase 3, Milestones 1-3).
`src/types.ts` has the `CompatibilityResult`/`CompatibilityReport`/
`CompatibilityRule` shapes from `../../project-management/ARCHITECTURE.md` §6,
plus `BuildComponentInput`/`CompatibilityCheckInput` describing the engine's
plain-data input. `src/engine.ts` has the real `runCompatibilityCheck()` entry
point, running all 15 rules under `src/rules/` (`cpuSocket`, `ramCompatibility`,
`gpuClearance`, `caseFormFactor`, `coolingCompatibility`, `storageInterface`,
`psuPower`), aggregating an `overallStatus`, and returning real
`estimatedPowerWatts`/`recommendedPsuWattage` from `src/powerCalculator.ts`
(`estimateSystemPower`/`calculateRecommendedPsuWattage`, 1.25 default headroom
multiplier).

`/api/compatibility/check` + a text-only build flow UI in `apps/web` (Milestone
4) are next — the first Phase 3 milestone that touches the web app. See
`../../project-management/DEVELOPMENT_ROADMAP.md` for the full Phase 3 milestone
list.
