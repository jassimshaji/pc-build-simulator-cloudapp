import { z } from "zod";
import type { HotFields } from "../types";

export const monitorSpecSchema = z.object({
  screenSizeInches: z.number().positive(),
  resolution: z.string(),
  refreshRateHz: z.number().positive(),
  panelType: z.enum(["IPS", "VA", "TN", "OLED", "Mini LED"]),
  responseTimeMs: z.number().positive().optional(),
  hdr: z.string().optional(),
  brightnessNits: z.number().positive().optional(),
  contrastRatio: z.string().optional(),
  colorCoverage: z.string().optional(),
  adaptiveSync: z.enum(["None", "FreeSync", "G-SYNC", "Adaptive Sync"]).optional(),
  ports: z.array(z.string()).optional(),
  curved: z.boolean().optional(),
  aspectRatio: z.string().optional(),
});

export type MonitorSpec = z.infer<typeof monitorSpecSchema>;

export function extractMonitorHotFields(_spec: MonitorSpec): HotFields {
  // Monitors sit outside the PC case and aren't part of any of the documented
  // hot-column compatibility checks — nothing to promote.
  return {};
}
