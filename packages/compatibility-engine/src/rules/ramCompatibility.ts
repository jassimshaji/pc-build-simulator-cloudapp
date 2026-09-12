import type { CompatibilityCheckInput, CompatibilityResult } from "../types";
import { componentsOf, firstOf, sumBy } from "./utils";

// Three independent RAM/motherboard checks, each its own rule entry in the
// report (ARCHITECTURE.md §6 groups them under one file, but a mismatch in one
// shouldn't hide the others). All three only run once at least one RAM
// component and a motherboard are both present.

export function checkRamTypeMatch(build: CompatibilityCheckInput): CompatibilityResult | null {
  const ramSticks = componentsOf(build, "RAM");
  const motherboard = firstOf(build, "MOTHERBOARD");
  if (ramSticks.length === 0 || !motherboard) {
    return null;
  }

  const motherboardRamType = motherboard.hotFields.ramType;
  if (!motherboardRamType) {
    return null;
  }

  const mismatched = ramSticks.filter((ram) => ram.hotFields.ramType !== motherboardRamType);
  const compatible = mismatched.length === 0;
  return {
    ruleKey: "ramTypeMatch",
    compatible,
    severity: compatible ? "INFO" : "ERROR",
    message: compatible
      ? `All installed RAM is ${motherboardRamType}, matching the motherboard.`
      : `Motherboard supports ${motherboardRamType} RAM, but ${mismatched.length} installed RAM module(s) are a different type.`,
    affectedComponents: ["RAM", "MOTHERBOARD"],
  };
}

export function checkRamCapacity(build: CompatibilityCheckInput): CompatibilityResult | null {
  const ramSticks = componentsOf(build, "RAM");
  const motherboard = firstOf(build, "MOTHERBOARD");
  if (ramSticks.length === 0 || !motherboard) {
    return null;
  }

  const maxRamGb = motherboard.specifications.maxRamGb;
  if (typeof maxRamGb !== "number") {
    return null;
  }

  const installedGb = sumBy(ramSticks, "memoryCapacityGb");
  const compatible = installedGb <= maxRamGb;
  return {
    ruleKey: "ramCapacity",
    compatible,
    severity: compatible ? "INFO" : "ERROR",
    message: compatible
      ? `${installedGb}GB installed is within the motherboard's ${maxRamGb}GB maximum.`
      : `${installedGb}GB installed exceeds the motherboard's ${maxRamGb}GB maximum.`,
    affectedComponents: ["RAM", "MOTHERBOARD"],
  };
}

export function checkRamModuleCount(build: CompatibilityCheckInput): CompatibilityResult | null {
  const ramSticks = componentsOf(build, "RAM");
  const motherboard = firstOf(build, "MOTHERBOARD");
  if (ramSticks.length === 0 || !motherboard) {
    return null;
  }

  const ramSlots = motherboard.specifications.ramSlots;
  if (typeof ramSlots !== "number") {
    return null;
  }

  const installedModules = sumBy(ramSticks, "numberOfModules");
  const compatible = installedModules <= ramSlots;
  return {
    ruleKey: "ramModuleCount",
    compatible,
    severity: compatible ? "INFO" : "ERROR",
    message: compatible
      ? `${installedModules} RAM module(s) fit within the motherboard's ${ramSlots} slots.`
      : `${installedModules} RAM module(s) exceed the motherboard's ${ramSlots} slots.`,
    affectedComponents: ["RAM", "MOTHERBOARD"],
  };
}
