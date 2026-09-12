import type { CompatibilityCheckInput, CompatibilityResult } from "../types";
import { firstOf } from "./utils";

// Air and AIO coolers have different physical constraints (a case height
// clearance vs. a radiator mount), so each gets its own pair of checks rather
// than one combined "cooling" rule — a build can only have one or the other
// installed anyway (checked independently; nothing here assumes both are
// present at once).

export function checkAirCoolerSocketSupport(
  build: CompatibilityCheckInput,
): CompatibilityResult | null {
  const cooler = firstOf(build, "AIR_COOLER");
  const cpu = firstOf(build, "CPU");
  if (!cooler || !cpu) {
    return null;
  }

  const cpuSocket = cpu.hotFields.socket;
  const socketCompatibility = cooler.specifications.socketCompatibility;
  if (!cpuSocket || !Array.isArray(socketCompatibility)) {
    return null;
  }

  const compatible = socketCompatibility.includes(cpuSocket);
  return {
    ruleKey: "airCoolerSocketSupport",
    compatible,
    severity: compatible ? "INFO" : "ERROR",
    message: compatible
      ? `Air cooler supports CPU socket ${cpuSocket}.`
      : `Air cooler does not support CPU socket ${cpuSocket} (supports: ${socketCompatibility.join(", ")}).`,
    affectedComponents: ["AIR_COOLER", "CPU"],
  };
}

export function checkAirCoolerClearance(
  build: CompatibilityCheckInput,
): CompatibilityResult | null {
  const cooler = firstOf(build, "AIR_COOLER");
  const pcCase = firstOf(build, "CASE");
  if (!cooler || !pcCase) {
    return null;
  }

  const coolerHeightMm = cooler.hotFields.heightMm;
  const maxCpuCoolerHeightMm = pcCase.specifications.maxCpuCoolerHeightMm;
  if (typeof coolerHeightMm !== "number" || typeof maxCpuCoolerHeightMm !== "number") {
    return null;
  }

  const compatible = coolerHeightMm <= maxCpuCoolerHeightMm;
  return {
    ruleKey: "airCoolerClearance",
    compatible,
    severity: compatible ? "INFO" : "ERROR",
    message: compatible
      ? `Air cooler height ${coolerHeightMm}mm fits within the case's ${maxCpuCoolerHeightMm}mm clearance.`
      : `Air cooler height ${coolerHeightMm}mm exceeds the case's ${maxCpuCoolerHeightMm}mm clearance.`,
    affectedComponents: ["AIR_COOLER", "CASE"],
  };
}

export function checkAioCoolerSocketSupport(
  build: CompatibilityCheckInput,
): CompatibilityResult | null {
  const cooler = firstOf(build, "AIO_COOLER");
  const cpu = firstOf(build, "CPU");
  if (!cooler || !cpu) {
    return null;
  }

  const cpuSocket = cpu.hotFields.socket;
  const socketCompatibility = cooler.specifications.socketCompatibility;
  if (!cpuSocket || !Array.isArray(socketCompatibility)) {
    return null;
  }

  const compatible = socketCompatibility.includes(cpuSocket);
  return {
    ruleKey: "aioCoolerSocketSupport",
    compatible,
    severity: compatible ? "INFO" : "ERROR",
    message: compatible
      ? `AIO cooler supports CPU socket ${cpuSocket}.`
      : `AIO cooler does not support CPU socket ${cpuSocket} (supports: ${socketCompatibility.join(", ")}).`,
    affectedComponents: ["AIO_COOLER", "CPU"],
  };
}

// case.radiatorSupport is free-text (e.g. "240mm front", "280mm top" — see
// packages/database/prisma/seed.ts), not a clean enum, so this matches by
// substring ("Nmm") rather than exact string equality. That makes a real
// mismatch WARNING rather than ERROR: a false "unsupported" reading (a
// differently-worded entry for a mount that does fit) is plausible, and this
// check would rather under-block than falsely hard-block a valid build.
export function checkAioRadiatorMountSupport(
  build: CompatibilityCheckInput,
): CompatibilityResult | null {
  const cooler = firstOf(build, "AIO_COOLER");
  const pcCase = firstOf(build, "CASE");
  if (!cooler || !pcCase) {
    return null;
  }

  const radiatorSizeMm = cooler.specifications.radiatorSizeMm;
  const radiatorSupport = pcCase.specifications.radiatorSupport;
  if (typeof radiatorSizeMm !== "number" || !Array.isArray(radiatorSupport)) {
    return null;
  }

  const sizeToken = `${radiatorSizeMm}mm`;
  const compatible = radiatorSupport.some(
    (entry) => typeof entry === "string" && entry.includes(sizeToken),
  );
  return {
    ruleKey: "aioRadiatorMountSupport",
    compatible,
    severity: compatible ? "INFO" : "WARNING",
    message: compatible
      ? `Case supports a ${sizeToken} radiator mount.`
      : `Case's listed radiator mounts (${radiatorSupport.join(", ") || "none"}) may not fit a ${sizeToken} radiator — verify before installing.`,
    affectedComponents: ["AIO_COOLER", "CASE"],
  };
}
