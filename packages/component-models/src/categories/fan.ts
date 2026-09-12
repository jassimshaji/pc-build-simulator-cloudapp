import { z } from "zod";
import type { HotFields } from "../types";

export const fanSpecSchema = z.object({
  sizeMm: z.number().positive(),
  thicknessMm: z.number().positive().optional(),
  rpm: z.number().positive().optional(),
  airflowCfm: z.number().positive().optional(),
  staticPressureMmH2O: z.number().positive().optional(),
  noiseLevelDba: z.number().nonnegative().optional(),
  rgb: z.boolean().optional(),
  connectorType: z.string().optional(),
  powerConsumptionWatts: z.number().positive().optional(),
  bladeDirection: z.enum(["Forward Blade", "Reverse Blade"]).default("Forward Blade"),
});

export type FanSpec = z.infer<typeof fanSpecSchema>;

export function extractFanHotFields(_spec: FanSpec): HotFields {
  // Fan size/mount compatibility isn't one of the documented hot columns
  // (ARCHITECTURE.md §4.1) — left to `specifications` for now.
  return {};
}
