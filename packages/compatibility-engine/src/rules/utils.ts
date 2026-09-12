import type { CategoryKey } from "@pcbuilder/component-models";
import type { BuildComponentInput, CompatibilityCheckInput } from "../types";

// Shared helpers for reading a `CompatibilityCheckInput` from rule modules.
// Kept internal to the package (not re-exported from src/index.ts) — rules are
// the only intended consumer.

export function componentsOf(
  build: CompatibilityCheckInput,
  categoryKey: CategoryKey,
): BuildComponentInput[] {
  return build.components.filter((component) => component.categoryKey === categoryKey);
}

// Most build slots (CPU, motherboard, case, PSU) hold at most one component in
// practice. Rules that only make sense for a single occupant use this rather
// than reasoning about arrays.
export function firstOf(
  build: CompatibilityCheckInput,
  categoryKey: CategoryKey,
): BuildComponentInput | undefined {
  return componentsOf(build, categoryKey)[0];
}

// Sums a numeric spec field across a list of components, multiplying by each
// component's `quantity` (e.g. two identical RAM kits placed in the same
// build). Missing/non-numeric values are treated as 0 rather than throwing,
// since specifications are only Zod-validated per category, not guaranteed to
// carry every optional field.
export function sumBy(components: BuildComponentInput[], field: string): number {
  return components.reduce((total, component) => {
    const value = component.specifications[field];
    return total + (typeof value === "number" ? value * component.quantity : 0);
  }, 0);
}
