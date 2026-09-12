import type {
  CompatibilityCheckInput,
  CompatibilityReport,
  CompatibilityResult,
  CompatibilityRule,
} from "./types";

// Populated in Milestone 2 (CPU↔socket, RAM↔motherboard, GPU↔case clearance,
// case↔form factor, cooling↔socket/mount, storage interface). Each rule lives in
// its own file under rules/ and gets pushed onto this list — engine.ts itself
// should not need to change shape as rules are added, only this list.
const RULES: CompatibilityRule[] = [];

function aggregateStatus(results: CompatibilityResult[]): CompatibilityReport["overallStatus"] {
  if (results.some((result) => !result.compatible && result.severity === "ERROR")) {
    return "ERROR";
  }
  if (results.some((result) => !result.compatible && result.severity === "WARNING")) {
    return "WARNING";
  }
  return "OK";
}

// Single entry point for all compatibility logic, called identically by the
// authoritative server-side check (`/api/compatibility/check`, Milestone 4) and
// any client-side "live" check while placing components (Phase 4) — see
// ARCHITECTURE.md §6's "do not scatter compatibility logic" requirement.
//
// Power estimation (`estimatedPowerWatts`/`recommendedPsuWattage`) is wired up in
// Milestone 3 (`powerCalculator.ts`); until then this scaffold reports 0 for both
// rather than a fabricated number.
export function runCompatibilityCheck(build: CompatibilityCheckInput): CompatibilityReport {
  const results = RULES.map((rule) => rule(build)).filter(
    (result): result is CompatibilityResult => result !== null,
  );

  return {
    overallStatus: aggregateStatus(results),
    results,
    estimatedPowerWatts: 0,
    recommendedPsuWattage: 0,
  };
}
