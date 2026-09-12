import { z } from "zod";
import type { HotFields } from "../types";

export const aioCoolerSpecSchema = z.object({
  radiatorSizeMm: z.union([
    z.literal(120),
    z.literal(240),
    z.literal(280),
    z.literal(360),
    z.literal(420),
  ]),
  radiatorThicknessMm: z.number().positive().optional(),
  fanCount: z.number().int().positive(),
  pump: z.string().optional(),
  tubingMm: z.number().positive().optional(),
  socketCompatibility: z.array(z.string()).min(1),
  rgb: z.boolean().optional(),
  supportedMountingPositions: z.array(z.string()).optional(),
});

export type AioCoolerSpec = z.infer<typeof aioCoolerSpecSchema>;

export function extractAioCoolerHotFields(_spec: AioCoolerSpec): HotFields {
  // Radiator size (120/240/280/360/420mm) isn't a 3D length/width/height in
  // the sense the hot columns model (see GPU/Case) — it's checked against a
  // case's `radiatorSupport` list, not a numeric range, so nothing here maps
  // cleanly onto the documented hot fields. Left entirely to `specifications`
  // for the compatibility engine (Phase 3) to read directly.
  return {};
}
