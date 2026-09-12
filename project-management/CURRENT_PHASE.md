# Current Phase

**Phase 3 — Compatibility Engine & Power Calculation: IN PROGRESS**

Milestone 1 (`packages/compatibility-engine` scaffold) and Milestone 2 (compatibility
rules) are both done: 13 rule functions across 6 files under `src/rules/`
(`cpuSocket`, `ramCompatibility`, `gpuClearance`, `caseFormFactor`,
`coolingCompatibility`, `storageInterface`), all registered in `rules/index.ts` and
run by `engine.ts`'s `runCompatibilityCheck()`. 50 rule-level Vitest tests + 3
engine-level aggregation tests (84 tests passing workspace-wide).

## Next up: Milestone 3 — Power calculator
`powerCalculator.ts`: `estimateSystemPower(build)` summing `tdpWatts`/`powerDrawWatts`
across installed CPU, GPU, motherboard baseline draw, per-stick RAM draw, per-drive
storage draw, fan/AIO pump draw, then a configurable headroom multiplier (default
`1.25`) to produce `recommendedPsuWattage`. Wire this into `engine.ts` so
`CompatibilityReport.estimatedPowerWatts`/`recommendedPsuWattage` stop being
hardcoded `0`. Also add the PSU wattage/connector check rule
(`rules/psuPower.ts` — estimated power * headroom <= psu.wattage, connector count
checks) now that the power estimate it depends on exists. Vitest coverage required
for the calculator and the new rule, same as Milestone 2. See
`DEVELOPMENT_ROADMAP.md` → Phase 3 for the full milestone list.

Waiting for explicit user instruction ("Continue" / "Resume development") before
starting Milestone 3. See `SESSION_CHECKPOINT.md` for exact resume state.
