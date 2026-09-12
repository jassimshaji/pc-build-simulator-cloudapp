import type { CompatibilityCheckInput } from "./types";
import { componentsOf } from "./rules/utils";

// None of these categories carry a real power-draw field in their Zod schemas
// (component-models/src/categories/*.ts) — only CPU.tdpWatts and
// GPU.powerDrawWatts are promoted hot fields with real manufacturer data.
// These constants are deliberately rough, documented estimates rather than
// invented precision, used only until real per-component power data exists.
const MOTHERBOARD_BASELINE_WATTS = 30;
const RAM_MODULE_WATTS_ESTIMATE = 5;
const STORAGE_DRIVE_WATTS_ESTIMATE = 6;
const FAN_WATTS_FALLBACK = 3; // used only when a fan's own powerConsumptionWatts is missing
const AIO_PUMP_WATTS_ESTIMATE = 5;

export const DEFAULT_PSU_HEADROOM_MULTIPLIER = 1.25;

// Sums estimated power draw across every installed component. Real data
// (tdpWatts, powerDrawWatts, powerConsumptionWatts) is used where the schema
// provides it; everything else falls back to a small documented constant
// multiplied by installed quantity.
export function estimateSystemPower(build: CompatibilityCheckInput): number {
  let totalWatts = 0;

  for (const cpu of componentsOf(build, "CPU")) {
    totalWatts += (cpu.hotFields.tdpWatts ?? 0) * cpu.quantity;
  }

  for (const gpu of componentsOf(build, "GPU")) {
    totalWatts += (gpu.hotFields.powerDrawWatts ?? 0) * gpu.quantity;
  }

  for (const motherboard of componentsOf(build, "MOTHERBOARD")) {
    totalWatts += MOTHERBOARD_BASELINE_WATTS * motherboard.quantity;
  }

  for (const ram of componentsOf(build, "RAM")) {
    const modules =
      typeof ram.specifications.numberOfModules === "number"
        ? ram.specifications.numberOfModules
        : 1;
    totalWatts += RAM_MODULE_WATTS_ESTIMATE * modules * ram.quantity;
  }

  for (const ssd of componentsOf(build, "SSD")) {
    totalWatts += STORAGE_DRIVE_WATTS_ESTIMATE * ssd.quantity;
  }

  for (const fan of componentsOf(build, "FAN")) {
    const watts =
      typeof fan.specifications.powerConsumptionWatts === "number"
        ? fan.specifications.powerConsumptionWatts
        : FAN_WATTS_FALLBACK;
    totalWatts += watts * fan.quantity;
  }

  for (const aio of componentsOf(build, "AIO_COOLER")) {
    totalWatts += AIO_PUMP_WATTS_ESTIMATE * aio.quantity;
  }

  return totalWatts;
}

// Applies a headroom multiplier (default 1.25 per ARCHITECTURE.md §6) on top
// of the raw estimate, rounded up to a whole watt for display purposes.
export function calculateRecommendedPsuWattage(
  estimatedPowerWatts: number,
  headroomMultiplier: number = DEFAULT_PSU_HEADROOM_MULTIPLIER,
): number {
  return Math.ceil(estimatedPowerWatts * headroomMultiplier);
}
