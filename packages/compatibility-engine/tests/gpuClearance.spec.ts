import { describe, expect, it } from "vitest";
import { checkGpuLengthClearance, checkGpuSlotWidth } from "../src/rules/gpuClearance";
import { build, component } from "./helpers";

describe("checkGpuLengthClearance", () => {
  it("returns null when the GPU is missing", () => {
    const pcCase = component("CASE", { specifications: { maxGpuLengthMm: 380 } });
    expect(checkGpuLengthClearance(build(pcCase))).toBeNull();
  });

  it("returns null when the case is missing", () => {
    const gpu = component("GPU", { hotFields: { lengthMm: 300 } });
    expect(checkGpuLengthClearance(build(gpu))).toBeNull();
  });

  it("is compatible when the GPU fits within the case's clearance", () => {
    const gpu = component("GPU", { hotFields: { lengthMm: 300 } });
    const pcCase = component("CASE", { specifications: { maxGpuLengthMm: 380 } });
    const result = checkGpuLengthClearance(build(gpu, pcCase));
    expect(result).toMatchObject({ compatible: true, severity: "INFO" });
  });

  it("is an ERROR when the GPU exceeds the case's clearance", () => {
    const gpu = component("GPU", { hotFields: { lengthMm: 400 } });
    const pcCase = component("CASE", { specifications: { maxGpuLengthMm: 380 } });
    const result = checkGpuLengthClearance(build(gpu, pcCase));
    expect(result).toMatchObject({
      compatible: false,
      severity: "ERROR",
      affectedComponents: ["GPU", "CASE"],
    });
  });
});

describe("checkGpuSlotWidth", () => {
  it("returns null when the motherboard is missing", () => {
    const gpu = component("GPU", { specifications: { slotWidth: 2 } });
    expect(checkGpuSlotWidth(build(gpu))).toBeNull();
  });

  it("is compatible when slot width fits within available PCIe slots", () => {
    const gpu = component("GPU", { specifications: { slotWidth: 2 } });
    const motherboard = component("MOTHERBOARD", { specifications: { pcieSlots: 3 } });
    const result = checkGpuSlotWidth(build(gpu, motherboard));
    expect(result).toMatchObject({ compatible: true, severity: "INFO" });
  });

  it("is a WARNING when slot width exceeds available PCIe slots", () => {
    const gpu = component("GPU", { specifications: { slotWidth: 4 } });
    const motherboard = component("MOTHERBOARD", { specifications: { pcieSlots: 3 } });
    const result = checkGpuSlotWidth(build(gpu, motherboard));
    expect(result).toMatchObject({ compatible: false, severity: "WARNING" });
  });
});
