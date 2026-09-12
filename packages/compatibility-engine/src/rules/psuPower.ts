import type { CompatibilityCheckInput, CompatibilityResult } from "../types";
import { calculateRecommendedPsuWattage, estimateSystemPower } from "../powerCalculator";
import { componentsOf, firstOf } from "./utils";

// The estimated load (with headroom) must not exceed the installed PSU's
// rated wattage. Only runs once a PSU and at least one real power draw (CPU or
// GPU — the two categories with actual manufacturer power data) are present,
// so an empty/partial build doesn't produce a trivially-passing result.
export function checkPsuWattage(build: CompatibilityCheckInput): CompatibilityResult | null {
  const psu = firstOf(build, "PSU");
  if (!psu) {
    return null;
  }

  const hasPowerConsumers =
    componentsOf(build, "CPU").length > 0 || componentsOf(build, "GPU").length > 0;
  if (!hasPowerConsumers) {
    return null;
  }

  const psuWattage = psu.hotFields.wattage;
  if (typeof psuWattage !== "number") {
    return null;
  }

  const recommendedWattage = calculateRecommendedPsuWattage(estimateSystemPower(build));
  const compatible = recommendedWattage <= psuWattage;
  return {
    ruleKey: "psuWattage",
    compatible,
    severity: compatible ? "INFO" : "ERROR",
    message: compatible
      ? `PSU's ${psuWattage}W supply covers the estimated ${recommendedWattage}W recommended load (with headroom).`
      : `PSU's ${psuWattage}W supply is below the estimated ${recommendedWattage}W recommended load (with headroom) — consider a higher-wattage PSU.`,
    affectedComponents: ["PSU", "CPU", "GPU"],
  };
}

// A deliberately simple, advisory sanity check: the schema tracks the PSU's
// own connector *supply* counts (cpuPowerConnectors, pciePowerConnectors), but
// GPU/motherboard only describe their connector *type* as free text (e.g.
// "8-pin", "12VHPWR"), not a count to match against — so this can't do real
// connector-type matching. It only checks that at least one CPU connector
// exists when there's a motherboard to power, and that there are at least as
// many PCIe connectors as installed GPUs. WARNING, not ERROR, since it's a
// coarse proxy rather than a verified requirement.
export function checkPsuConnectors(build: CompatibilityCheckInput): CompatibilityResult | null {
  const psu = firstOf(build, "PSU");
  if (!psu) {
    return null;
  }

  const motherboard = firstOf(build, "MOTHERBOARD");
  const gpus = componentsOf(build, "GPU");
  if (!motherboard && gpus.length === 0) {
    return null;
  }

  const cpuConnectors = psu.specifications.cpuPowerConnectors;
  const pcieConnectors = psu.specifications.pciePowerConnectors;
  if (typeof cpuConnectors !== "number" || typeof pcieConnectors !== "number") {
    return null;
  }

  const problems: string[] = [];
  if (motherboard && cpuConnectors < 1) {
    problems.push("no CPU power connector");
  }
  if (gpus.length > pcieConnectors) {
    problems.push(`only ${pcieConnectors} PCIe power connector(s) for ${gpus.length} installed GPU(s)`);
  }

  const compatible = problems.length === 0;
  return {
    ruleKey: "psuConnectors",
    compatible,
    severity: compatible ? "INFO" : "WARNING",
    message: compatible
      ? "PSU has enough CPU/PCIe power connectors for the installed components (basic count check)."
      : `PSU connector count may be insufficient: ${problems.join("; ")}.`,
    affectedComponents: ["PSU", "MOTHERBOARD", "GPU"],
  };
}
