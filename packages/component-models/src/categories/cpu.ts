import { z } from "zod";
import type { HotFields } from "../types";

export const cpuSpecSchema = z.object({
  socket: z.string(),
  architecture: z.string(),
  coreCount: z.number().int().positive(),
  threadCount: z.number().int().positive(),
  baseClockGhz: z.number().positive(),
  boostClockGhz: z.number().positive(),
  cacheMb: z.number().positive(),
  tdpWatts: z.number().positive(),
  maxPowerWatts: z.number().positive().optional(),
  integratedGraphics: z.string().optional(),
  memorySupport: z.array(z.enum(["DDR4", "DDR5"])),
  pcieGeneration: z.string(),
});

export type CpuSpec = z.infer<typeof cpuSpecSchema>;

export function extractCpuHotFields(spec: CpuSpec): HotFields {
  return {
    socket: spec.socket,
    tdpWatts: spec.tdpWatts,
    pcieGeneration: spec.pcieGeneration,
  };
}
