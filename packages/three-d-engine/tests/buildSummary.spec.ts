import { describe, expect, it } from "vitest";
import { summarizeBuild } from "../src/buildSummary";

describe("summarizeBuild", () => {
  it("reports every essential category missing for an empty build", () => {
    const summary = summarizeBuild([]);
    expect(summary.componentCount).toBe(0);
    expect(summary.totalPrice).toBe(0);
    expect(summary.missingEssentials).toEqual(["CPU", "MOTHERBOARD", "RAM", "SSD", "PSU", "CASE"]);
    expect(summary.issueCounts).toEqual({ ERROR: 0, WARNING: 0, INFO: 0 });
  });

  it("sums price x quantity and counts units", () => {
    const summary = summarizeBuild([
      { categoryKey: "CPU", quantity: 1, price: 449 },
      { categoryKey: "RAM", quantity: 2, price: 109.5 },
    ]);
    expect(summary.componentCount).toBe(3);
    expect(summary.totalPrice).toBe(668);
  });

  it("avoids floating point noise in the total", () => {
    const summary = summarizeBuild([{ categoryKey: "FAN", quantity: 3, price: 0.1 }]);
    expect(summary.totalPrice).toBe(0.3);
  });

  it("drops categories from missingEssentials once present, ignoring zero quantity", () => {
    const summary = summarizeBuild([
      { categoryKey: "CPU", quantity: 1, price: 1 },
      { categoryKey: "CASE", quantity: 0, price: 1 },
      { categoryKey: "GPU", quantity: 1, price: 1 },
    ]);
    expect(summary.missingEssentials).toEqual(["MOTHERBOARD", "RAM", "SSD", "PSU", "CASE"]);
  });

  it("tallies compatibility results by severity", () => {
    const summary = summarizeBuild([], {
      results: [{ severity: "ERROR" }, { severity: "WARNING" }, { severity: "WARNING" }, { severity: "INFO" }],
    });
    expect(summary.issueCounts).toEqual({ ERROR: 1, WARNING: 2, INFO: 1 });
  });
});
