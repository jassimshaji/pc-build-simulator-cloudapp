import type { CompatibilityCheckInput, CompatibilityResult } from "../types";
import { firstOf } from "./utils";

// motherboard.formFactor must be one of case.supportedMotherboardFormFactors.
// Reads the full array straight out of `specifications` rather than the
// case's `formFactor` hot column, since that hot field only captures the
// case's largest/primary supported size for coarse catalog filtering (see
// component-models/src/categories/case.ts) — the actual check needs the
// full supported range. ERROR on violation: a board that doesn't fit the
// case's motherboard tray physically cannot be installed.
export function checkCaseFormFactor(build: CompatibilityCheckInput): CompatibilityResult | null {
  const motherboard = firstOf(build, "MOTHERBOARD");
  const pcCase = firstOf(build, "CASE");
  if (!motherboard || !pcCase) {
    return null;
  }

  const motherboardFormFactor = motherboard.hotFields.formFactor;
  const supportedFormFactors = pcCase.specifications.supportedMotherboardFormFactors;
  if (!motherboardFormFactor || !Array.isArray(supportedFormFactors)) {
    return null;
  }

  const compatible = supportedFormFactors.includes(motherboardFormFactor);
  return {
    ruleKey: "caseFormFactor",
    compatible,
    severity: compatible ? "INFO" : "ERROR",
    message: compatible
      ? `Motherboard form factor ${motherboardFormFactor} is supported by this case.`
      : `Motherboard form factor ${motherboardFormFactor} is not supported by this case (supports: ${supportedFormFactors.join(", ")}).`,
    affectedComponents: ["MOTHERBOARD", "CASE"],
  };
}
