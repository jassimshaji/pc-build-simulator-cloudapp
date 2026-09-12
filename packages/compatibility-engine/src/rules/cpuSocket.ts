import type { CompatibilityCheckInput, CompatibilityResult } from "../types";
import { firstOf } from "./utils";

// CPU.socket must equal Motherboard.socket — a hard physical requirement, so a
// mismatch is always ERROR. Both categories' schemas require `socket`, but the
// hot field is still read defensively since it's only promoted from
// `specifications` at write time (see component-models' registry.ts).
export function checkCpuSocket(build: CompatibilityCheckInput): CompatibilityResult | null {
  const cpu = firstOf(build, "CPU");
  const motherboard = firstOf(build, "MOTHERBOARD");
  if (!cpu || !motherboard) {
    return null;
  }

  const cpuSocket = cpu.hotFields.socket;
  const motherboardSocket = motherboard.hotFields.socket;
  if (!cpuSocket || !motherboardSocket) {
    return null;
  }

  const compatible = cpuSocket === motherboardSocket;
  return {
    ruleKey: "cpuSocket",
    compatible,
    severity: compatible ? "INFO" : "ERROR",
    message: compatible
      ? `CPU socket ${cpuSocket} matches motherboard socket ${motherboardSocket}.`
      : `CPU socket ${cpuSocket} is not compatible with motherboard socket ${motherboardSocket}.`,
    affectedComponents: ["CPU", "MOTHERBOARD"],
  };
}
