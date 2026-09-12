import { z } from "zod";
import type { HotFields } from "../types";

// Fallback schema for categories that don't have a dedicated schema yet (HDD,
// PCIe expansion cards, capture cards, RGB/fan controllers, custom cables,
// RGB strips, sound cards, keyboards, mice, speakers, headphones, webcams,
// ...). Accepts any JSON object — validates shape (must be an object), not
// content. Adding a real schema for one of these later is a new file plus a
// registry entry, never a change to this one.
export const genericSpecSchema = z.record(z.string(), z.unknown());

export type GenericSpec = z.infer<typeof genericSpecSchema>;

export function extractGenericHotFields(_spec: GenericSpec): HotFields {
  return {};
}
