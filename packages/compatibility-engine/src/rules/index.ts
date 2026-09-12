import type { CompatibilityRule } from "../types";
import { checkCpuSocket } from "./cpuSocket";
import { checkRamTypeMatch, checkRamCapacity, checkRamModuleCount } from "./ramCompatibility";
import { checkGpuLengthClearance, checkGpuSlotWidth } from "./gpuClearance";
import { checkCaseFormFactor } from "./caseFormFactor";
import {
  checkAirCoolerSocketSupport,
  checkAirCoolerClearance,
  checkAioCoolerSocketSupport,
  checkAioRadiatorMountSupport,
} from "./coolingCompatibility";
import { checkM2SlotAvailability, checkSataPortAvailability } from "./storageInterface";
import { checkPsuWattage, checkPsuConnectors } from "./psuPower";

// Every registered rule, in no particular order (engine.ts runs all of them
// and each is independent). Add new rules here — this is the only place
// engine.ts needs to change as rules are added.
export const ALL_RULES: CompatibilityRule[] = [
  checkCpuSocket,
  checkRamTypeMatch,
  checkRamCapacity,
  checkRamModuleCount,
  checkGpuLengthClearance,
  checkGpuSlotWidth,
  checkCaseFormFactor,
  checkAirCoolerSocketSupport,
  checkAirCoolerClearance,
  checkAioCoolerSocketSupport,
  checkAioRadiatorMountSupport,
  checkM2SlotAvailability,
  checkSataPortAvailability,
  checkPsuWattage,
  checkPsuConnectors,
];
