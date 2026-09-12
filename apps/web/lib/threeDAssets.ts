// Procedural generator names as documented in ARCHITECTURE.md §7.3. None of
// these functions exist yet (packages/three-d-engine is an empty stub until
// Phase 4) — recording which generator a component should use is a data
// decision the admin can make now; the generator catching up to that name is
// a later, independent step. This mirrors how ComponentCategory rows can
// exist before a matching Zod schema does (ARCHITECTURE.md §4.3).
export const PROCEDURAL_GENERATORS = [
  "createGenericMotherboard",
  "createGenericCPU",
  "createGenericGPU",
  "createGenericRAM",
  "createGenericPSU",
  "createGenericCase",
  "createGenericFan",
  "createGenericRadiator",
  "createGenericAIO",
  "createGenericSSD",
] as const;

export type ProceduralGenerator = (typeof PROCEDURAL_GENERATORS)[number];

// Suggests a sensible default generator for a category so the admin isn't
// starting from a blank dropdown — still just a suggestion, not enforced.
export const DEFAULT_GENERATOR_BY_CATEGORY: Record<string, ProceduralGenerator> = {
  CPU: "createGenericCPU",
  MOTHERBOARD: "createGenericMotherboard",
  GPU: "createGenericGPU",
  RAM: "createGenericRAM",
  SSD: "createGenericSSD",
  PSU: "createGenericPSU",
  CASE: "createGenericCase",
  AIR_COOLER: "createGenericFan",
  AIO_COOLER: "createGenericAIO",
  FAN: "createGenericFan",
};
