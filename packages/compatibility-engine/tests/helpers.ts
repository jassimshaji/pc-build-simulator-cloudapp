import type { CategoryKey, HotFields } from "@pcbuilder/component-models";
import type { BuildComponentInput, CompatibilityCheckInput } from "../src/types";

let nextId = 1;

// Minimal builder for a BuildComponentInput in tests — fills in a unique
// componentId and quantity: 1 by default so each test only has to specify the
// fields its rule actually reads.
export function component(
  categoryKey: CategoryKey,
  options: {
    hotFields?: HotFields;
    specifications?: Record<string, unknown>;
    quantity?: number;
  } = {},
): BuildComponentInput {
  return {
    componentId: `test-${nextId++}`,
    categoryKey,
    quantity: options.quantity ?? 1,
    hotFields: options.hotFields ?? {},
    specifications: options.specifications ?? {},
  };
}

export function build(...components: BuildComponentInput[]): CompatibilityCheckInput {
  return { components };
}
