import type { CategoryKey, HotFields } from "@pcbuilder/component-models";

// One physical component present in a build, as the engine needs it. Deliberately
// plain data (no Prisma types, no UI state) so the engine stays framework-agnostic
// per ARCHITECTURE.md §6 — callers (API route, client-side live check) are
// responsible for shaping a `Component` + `BuildComponent` row into this.
export interface BuildComponentInput {
  componentId: string;
  categoryKey: CategoryKey;
  quantity: number;
  hotFields: HotFields;
  specifications: Record<string, unknown>;
}

// The full input to a compatibility check: every component currently placed in a
// build, regardless of category. Rules (Milestone 2) pick out the categories they
// care about and skip themselves when a required category isn't present yet.
export interface CompatibilityCheckInput {
  components: BuildComponentInput[];
}

export type Severity = "INFO" | "WARNING" | "ERROR";

export interface CompatibilityResult {
  ruleKey: string;
  compatible: boolean;
  severity: Severity;
  message: string;
  affectedComponents: CategoryKey[];
}

export interface CompatibilityReport {
  overallStatus: "OK" | "WARNING" | "ERROR";
  results: CompatibilityResult[];
  estimatedPowerWatts: number;
  recommendedPsuWattage: number;
}

// A single compatibility rule. Returns `null` when it doesn't apply to the given
// build (e.g. the categories it checks aren't both present yet) rather than
// forcing every rule to special-case "nothing to check" as a result entry.
// Implemented per rule under rules/ starting in Milestone 2 — this scaffold ships
// with zero rules registered.
export type CompatibilityRule = (input: CompatibilityCheckInput) => CompatibilityResult | null;
