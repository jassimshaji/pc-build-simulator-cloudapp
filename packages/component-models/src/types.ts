// Mirrors the ComponentCategory.key values seeded in
// packages/database/prisma/seed.ts. Kept as a plain string-literal union (not
// re-exported from an enum on the Prisma side) because ComponentCategory is a
// data table, not a schema enum — see ARCHITECTURE.md §4.3. Adding a new
// category later means adding a new seed row + a new schema file here, not
// touching this list's consumers.
export const CATEGORY_KEYS = [
  "CPU",
  "MOTHERBOARD",
  "GPU",
  "RAM",
  "SSD",
  "PSU",
  "CASE",
  "AIR_COOLER",
  "AIO_COOLER",
  "FAN",
  "MONITOR",
  "CASE_LCD",
] as const;

export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export function isCategoryKey(value: string): value is CategoryKey {
  return (CATEGORY_KEYS as readonly string[]).includes(value);
}

// Mirrors the nullable "hot" columns on the Prisma `Component` model (see
// ARCHITECTURE.md §4.1 / DECISIONS.md ADR-002). Only fields actually used for
// cross-category compatibility/range checks or catalog filtering get promoted
// here — everything else stays in the JSONB `specifications` blob only.
export interface HotFields {
  socket?: string;
  formFactor?: string;
  ramType?: string;
  pcieGeneration?: string;
  lengthMm?: number;
  widthMm?: number;
  heightMm?: number;
  tdpWatts?: number;
  powerDrawWatts?: number;
  wattage?: number;
}
