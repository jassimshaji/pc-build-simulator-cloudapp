# packages/compatibility-engine

Pure TypeScript, framework-agnostic compatibility rule engine and power calculator.
Single source of truth for all compatibility logic — never duplicate rules in the UI
or API layer.

**Status:** complete (Phase 3). 15 rules, a power calculator, 74 Vitest tests, and it is
wired into the app: `apps/web/lib/compatibility.ts` maps real component rows into the
engine's plain-data input, `POST /api/compatibility/check` exposes it, and the
`/workspace` panel and every saved build's stored snapshot come from it.

## API

`runCompatibilityCheck(input)` (`src/engine.ts`) runs every registered rule and returns a
`CompatibilityReport`: `{ overallStatus: "OK" | "WARNING" | "ERROR", results, estimatedPowerWatts,
recommendedPsuWattage }`. Each `CompatibilityResult` has `ruleKey`, `compatible`,
`severity` (`INFO` / `WARNING` / `ERROR`), a human-readable `message` and the
`affectedComponents`. The input types (`BuildComponentInput`, `CompatibilityCheckInput`)
are plain data — deliberately independent of Prisma and UI types (`src/types.ts`).

## Rules (`src/rules/`, registered in `rules/index.ts`)

| File | Rule keys |
| --- | --- |
| `cpuSocket.ts` | `cpuSocket` |
| `ramCompatibility.ts` | `ramTypeMatch`, `ramCapacity`, `ramModuleCount` |
| `gpuClearance.ts` | `gpuLengthClearance`, `gpuSlotWidth` |
| `caseFormFactor.ts` | `caseFormFactor` |
| `coolingCompatibility.ts` | `airCoolerSocketSupport`, `aioCoolerSocketSupport`, `airCoolerClearance`, `aioRadiatorMountSupport` |
| `storageInterface.ts` | `m2SlotAvailability`, `sataPortAvailability` |
| `psuPower.ts` | `psuWattage`, `psuConnectors` |

A rule returns `null` when the categories it needs aren't both present, otherwise a
result — `INFO` when compatible, `ERROR` for hard physical/electrical failures (socket,
clearance, wattage) and `WARNING` for softer proxy checks (GPU slot width, AIO
radiator mount matching, PSU connector counts).

## Power calculator (`src/powerCalculator.ts`)

`estimateSystemPower(build)` sums the real CPU `tdpWatts` and GPU `powerDrawWatts` plus
small documented constants for what the schema has no power figure for (motherboard,
per RAM module, per SSD, per fan, AIO pump). `calculateRecommendedPsuWattage()` applies
a default 1.25 headroom multiplier.

Every rule must have unit tests (a project requirement) — `tests/` has one file per rule
module plus engine and calculator tests. Run: `pnpm --filter @pcbuilder/compatibility-engine test`.
The web app additionally checks the rules end to end in `apps/web/tests/compatibility.test.ts`
using the seeded parts (an AM5 CPU on an LGA1700 board, DDR4 on DDR5, a 358 mm GPU in a
Mini-ITX case, an undersized PSU, ...).
