import { z } from "zod";
import type { HotFields } from "../types";

export const caseLcdSpecSchema = z.object({
  displaySizeInches: z.number().positive(),
  resolution: z.string(),
  interface: z.string(),
  refreshRateHz: z.number().positive().optional(),
  mountingType: z.string().optional(),
  brightnessNits: z.number().positive().optional(),
});

export type CaseLcdSpec = z.infer<typeof caseLcdSpecSchema>;

export function extractCaseLcdHotFields(_spec: CaseLcdSpec): HotFields {
  return {};
}
