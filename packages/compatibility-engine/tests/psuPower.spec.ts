import { describe, expect, it } from "vitest";
import { checkPsuWattage, checkPsuConnectors } from "../src/rules/psuPower";
import { build, component } from "./helpers";

describe("checkPsuWattage", () => {
  it("returns null when there is no PSU", () => {
    const cpu = component("CPU", { hotFields: { tdpWatts: 100 } });
    expect(checkPsuWattage(build(cpu))).toBeNull();
  });

  it("returns null when there is a PSU but no CPU/GPU to estimate power from", () => {
    const psu = component("PSU", { hotFields: { wattage: 650 } });
    expect(checkPsuWattage(build(psu))).toBeNull();
  });

  it("is compatible when the PSU wattage covers the recommended load", () => {
    const cpu = component("CPU", { hotFields: { tdpWatts: 100 } });
    const psu = component("PSU", { hotFields: { wattage: 650 } });
    // 100W * 1.25 = 125W recommended, well under 650W
    const result = checkPsuWattage(build(cpu, psu));
    expect(result).toMatchObject({ compatible: true, severity: "INFO" });
  });

  it("is an ERROR when the PSU wattage is below the recommended load", () => {
    const cpu = component("CPU", { hotFields: { tdpWatts: 200 } });
    const gpu = component("GPU", { hotFields: { powerDrawWatts: 350 } });
    const psu = component("PSU", { hotFields: { wattage: 450 } });
    // (200 + 350) * 1.25 = 687.5W recommended, exceeds 450W
    const result = checkPsuWattage(build(cpu, gpu, psu));
    expect(result).toMatchObject({
      compatible: false,
      severity: "ERROR",
      affectedComponents: ["PSU", "CPU", "GPU"],
    });
  });
});

describe("checkPsuConnectors", () => {
  it("returns null when there is no PSU", () => {
    const motherboard = component("MOTHERBOARD");
    expect(checkPsuConnectors(build(motherboard))).toBeNull();
  });

  it("returns null when neither a motherboard nor a GPU is installed", () => {
    const psu = component("PSU", { specifications: { cpuPowerConnectors: 1, pciePowerConnectors: 2 } });
    expect(checkPsuConnectors(build(psu))).toBeNull();
  });

  it("is compatible when the PSU has enough CPU and PCIe connectors", () => {
    const motherboard = component("MOTHERBOARD");
    const gpu = component("GPU");
    const psu = component("PSU", { specifications: { cpuPowerConnectors: 1, pciePowerConnectors: 2 } });
    const result = checkPsuConnectors(build(motherboard, gpu, psu));
    expect(result).toMatchObject({ compatible: true, severity: "INFO" });
  });

  it("is a WARNING when the PSU has no CPU power connector for the motherboard", () => {
    const motherboard = component("MOTHERBOARD");
    const psu = component("PSU", { specifications: { cpuPowerConnectors: 0, pciePowerConnectors: 2 } });
    const result = checkPsuConnectors(build(motherboard, psu));
    expect(result).toMatchObject({ compatible: false, severity: "WARNING" });
  });

  it("is a WARNING when there are more GPUs than PCIe power connectors", () => {
    const gpuA = component("GPU");
    const gpuB = component("GPU");
    const psu = component("PSU", { specifications: { cpuPowerConnectors: 1, pciePowerConnectors: 1 } });
    const result = checkPsuConnectors(build(gpuA, gpuB, psu));
    expect(result).toMatchObject({ compatible: false, severity: "WARNING" });
  });
});
