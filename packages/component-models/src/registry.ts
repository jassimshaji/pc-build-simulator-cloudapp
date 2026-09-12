import type { z } from "zod";
import type { CategoryKey, HotFields } from "./types";
import { cpuSpecSchema, extractCpuHotFields } from "./categories/cpu";
import { motherboardSpecSchema, extractMotherboardHotFields } from "./categories/motherboard";
import { gpuSpecSchema, extractGpuHotFields } from "./categories/gpu";
import { ramSpecSchema, extractRamHotFields } from "./categories/ram";
import { ssdSpecSchema, extractSsdHotFields } from "./categories/ssd";
import { psuSpecSchema, extractPsuHotFields } from "./categories/psu";
import { caseSpecSchema, extractCaseHotFields } from "./categories/case";
import { airCoolerSpecSchema, extractAirCoolerHotFields } from "./categories/airCooler";
import { aioCoolerSpecSchema, extractAioCoolerHotFields } from "./categories/aioCooler";
import { fanSpecSchema, extractFanHotFields } from "./categories/fan";
import { monitorSpecSchema, extractMonitorHotFields } from "./categories/monitor";
import { caseLcdSpecSchema, extractCaseLcdHotFields } from "./categories/caseLcd";
import { genericSpecSchema, extractGenericHotFields } from "./categories/generic";

// Single lookup point mapping a ComponentCategory.key to its Zod schema and
// hot-field extractor. This is the ONLY place that needs a new entry when a
// new category schema is added — everything else (admin forms, validation,
// hot-field population) should go through the functions below rather than
// switching on category keys themselves.
// `Spec` defaults to `any` (not `unknown`) deliberately: this interface is
// used as a heterogeneous map's value type below, where each entry's real
// Spec type differs (CpuSpec, GpuSpec, ...). `unknown` would make every
// concrete `extractXHotFields` function un-assignable here (function
// parameters are contravariant), whereas `any` lets each category keep its
// own precise, safe types in its own file while the registry itself is
// intentionally type-erased.
interface CategoryDefinition<Spec = any> {
  schema: z.ZodType<Spec>;
  extractHotFields: (spec: Spec) => HotFields;
}

const CATEGORY_REGISTRY: Record<CategoryKey, CategoryDefinition> = {
  CPU: { schema: cpuSpecSchema, extractHotFields: extractCpuHotFields },
  MOTHERBOARD: { schema: motherboardSpecSchema, extractHotFields: extractMotherboardHotFields },
  GPU: { schema: gpuSpecSchema, extractHotFields: extractGpuHotFields },
  RAM: { schema: ramSpecSchema, extractHotFields: extractRamHotFields },
  SSD: { schema: ssdSpecSchema, extractHotFields: extractSsdHotFields },
  PSU: { schema: psuSpecSchema, extractHotFields: extractPsuHotFields },
  CASE: { schema: caseSpecSchema, extractHotFields: extractCaseHotFields },
  AIR_COOLER: { schema: airCoolerSpecSchema, extractHotFields: extractAirCoolerHotFields },
  AIO_COOLER: { schema: aioCoolerSpecSchema, extractHotFields: extractAioCoolerHotFields },
  FAN: { schema: fanSpecSchema, extractHotFields: extractFanHotFields },
  MONITOR: { schema: monitorSpecSchema, extractHotFields: extractMonitorHotFields },
  CASE_LCD: { schema: caseLcdSpecSchema, extractHotFields: extractCaseLcdHotFields },
};

function definitionFor(categoryKey: string): CategoryDefinition {
  return CATEGORY_REGISTRY[categoryKey as CategoryKey] ?? {
    schema: genericSpecSchema,
    extractHotFields: extractGenericHotFields,
  };
}

export function getSpecSchema(categoryKey: string): z.ZodType {
  return definitionFor(categoryKey).schema;
}

// Validates a component's `specifications` JSON against its category's
// schema. Falls back to the permissive generic schema for any category key
// not in CATEGORY_REGISTRY (future categories — see categories/generic.ts).
export function validateSpecifications(categoryKey: string, specifications: unknown) {
  return getSpecSchema(categoryKey).safeParse(specifications);
}

// Derives the `Component` hot-column values from an already-validated spec
// object. Callers should validate with `validateSpecifications` first and
// pass the *parsed* data here, not raw input.
export function extractHotFields(categoryKey: string, specifications: unknown): HotFields {
  const definition = definitionFor(categoryKey);
  const parsed = definition.schema.safeParse(specifications);
  if (!parsed.success) {
    return {};
  }
  return definition.extractHotFields(parsed.data);
}
