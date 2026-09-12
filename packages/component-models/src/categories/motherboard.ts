import { z } from "zod";
import type { HotFields } from "../types";

export const motherboardSpecSchema = z.object({
  socket: z.string(),
  chipset: z.string(),
  formFactor: z.enum(["ATX", "Micro-ATX", "Mini-ITX", "E-ATX"]),
  ramSlots: z.number().int().positive(),
  maxRamGb: z.number().int().positive(),
  ramType: z.enum(["DDR4", "DDR5"]),
  pcieSlots: z.number().int().nonnegative(),
  pcieGeneration: z.string().optional(),
  m2Slots: z.number().int().nonnegative(),
  sataPorts: z.number().int().nonnegative(),
  usbHeaders: z.number().int().nonnegative().optional(),
  rgbHeaders: z.number().int().nonnegative().optional(),
  cpuPowerConnectors: z.string().optional(),
  networking: z.string().optional(),
  wifi: z.string().optional(),
  bluetooth: z.string().optional(),
  audio: z.string().optional(),
  biosFeatures: z.array(z.string()).optional(),
  dimensionsMm: z
    .object({ width: z.number().positive(), depth: z.number().positive() })
    .optional(),
});

export type MotherboardSpec = z.infer<typeof motherboardSpecSchema>;

export function extractMotherboardHotFields(spec: MotherboardSpec): HotFields {
  return {
    socket: spec.socket,
    formFactor: spec.formFactor,
    ramType: spec.ramType,
    pcieGeneration: spec.pcieGeneration,
  };
}
