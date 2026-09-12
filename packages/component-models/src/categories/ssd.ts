import { z } from "zod";
import type { HotFields } from "../types";

export const ssdSpecSchema = z.object({
  capacityGb: z.number().positive(),
  formFactor: z.enum(["M.2 NVMe", "M.2 SATA", "SATA 2.5\""]),
  interface: z.string(),
  readSpeedMbS: z.number().positive().optional(),
  writeSpeedMbS: z.number().positive().optional(),
  pcieGeneration: z.string().optional(),
  nandType: z.string().optional(),
  dramCache: z.boolean().optional(),
  enduranceTbw: z.number().positive().optional(),
});

export type SsdSpec = z.infer<typeof ssdSpecSchema>;

export function extractSsdHotFields(spec: SsdSpec): HotFields {
  return {
    pcieGeneration: spec.pcieGeneration,
  };
}
