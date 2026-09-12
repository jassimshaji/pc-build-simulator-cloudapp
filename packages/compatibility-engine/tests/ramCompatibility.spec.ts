import { describe, expect, it } from "vitest";
import {
  checkRamTypeMatch,
  checkRamCapacity,
  checkRamModuleCount,
} from "../src/rules/ramCompatibility";
import { build, component } from "./helpers";

const motherboard = (overrides: Record<string, unknown> = {}) =>
  component("MOTHERBOARD", {
    hotFields: { ramType: "DDR5" },
    specifications: { maxRamGb: 128, ramSlots: 4, ...overrides },
  });

describe("checkRamTypeMatch", () => {
  it("returns null with no RAM installed", () => {
    expect(checkRamTypeMatch(build(motherboard()))).toBeNull();
  });

  it("returns null with no motherboard installed", () => {
    const ram = component("RAM", { hotFields: { ramType: "DDR5" } });
    expect(checkRamTypeMatch(build(ram))).toBeNull();
  });

  it("is compatible when RAM type matches the motherboard", () => {
    const ram = component("RAM", { hotFields: { ramType: "DDR5" } });
    const result = checkRamTypeMatch(build(ram, motherboard()));
    expect(result).toMatchObject({ compatible: true, severity: "INFO" });
  });

  it("is an ERROR when RAM type does not match the motherboard", () => {
    const ram = component("RAM", { hotFields: { ramType: "DDR4" } });
    const result = checkRamTypeMatch(build(ram, motherboard()));
    expect(result).toMatchObject({ compatible: false, severity: "ERROR" });
  });
});

describe("checkRamCapacity", () => {
  it("returns null with no RAM installed", () => {
    expect(checkRamCapacity(build(motherboard()))).toBeNull();
  });

  it("is compatible when total capacity is within the motherboard max", () => {
    const ram = component("RAM", { specifications: { memoryCapacityGb: 32 } });
    const result = checkRamCapacity(build(ram, motherboard({ maxRamGb: 128 })));
    expect(result).toMatchObject({ compatible: true, severity: "INFO" });
  });

  it("sums capacity across multiple RAM kits and quantities", () => {
    const kitA = component("RAM", { specifications: { memoryCapacityGb: 32 }, quantity: 2 });
    const result = checkRamCapacity(build(kitA, motherboard({ maxRamGb: 128 })));
    // 32GB * 2 = 64GB, within 128GB
    expect(result).toMatchObject({ compatible: true });
  });

  it("is an ERROR when total capacity exceeds the motherboard max", () => {
    const ram = component("RAM", { specifications: { memoryCapacityGb: 64 }, quantity: 3 });
    const result = checkRamCapacity(build(ram, motherboard({ maxRamGb: 128 })));
    expect(result).toMatchObject({ compatible: false, severity: "ERROR" });
  });
});

describe("checkRamModuleCount", () => {
  it("returns null with no RAM installed", () => {
    expect(checkRamModuleCount(build(motherboard()))).toBeNull();
  });

  it("is compatible when installed modules fit within available slots", () => {
    const ram = component("RAM", { specifications: { numberOfModules: 2 } });
    const result = checkRamModuleCount(build(ram, motherboard({ ramSlots: 4 })));
    expect(result).toMatchObject({ compatible: true, severity: "INFO" });
  });

  it("is an ERROR when installed modules exceed available slots", () => {
    const kit = component("RAM", { specifications: { numberOfModules: 2 }, quantity: 3 });
    const result = checkRamModuleCount(build(kit, motherboard({ ramSlots: 4 })));
    // 2 modules * 3 kits = 6 modules, exceeds 4 slots
    expect(result).toMatchObject({ compatible: false, severity: "ERROR" });
  });
});
