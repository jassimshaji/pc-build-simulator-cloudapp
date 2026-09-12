import { z } from "zod";
import type { HotFields } from "../types";

export const gpuSpecSchema = z.object({
  gpuArchitecture: z.string(),
  vramCapacityGb: z.number().positive(),
  vramType: z.string(),
  memoryBusBit: z.number().positive().optional(),
  coreClockMhz: z.number().positive().optional(),
  boostClockMhz: z.number().positive().optional(),
  powerDrawWatts: z.number().positive(),
  recommendedPsuWattage: z.number().positive().optional(),
  powerConnectors: z.string().optional(),
  pcieGeneration: z.string(),
  rayTracingSupport: z.boolean().optional(),
  dlss: z.string().optional(),
  displayOutputs: z.array(z.string()).optional(),
  lengthMm: z.number().positive(),
  widthMm: z.number().positive(),
  heightMm: z.number().positive(),
  slotWidth: z.number().positive(),
  coolingType: z.string().optional(),
});

export type GpuSpec = z.infer<typeof gpuSpecSchema>;

export function extractGpuHotFields(spec: GpuSpec): HotFields {
  return {
    powerDrawWatts: spec.powerDrawWatts,
    pcieGeneration: spec.pcieGeneration,
    lengthMm: spec.lengthMm,
    widthMm: spec.widthMm,
    heightMm: spec.heightMm,
  };
}
