import { z } from "zod";
import type { HotFields } from "../types";

export const psuSpecSchema = z.object({
  wattage: z.number().positive(),
  efficiencyCertification: z.enum([
    "80 PLUS",
    "80 PLUS Bronze",
    "80 PLUS Silver",
    "80 PLUS Gold",
    "80 PLUS Platinum",
    "80 PLUS Titanium",
  ]),
  modularType: z.enum(["Full", "Semi", "Non-Modular"]),
  formFactor: z.enum(["ATX", "SFX", "SFX-L"]),
  atxStandard: z.string().optional(),
  pciePowerConnectors: z.number().int().nonnegative(),
  cpuPowerConnectors: z.number().int().nonnegative(),
  sataConnectors: z.number().int().nonnegative().optional(),
  molexConnectors: z.number().int().nonnegative().optional(),
  fanSizeMm: z.number().positive().optional(),
  dimensionsMm: z.object({ length: z.number().positive() }).optional(),
});

export type PsuSpec = z.infer<typeof psuSpecSchema>;

export function extractPsuHotFields(spec: PsuSpec): HotFields {
  return {
    formFactor: spec.formFactor,
    wattage: spec.wattage,
  };
}
