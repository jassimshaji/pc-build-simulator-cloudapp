import { describe, expect, it } from "vitest";
import {
  checkAirCoolerSocketSupport,
  checkAirCoolerClearance,
  checkAioCoolerSocketSupport,
  checkAioRadiatorMountSupport,
} from "../src/rules/coolingCompatibility";
import { build, component } from "./helpers";

describe("checkAirCoolerSocketSupport", () => {
  it("returns null when the CPU is missing", () => {
    const cooler = component("AIR_COOLER", {
      specifications: { socketCompatibility: ["AM5"] },
    });
    expect(checkAirCoolerSocketSupport(build(cooler))).toBeNull();
  });

  it("returns null when no air cooler is installed", () => {
    const cpu = component("CPU", { hotFields: { socket: "AM5" } });
    expect(checkAirCoolerSocketSupport(build(cpu))).toBeNull();
  });

  it("is compatible when the cooler supports the CPU socket", () => {
    const cpu = component("CPU", { hotFields: { socket: "AM5" } });
    const cooler = component("AIR_COOLER", {
      specifications: { socketCompatibility: ["AM5", "AM4"] },
    });
    const result = checkAirCoolerSocketSupport(build(cpu, cooler));
    expect(result).toMatchObject({ compatible: true, severity: "INFO" });
  });

  it("is an ERROR when the cooler does not support the CPU socket", () => {
    const cpu = component("CPU", { hotFields: { socket: "LGA1700" } });
    const cooler = component("AIR_COOLER", {
      specifications: { socketCompatibility: ["AM5", "AM4"] },
    });
    const result = checkAirCoolerSocketSupport(build(cpu, cooler));
    expect(result).toMatchObject({ compatible: false, severity: "ERROR" });
  });
});

describe("checkAirCoolerClearance", () => {
  it("returns null when the case is missing", () => {
    const cooler = component("AIR_COOLER", { hotFields: { heightMm: 160 } });
    expect(checkAirCoolerClearance(build(cooler))).toBeNull();
  });

  it("is compatible when cooler height fits within the case clearance", () => {
    const cooler = component("AIR_COOLER", { hotFields: { heightMm: 160 } });
    const pcCase = component("CASE", { specifications: { maxCpuCoolerHeightMm: 165 } });
    const result = checkAirCoolerClearance(build(cooler, pcCase));
    expect(result).toMatchObject({ compatible: true, severity: "INFO" });
  });

  it("is an ERROR when cooler height exceeds the case clearance", () => {
    const cooler = component("AIR_COOLER", { hotFields: { heightMm: 170 } });
    const pcCase = component("CASE", { specifications: { maxCpuCoolerHeightMm: 165 } });
    const result = checkAirCoolerClearance(build(cooler, pcCase));
    expect(result).toMatchObject({ compatible: false, severity: "ERROR" });
  });
});

describe("checkAioCoolerSocketSupport", () => {
  it("is compatible when the AIO supports the CPU socket", () => {
    const cpu = component("CPU", { hotFields: { socket: "AM5" } });
    const cooler = component("AIO_COOLER", {
      specifications: { socketCompatibility: ["AM5"] },
    });
    const result = checkAioCoolerSocketSupport(build(cpu, cooler));
    expect(result).toMatchObject({ compatible: true, severity: "INFO" });
  });

  it("is an ERROR when the AIO does not support the CPU socket", () => {
    const cpu = component("CPU", { hotFields: { socket: "LGA1700" } });
    const cooler = component("AIO_COOLER", {
      specifications: { socketCompatibility: ["AM5"] },
    });
    const result = checkAioCoolerSocketSupport(build(cpu, cooler));
    expect(result).toMatchObject({ compatible: false, severity: "ERROR" });
  });
});

describe("checkAioRadiatorMountSupport", () => {
  it("returns null when the case is missing", () => {
    const cooler = component("AIO_COOLER", { specifications: { radiatorSizeMm: 240 } });
    expect(checkAioRadiatorMountSupport(build(cooler))).toBeNull();
  });

  it("is compatible when the case's radiator support list mentions the size", () => {
    const cooler = component("AIO_COOLER", { specifications: { radiatorSizeMm: 240 } });
    const pcCase = component("CASE", {
      specifications: { radiatorSupport: ["240mm front", "280mm front"] },
    });
    const result = checkAioRadiatorMountSupport(build(cooler, pcCase));
    expect(result).toMatchObject({ compatible: true, severity: "INFO" });
  });

  it("is a WARNING when no listed radiator mount mentions the size", () => {
    const cooler = component("AIO_COOLER", { specifications: { radiatorSizeMm: 360 } });
    const pcCase = component("CASE", {
      specifications: { radiatorSupport: ["240mm front"] },
    });
    const result = checkAioRadiatorMountSupport(build(cooler, pcCase));
    expect(result).toMatchObject({ compatible: false, severity: "WARNING" });
  });
});
