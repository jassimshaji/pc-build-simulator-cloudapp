import type { CompatibilityCheckInput, CompatibilityResult } from "../types";
import { componentsOf, firstOf } from "./utils";

function isM2(formFactor: unknown): boolean {
  return formFactor === "M.2 NVMe" || formFactor === "M.2 SATA";
}

function isSata2Point5(formFactor: unknown): boolean {
  return formFactor === "SATA 2.5\"";
}

// Counts installed M.2 drives (NVMe or SATA — both occupy an M.2 slot) against
// the motherboard's m2Slots. Only runs once at least one M.2 SSD and a
// motherboard are present, so a build with only 2.5" SATA drives doesn't
// trigger an irrelevant result.
export function checkM2SlotAvailability(
  build: CompatibilityCheckInput,
): CompatibilityResult | null {
  const ssds = componentsOf(build, "SSD").filter((ssd) => isM2(ssd.specifications.formFactor));
  const motherboard = firstOf(build, "MOTHERBOARD");
  if (ssds.length === 0 || !motherboard) {
    return null;
  }

  const m2Slots = motherboard.specifications.m2Slots;
  if (typeof m2Slots !== "number") {
    return null;
  }

  const installedCount = ssds.reduce((total, ssd) => total + ssd.quantity, 0);
  const compatible = installedCount <= m2Slots;
  return {
    ruleKey: "m2SlotAvailability",
    compatible,
    severity: compatible ? "INFO" : "ERROR",
    message: compatible
      ? `${installedCount} M.2 drive(s) fit within the motherboard's ${m2Slots} M.2 slots.`
      : `${installedCount} M.2 drive(s) exceed the motherboard's ${m2Slots} M.2 slots.`,
    affectedComponents: ["SSD", "MOTHERBOARD"],
  };
}

// Same idea for 2.5" SATA drives against the motherboard's sataPorts.
export function checkSataPortAvailability(
  build: CompatibilityCheckInput,
): CompatibilityResult | null {
  const ssds = componentsOf(build, "SSD").filter((ssd) =>
    isSata2Point5(ssd.specifications.formFactor),
  );
  const motherboard = firstOf(build, "MOTHERBOARD");
  if (ssds.length === 0 || !motherboard) {
    return null;
  }

  const sataPorts = motherboard.specifications.sataPorts;
  if (typeof sataPorts !== "number") {
    return null;
  }

  const installedCount = ssds.reduce((total, ssd) => total + ssd.quantity, 0);
  const compatible = installedCount <= sataPorts;
  return {
    ruleKey: "sataPortAvailability",
    compatible,
    severity: compatible ? "INFO" : "ERROR",
    message: compatible
      ? `${installedCount} SATA drive(s) fit within the motherboard's ${sataPorts} SATA ports.`
      : `${installedCount} SATA drive(s) exceed the motherboard's ${sataPorts} SATA ports.`,
    affectedComponents: ["SSD", "MOTHERBOARD"],
  };
}
