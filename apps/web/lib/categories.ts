// Static placeholder list mirroring packages/database/prisma/seed.ts's
// ComponentCategory rows. Phase 1, Milestone 5 replaces this with a real
// `/api/components/categories` fetch — this exists only so the app shell has
// something to render before that API exists.
export const CATEGORIES = [
  { key: "CPU", label: "CPU" },
  { key: "MOTHERBOARD", label: "Motherboard" },
  { key: "GPU", label: "Graphics Card" },
  { key: "RAM", label: "RAM" },
  { key: "SSD", label: "SSD" },
  { key: "PSU", label: "Power Supply" },
  { key: "CASE", label: "PC Case" },
  { key: "AIR_COOLER", label: "Air Cooler" },
  { key: "AIO_COOLER", label: "AIO Liquid Cooler" },
  { key: "FAN", label: "Cooling Fan" },
  { key: "MONITOR", label: "Monitor" },
  { key: "CASE_LCD", label: "Case LCD Display" },
] as const;
