import { z } from "zod";
import type { HotFields } from "../types";

export const caseSpecSchema = z.object({
  caseType: z.string(),
  supportedMotherboardFormFactors: z
    .array(z.enum(["ATX", "Micro-ATX", "Mini-ITX", "E-ATX"]))
    .min(1),
  maxGpuLengthMm: z.number().positive(),
  maxCpuCoolerHeightMm: z.number().positive(),
  radiatorSupport: z.array(z.string()).optional(),
  fanSupportMm: z.array(z.number().positive()).optional(),
  psuSupport: z.string().optional(),
  driveBays: z.record(z.string(), z.number().int().nonnegative()).optional(),
  frontIo: z.array(z.string()).optional(),
  dimensionsMm: z.object({
    height: z.number().positive(),
    width: z.number().positive(),
    depth: z.number().positive(),
  }),
  glassPanels: z.number().int().nonnegative().optional(),
  rgbSupport: z.boolean().optional(),
  includedFans: z.number().int().nonnegative().optional(),
});

export type CaseSpec = z.infer<typeof caseSpecSchema>;

export function extractCaseHotFields(spec: CaseSpec): HotFields {
  return {
    // The largest/primary supported form factor, by convention the first
    // entry (matches how packages/database/prisma/seed.ts orders the array) —
    // used for coarse catalog filtering ("cases that support ATX"), not for
    // the actual compatibility check (which reads the full array from
    // `specifications` instead, since a case supports a *range* of sizes).
    formFactor: spec.supportedMotherboardFormFactors[0],
    // The case's own external footprint, not its internal clearances
    // (maxGpuLengthMm/maxCpuCoolerHeightMm stay JSONB-only — the
    // compatibility engine reads those directly off the fetched row).
    widthMm: spec.dimensionsMm.width,
    heightMm: spec.dimensionsMm.height,
    lengthMm: spec.dimensionsMm.depth,
  };
}
