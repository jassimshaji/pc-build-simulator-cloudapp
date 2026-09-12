import { z } from "zod";
import type { HotFields } from "../types";

export const airCoolerSpecSchema = z.object({
  coolerType: z.string().optional(),
  heightMm: z.number().positive(),
  fanSizeMm: z.number().positive().optional(),
  tdpRatingWatts: z.number().positive(),
  socketCompatibility: z.array(z.string()).min(1),
  dimensionsMm: z
    .object({ width: z.number().positive(), depth: z.number().positive() })
    .optional(),
});

export type AirCoolerSpec = z.infer<typeof airCoolerSpecSchema>;

export function extractAirCoolerHotFields(spec: AirCoolerSpec): HotFields {
  // No single `socket` hot field: a cooler supports a *list* of sockets, which
  // doesn't fit the single-value equality check the `socket` column is for
  // (see ARCHITECTURE.md §4.1 — socket is documented only for CPU/Motherboard).
  // Socket compatibility is checked against `specifications.socketCompatibility`
  // directly in the compatibility engine (Phase 3).
  return {
    heightMm: spec.heightMm,
  };
}
