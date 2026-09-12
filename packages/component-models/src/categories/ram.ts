import { z } from "zod";
import type { HotFields } from "../types";

export const ramSpecSchema = z.object({
  memoryCapacityGb: z.number().positive(),
  numberOfModules: z.number().int().positive(),
  memoryType: z.enum(["DDR4", "DDR5"]),
  speedMtS: z.number().positive(),
  casLatency: z.number().positive().optional(),
  voltage: z.number().positive().optional(),
  formFactor: z.enum(["UDIMM", "SODIMM"]).default("UDIMM"),
  rgb: z.boolean().optional(),
});

export type RamSpec = z.infer<typeof ramSpecSchema>;

export function extractRamHotFields(spec: RamSpec): HotFields {
  return {
    formFactor: spec.formFactor,
    ramType: spec.memoryType,
  };
}
