import { describe, expect, it } from "vitest";
import { runCompatibilityCheck } from "../src/engine";
import { build, component } from "./helpers";

describe("runCompatibilityCheck", () => {
  it("returns an OK report with no results for an empty build", () => {
    const report = runCompatibilityCheck(build());

    expect(report.overallStatus).toBe("OK");
    expect(report.results).toEqual([]);
    expect(report.estimatedPowerWatts).toBe(0);
    expect(report.recommendedPsuWattage).toBe(0);
  });

  it("returns OK with no results when only one category is present (no rule pair applies)", () => {
    const cpu = component("CPU", { hotFields: { socket: "AM5", tdpWatts: 105 } });
    const report = runCompatibilityCheck(build(cpu));

    expect(report.overallStatus).toBe("OK");
    expect(report.results).toEqual([]);
  });

  it("aggregates to OK when every applicable rule is compatible", () => {
    const cpu = component("CPU", { hotFields: { socket: "AM5" } });
    const motherboard = component("MOTHERBOARD", {
      hotFields: { socket: "AM5", formFactor: "ATX", ramType: "DDR5" },
      specifications: { maxRamGb: 128, ramSlots: 4, pcieSlots: 3 },
    });
    const ram = component("RAM", {
      hotFields: { ramType: "DDR5" },
      specifications: { memoryCapacityGb: 32, numberOfModules: 2 },
    });

    const report = runCompatibilityCheck(build(cpu, motherboard, ram));

    expect(report.overallStatus).toBe("OK");
    expect(report.results.length).toBeGreaterThan(0);
    expect(report.results.every((result) => result.compatible)).toBe(true);
  });

  it("aggregates to ERROR when any applicable rule is an incompatible ERROR", () => {
    const cpu = component("CPU", { hotFields: { socket: "AM5" } });
    const motherboard = component("MOTHERBOARD", {
      hotFields: { socket: "LGA1700" }, // mismatched socket
    });

    const report = runCompatibilityCheck(build(cpu, motherboard));

    expect(report.overallStatus).toBe("ERROR");
    expect(report.results.some((result) => result.ruleKey === "cpuSocket" && !result.compatible)).toBe(
      true,
    );
  });

  it("aggregates to WARNING when the worst applicable rule is an incompatible WARNING", () => {
    const gpu = component("GPU", { specifications: { slotWidth: 4 } });
    const motherboard = component("MOTHERBOARD", { specifications: { pcieSlots: 3 } });

    const report = runCompatibilityCheck(build(gpu, motherboard));

    expect(report.overallStatus).toBe("WARNING");
  });

  it("wires real power estimation into the report (Milestone 3)", () => {
    const cpu = component("CPU", { hotFields: { tdpWatts: 100 } });
    const gpu = component("GPU", { hotFields: { powerDrawWatts: 200 } });

    const report = runCompatibilityCheck(build(cpu, gpu));

    expect(report.estimatedPowerWatts).toBe(300);
    expect(report.recommendedPsuWattage).toBe(Math.ceil(300 * 1.25));
  });
});
