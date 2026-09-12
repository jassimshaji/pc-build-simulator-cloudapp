import type { CompatibilityCheckInput, CompatibilityResult } from "../types";
import { firstOf } from "./utils";

// gpu.lengthMm <= case.maxGpuLengthMm — a hard physical clearance, ERROR on
// violation. Only runs once a GPU and a case are both present.
export function checkGpuLengthClearance(
  build: CompatibilityCheckInput,
): CompatibilityResult | null {
  const gpu = firstOf(build, "GPU");
  const pcCase = firstOf(build, "CASE");
  if (!gpu || !pcCase) {
    return null;
  }

  const gpuLengthMm = gpu.hotFields.lengthMm;
  const maxGpuLengthMm = pcCase.specifications.maxGpuLengthMm;
  if (typeof gpuLengthMm !== "number" || typeof maxGpuLengthMm !== "number") {
    return null;
  }

  const compatible = gpuLengthMm <= maxGpuLengthMm;
  return {
    ruleKey: "gpuLengthClearance",
    compatible,
    severity: compatible ? "INFO" : "ERROR",
    message: compatible
      ? `GPU length ${gpuLengthMm}mm fits within the case's ${maxGpuLengthMm}mm clearance.`
      : `GPU length ${gpuLengthMm}mm exceeds the case's ${maxGpuLengthMm}mm clearance.`,
    affectedComponents: ["GPU", "CASE"],
  };
}

// gpu.slotWidth <= motherboard.pcieSlots — a coarser proxy check (the schema
// doesn't track expansion-slot spacing/availability, only the board's total
// PCIe slot count), so a violation is WARNING rather than ERROR. Only runs
// once a GPU and a motherboard are both present.
export function checkGpuSlotWidth(build: CompatibilityCheckInput): CompatibilityResult | null {
  const gpu = firstOf(build, "GPU");
  const motherboard = firstOf(build, "MOTHERBOARD");
  if (!gpu || !motherboard) {
    return null;
  }

  const slotWidth = gpu.specifications.slotWidth;
  const pcieSlots = motherboard.specifications.pcieSlots;
  if (typeof slotWidth !== "number" || typeof pcieSlots !== "number") {
    return null;
  }

  const compatible = slotWidth <= pcieSlots;
  return {
    ruleKey: "gpuSlotWidth",
    compatible,
    severity: compatible ? "INFO" : "WARNING",
    message: compatible
      ? `GPU's ${slotWidth}-slot width fits within the motherboard's ${pcieSlots} PCIe slots.`
      : `GPU's ${slotWidth}-slot width may not fit the motherboard's ${pcieSlots} PCIe slots — verify slot spacing.`,
    affectedComponents: ["GPU", "MOTHERBOARD"],
  };
}
