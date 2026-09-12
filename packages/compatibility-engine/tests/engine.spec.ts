import { describe, expect, it } from "vitest";
import { runCompatibilityCheck } from "../src/engine";
import type { CompatibilityCheckInput } from "../src/types";

describe("runCompatibilityCheck (Milestone 1 scaffold — no rules registered yet)", () => {
  it("returns an OK report with no results for an empty build", () => {
    const input: CompatibilityCheckInput = { components: [] };

    const report = runCompatibilityCheck(input);

    expect(report.overallStatus).toBe("OK");
    expect(report.results).toEqual([]);
    expect(report.estimatedPowerWatts).toBe(0);
    expect(report.recommendedPsuWattage).toBe(0);
  });

  it("still returns an OK report with a populated build, since no rules run yet", () => {
    const input: CompatibilityCheckInput = {
      components: [
        {
          componentId: "c1",
          categoryKey: "CPU",
          quantity: 1,
          hotFields: { socket: "AM5", tdpWatts: 105 },
          specifications: { socket: "AM5", tdpWatts: 105 },
        },
      ],
    };

    const report = runCompatibilityCheck(input);

    expect(report.overallStatus).toBe("OK");
    expect(report.results).toEqual([]);
  });
});
