import type { CompatibilityCheckInput, CompatibilityReport, CompatibilityResult } from "./types";
import { ALL_RULES } from "./rules";
import { calculateRecommendedPsuWattage, estimateSystemPower } from "./powerCalculator";

// CPU↔socket, RAM↔motherboard, GPU↔case clearance, case↔form factor,
// cooling↔socket/mount, storage interface (Milestone 2). Each rule lives in its
// own file under rules/ — see rules/index.ts for the registered list.
const RULES = ALL_RULES;

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
export function runCompatibilityCheck(build: CompatibilityCheckInput): CompatibilityReport {
  const results = RULES.map((rule) => rule(build)).filter(
    (result): result is CompatibilityResult => result !== null,
  );

  const estimatedPowerWatts = estimateSystemPower(build);
  const recommendedPsuWattage = calculateRecommendedPsuWattage(estimatedPowerWatts);

  return {
    overallStatus: aggregateStatus(results),
    results,
    estimatedPowerWatts,
    recommendedPsuWattage,
  };
}
