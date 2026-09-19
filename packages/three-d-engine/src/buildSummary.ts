// Pure roll-up of a build for the summary panel (workspace + public shared
// view). Kept framework-agnostic and free of Prisma/React so it's
// Vitest-testable, like the rest of this package's logic.

export interface SummaryLine {
  categoryKey: string;
  quantity: number;
  price: number; // unit price
}

export interface SummaryReport {
  results: { severity: "INFO" | "WARNING" | "ERROR" }[];
}

export interface BuildSummary {
  componentCount: number;
  totalPrice: number;
  // Categories a working PC needs that the build doesn't have yet, in
  // display order. Informational only — a partial build is still valid.
  missingEssentials: string[];
  issueCounts: { ERROR: number; WARNING: number; INFO: number };
}

// GPU is deliberately not essential: plenty of CPUs have integrated graphics.
export const ESSENTIAL_CATEGORIES = ["CPU", "MOTHERBOARD", "RAM", "SSD", "PSU", "CASE"] as const;

export function summarizeBuild(
  lines: SummaryLine[],
  report?: SummaryReport | null,
): BuildSummary {
  const present = new Set(lines.filter((line) => line.quantity > 0).map((line) => line.categoryKey));

  const issueCounts = { ERROR: 0, WARNING: 0, INFO: 0 };
  for (const result of report?.results ?? []) {
    issueCounts[result.severity] += 1;
  }

  return {
    componentCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    // Rounded to cents to avoid float noise like 1099.9999999999998.
    totalPrice: Math.round(lines.reduce((sum, line) => sum + line.price * line.quantity, 0) * 100) / 100,
    missingEssentials: ESSENTIAL_CATEGORIES.filter((key) => !present.has(key)),
    issueCounts,
  };
}
